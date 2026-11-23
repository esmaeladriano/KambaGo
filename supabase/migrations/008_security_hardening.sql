-- KambaGo - Migration 008: reforço de segurança da mobilidade partilhada
-- Correções novas; não altera as migrations 001 a 007.

alter table public.profiles
  add column if not exists is_available boolean not null default false;

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Não é permitido alterar o papel da conta diretamente.';
    end if;
    if new.account_status is distinct from old.account_status then
      raise exception 'Não é permitido alterar o estado da conta diretamente.';
    end if;
    if new.email_verified is distinct from old.email_verified then
      raise exception 'A verificação de e-mail só pode ser alterada pelo servidor.';
    end if;
    if new.phone_verified is distinct from old.phone_verified then
      raise exception 'A verificação de telefone só pode ser alterada pelo servidor.';
    end if;
  end if;

  if current_user in ('authenticated', 'anon')
     and new.is_available is distinct from old.is_available
     and not exists (
       select 1
       from public.profiles p
       where p.id = auth.uid()
         and p.role = 'driver'
         and p.account_status = 'ativa'
     )
  then
    raise exception 'Somente motoristas ativos podem alterar disponibilidade.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_fields on public.profiles;
create trigger trg_profiles_guard_fields
before update on public.profiles
for each row execute function public.prevent_profile_privilege_escalation();

-- Descoberta controlada: não expõe coordenadas privadas nem dados internos.
drop function if exists public.discover_available_trips();
create or replace function public.discover_available_trips()
returns table (
  trip_id uuid,
  origin_name text,
  destination_name text,
  available_seats integer,
  estimated_fare_kz integer,
  status public.trip_status
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.origin_name,
    t.destination_name,
    t.available_seats,
    t.total_estimated_kz,
    t.status
  from public.trips t
  where auth.uid() is not null
    and t.status = 'solicitada'
    and t.available_seats > 0
  order by t.created_at desc;
$$;

revoke all on function public.discover_available_trips() from public, anon;
grant execute on function public.discover_available_trips() to authenticated;

-- Viagens não podem ser descobertas por consulta direta da tabela pelo cliente.
drop policy if exists "trips_select_discovery" on public.trips;
drop policy if exists "trips_select_active" on public.trips;

create policy "trips_select_private"
on public.trips for select
to authenticated
using (
  driver_id = auth.uid()
  or exists (
    select 1
    from public.trip_passengers tp
    where tp.trip_id = trips.id
      and tp.passenger_id = auth.uid()
  )
  or public.is_admin()
);

-- Pedidos: SELECT próprio; nenhuma mutação direta pelo cliente.
drop policy if exists "trip_requests_own" on public.trip_requests;
create policy "trip_requests_select_own"
on public.trip_requests for select
to authenticated
using (
  passenger_id = auth.uid()
  or exists (
    select 1
    from public.trips t
    where t.id = trip_requests.trip_id
      and t.driver_id = auth.uid()
  )
  or public.is_admin()
);

revoke insert, update, delete on public.trip_requests from authenticated, anon;
grant select on public.trip_requests to authenticated;

drop function if exists public.request_shared_trip(uuid, text, integer);
create or replace function public.request_shared_trip(
  p_trip_id uuid,
  p_destination_name text,
  p_seats_requested integer default 1
)
returns public.trip_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_trip public.trips;
  v_request public.trip_requests;
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  if p_seats_requested not between 1 and 20 then
    raise exception 'Número de lugares inválido.';
  end if;

  select *
    into v_profile
  from public.profiles
  where id = v_uid
  for update;

  if not found or v_profile.account_status <> 'ativa' or v_profile.role <> 'passenger' then
    raise exception 'Apenas passageiros ativos podem solicitar viagens.';
  end if;

  select *
    into v_trip
  from public.trips
  where id = p_trip_id
  for update;

  if not found or v_trip.status <> 'solicitada' then
    raise exception 'A viagem já não está disponível.';
  end if;

  if v_trip.available_seats < p_seats_requested then
    raise exception 'Não existem lugares suficientes.';
  end if;

  if nullif(trim(coalesce(p_destination_name, '')), '') is null then
    raise exception 'Destino obrigatório.';
  end if;

  if exists (
    select 1
    from public.trip_requests
    where trip_id = p_trip_id
      and passenger_id = v_uid
      and status in ('pendente', 'aceite')
  ) then
    raise exception 'Já existe um pedido ativo para esta viagem.';
  end if;

  insert into public.trip_requests (
    trip_id,
    passenger_id,
    status,
    seats_requested,
    destination_name,
    estimated_fare_kz
  ) values (
    p_trip_id,
    v_uid,
    'pendente',
    p_seats_requested,
    trim(p_destination_name),
    greatest(0, round(v_trip.total_estimated_kz::numeric / nullif(p_seats_requested, 0)))
  )
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.request_shared_trip(uuid, text, integer) from public, anon;
grant execute on function public.request_shared_trip(uuid, text, integer) to authenticated;

drop function if exists public.accept_trip_request(uuid);
create or replace function public.accept_trip_request(p_request_id uuid)
returns public.trip_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.trip_requests;
  v_trip public.trips;
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  select *
    into v_request
  from public.trip_requests
  where id = p_request_id
  for update;

  if not found or v_request.status <> 'pendente' then
    raise exception 'Pedido inexistente ou já processado.';
  end if;

  select *
    into v_trip
  from public.trips
  where id = v_request.trip_id
  for update;

  if not found or v_trip.driver_id <> v_uid then
    raise exception 'Apenas o motorista proprietário pode aceitar este pedido.';
  end if;

  if v_trip.status <> 'solicitada' or v_trip.available_seats < v_request.seats_requested then
    raise exception 'Viagem indisponível ou sem lugares suficientes.';
  end if;

  update public.trip_requests
     set status = 'aceite'
   where id = p_request_id
  returning * into v_request;

  insert into public.trip_passengers (
    trip_id,
    passenger_id,
    seats,
    individual_fare_kz
  ) values (
    v_request.trip_id,
    v_request.passenger_id,
    v_request.seats_requested,
    coalesce(v_request.estimated_fare_kz, 0)
  )
  on conflict (trip_id, passenger_id) do update
     set seats = public.trip_passengers.seats + excluded.seats,
         individual_fare_kz = excluded.individual_fare_kz;

  update public.trips
     set available_seats = available_seats - v_request.seats_requested
   where id = v_request.trip_id;

  insert into public.notifications (
    user_id,
    title,
    body,
    type
  ) values (
    v_request.passenger_id,
    'Solicitação aceite',
    'O motorista aceitou a tua solicitação.',
    'trip_request_accepted'
  );

  return v_request;
end;
$$;

revoke all on function public.accept_trip_request(uuid) from public, anon;
grant execute on function public.accept_trip_request(uuid) to authenticated;

drop function if exists public.reject_trip_request(uuid);
create or replace function public.reject_trip_request(p_request_id uuid)
returns public.trip_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.trip_requests;
  v_trip public.trips;
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  select *
    into v_request
  from public.trip_requests
  where id = p_request_id
  for update;

  if not found or v_request.status <> 'pendente' then
    raise exception 'Pedido inexistente ou já processado.';
  end if;

  select *
    into v_trip
  from public.trips
  where id = v_request.trip_id;

  if not found or v_trip.driver_id <> v_uid then
    raise exception 'Apenas o motorista proprietário pode rejeitar este pedido.';
  end if;

  update public.trip_requests
     set status = 'rejeitada'
   where id = p_request_id
  returning * into v_request;

  insert into public.notifications (
    user_id, title, body, type
  ) values (
    v_request.passenger_id,
    'Solicitação rejeitada',
    'O motorista rejeitou a tua solicitação.',
    'trip_request_rejected'
  );

  return v_request;
end;
$$;

revoke all on function public.reject_trip_request(uuid) from public, anon;
grant execute on function public.reject_trip_request(uuid) to authenticated;

drop function if exists public.cancel_my_trip_request(uuid);
create or replace function public.cancel_my_trip_request(p_request_id uuid)
returns public.trip_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.trip_requests;
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  select *
    into v_request
  from public.trip_requests
  where id = p_request_id
  for update;

  if not found or v_request.passenger_id <> v_uid then
    raise exception 'Pedido inexistente ou não pertence ao utilizador.';
  end if;

  if v_request.status <> 'pendente' then
    raise exception 'Pedidos já aceites não podem ser cancelados por este método.';
  end if;

  update public.trip_requests
     set status = 'cancelada'
   where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.cancel_my_trip_request(uuid) from public, anon;
grant execute on function public.cancel_my_trip_request(uuid) to authenticated;

-- Disponibilidade persistida do motorista.
drop function if exists public.set_driver_availability(boolean);
create or replace function public.set_driver_availability(p_available boolean)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  update public.profiles
     set is_available = p_available
   where id = v_uid
     and role = 'driver'
     and account_status = 'ativa'
  returning * into v_profile;

  if not found then
    raise exception 'Motorista ativo não encontrado.';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.set_driver_availability(boolean) from public, anon;
grant execute on function public.set_driver_availability(boolean) to authenticated;

-- Políticas específicas por recurso.
drop policy if exists "vehicles_select" on public.vehicles;
create policy "vehicles_select"
on public.vehicles for select
to authenticated
using (driver_id = auth.uid() or public.is_admin());

drop policy if exists "vehicles_insert" on public.vehicles;
create policy "vehicles_insert"
on public.vehicles for insert
to authenticated
with check (
  driver_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'driver'
      and p.account_status = 'ativa'
  )
);

drop policy if exists "vehicles_update" on public.vehicles;
create policy "vehicles_update"
on public.vehicles for update
to authenticated
using (driver_id = auth.uid() or public.is_admin())
with check (driver_id = auth.uid() or public.is_admin());

drop policy if exists "vehicles_delete" on public.vehicles;
create policy "vehicles_delete"
on public.vehicles for delete
to authenticated
using (driver_id = auth.uid() or public.is_admin());

create or replace function public.prevent_vehicle_verification_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon')
     and new.is_verified is distinct from old.is_verified
     and not public.is_admin()
  then
    raise exception 'Somente administradores podem verificar veículos.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_vehicles_guard_verification on public.vehicles;
create trigger trg_vehicles_guard_verification
before update on public.vehicles
for each row execute function public.prevent_vehicle_verification_escalation();

drop policy if exists "trip_stops_select" on public.trip_stops;
create policy "trip_stops_select"
on public.trip_stops for select
to authenticated
using (
  passenger_id = auth.uid()
  or exists (
    select 1
    from public.trips t
    where t.id = trip_stops.trip_id
      and t.driver_id = auth.uid()
  )
  or public.is_admin()
);

revoke insert, update, delete on public.trip_stops from authenticated, anon;
grant select on public.trip_stops to authenticated;

drop policy if exists "payments_select" on public.payments;
create policy "payments_select"
on public.payments for select
to authenticated
using (
  passenger_id = auth.uid()
  or exists (
    select 1
    from public.trips t
    where t.id = payments.trip_id
      and t.driver_id = auth.uid()
  )
  or public.is_admin()
);

revoke insert, update, delete on public.payments from authenticated, anon;
grant select on public.payments to authenticated;

drop policy if exists "trip_passengers_select" on public.trip_passengers;
create policy "trip_passengers_select"
on public.trip_passengers for select
to authenticated
using (
  passenger_id = auth.uid()
  or exists (
    select 1
    from public.trips t
    where t.id = trip_passengers.trip_id
      and t.driver_id = auth.uid()
  )
  or public.is_admin()
);

revoke insert, update, delete on public.trip_passengers from authenticated, anon;
grant select on public.trip_passengers to authenticated;

drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications for select
to authenticated
using (user_id = auth.uid());

create policy "notifications_update_own"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

revoke insert, delete on public.notifications from authenticated, anon;
grant select, update on public.notifications to authenticated;

drop policy if exists "saved_places_own" on public.saved_places;
create policy "saved_places_own"
on public.saved_places for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
