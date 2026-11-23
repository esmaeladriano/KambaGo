-- KambaGo - Migration 011: ciclo seguro de viagens
-- Não altera as migrations 001 a 010.

alter table public.trips
  alter column origin_lat drop not null,
  alter column origin_lng drop not null,
  alter column destination_lat drop not null,
  alter column destination_lng drop not null;

create table if not exists public.cancellation_records (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  cancelled_by uuid not null references public.profiles(id),
  reason text not null,
  fee_kz integer not null default 0 check (fee_kz >= 0),
  created_at timestamptz not null default now()
);

alter table public.cancellation_records enable row level security;

drop policy if exists "cancellation_records_select" on public.cancellation_records;
create policy "cancellation_records_select"
on public.cancellation_records for select
to authenticated
using (
  cancelled_by = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.trips t
    where t.id = cancellation_records.trip_id
      and t.driver_id = auth.uid()
  )
);

revoke insert, update, delete on public.trips from authenticated, anon;
revoke insert, update, delete on public.cancellation_records from authenticated, anon;

drop function if exists public.create_trip(text, text, integer, integer);
create or replace function public.create_trip(
  origin text,
  destination text,
  total_fare_kz integer,
  seats integer
)
returns public.trips
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_vehicle public.vehicles;
  v_rule public.fare_rules;
  v_trip public.trips;
begin
  if v_uid is null then raise exception 'Autenticação obrigatória.'; end if;
  if nullif(trim(coalesce(origin, '')), '') is null then raise exception 'Origem obrigatória.'; end if;
  if nullif(trim(coalesce(destination, '')), '') is null then raise exception 'Destino obrigatório.'; end if;

  select * into v_profile
  from public.profiles
  where id = v_uid
  for update;

  if not found or v_profile.role <> 'driver' or v_profile.account_status <> 'ativa' then
    raise exception 'Apenas motoristas ativos podem criar viagens.';
  end if;

  select * into v_vehicle
  from public.vehicles
  where driver_id = v_uid and is_verified = true
  order by created_at desc
  limit 1
  for update;

  if not found then raise exception 'É necessário um veículo aprovado.'; end if;
  if seats not between 1 and v_vehicle.legal_capacity then
    raise exception 'Lugares excedem a capacidade do veículo.';
  end if;

  select fr.*
    into v_rule
  from public.routes r
  join public.fare_rules fr on fr.route_id = r.id
  where r.is_active = true
    and fr.is_active = true
    and lower(r.origin_name) = lower(trim(origin))
    and lower(r.destination_name) = lower(trim(destination))
  order by fr.created_at desc
  limit 1;

  if not found then raise exception 'Corridor ou tarifa configurada não encontrada.'; end if;
  if total_fare_kz not between v_rule.min_fare_kz and v_rule.max_fare_kz then
    raise exception 'Preço fora dos limites da tarifa.';
  end if;

  insert into public.trips (
    driver_id, vehicle_id, status,
    origin_name, destination_name,
    total_estimated_kz, available_seats
  ) values (
    v_uid, v_vehicle.id, 'solicitada',
    trim(origin), trim(destination),
    total_fare_kz, seats
  )
  returning * into v_trip;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_uid,
    'trip_created',
    'trips',
    v_trip.id::text,
    jsonb_build_object('origin', trim(origin), 'destination', trim(destination), 'fare', total_fare_kz)
  );

  return v_trip;
end;
$$;

revoke all on function public.create_trip(text, text, integer, integer) from public, anon;
grant execute on function public.create_trip(text, text, integer, integer) to authenticated;

drop function if exists public.start_trip(uuid);
create or replace function public.start_trip(p_trip_id uuid)
returns public.trips
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_trip public.trips;
begin
  if v_uid is null then raise exception 'Autenticação obrigatória.'; end if;
  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found or v_trip.driver_id <> v_uid then
    raise exception 'Apenas o motorista proprietário pode iniciar a viagem.';
  end if;
  if v_trip.status not in ('aceite', 'a_caminho') then
    raise exception 'Transição inválida: a viagem deve estar aceite ou a caminho.';
  end if;
  update public.trips set status = 'em_andamento', updated_at = now()
  where id = p_trip_id returning * into v_trip;
  return v_trip;
end;
$$;

revoke all on function public.start_trip(uuid) from public, anon;
grant execute on function public.start_trip(uuid) to authenticated;

drop function if exists public.complete_trip(uuid);
create or replace function public.complete_trip(p_trip_id uuid)
returns public.trips
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_trip public.trips;
  v_confirmed_seats integer;
  v_amount integer;
  v_passenger record;
begin
  if v_uid is null then raise exception 'Autenticação obrigatória.'; end if;
  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found or v_trip.driver_id <> v_uid then
    raise exception 'Apenas o motorista proprietário pode concluir a viagem.';
  end if;
  if v_trip.status <> 'em_andamento' then
    raise exception 'Transição inválida: a viagem deve estar em andamento.';
  end if;

  select coalesce(sum(seats), 0) into v_confirmed_seats
  from public.trip_passengers
  where trip_id = p_trip_id;

  if v_confirmed_seats <= 0 then raise exception 'Não existem passageiros confirmados.'; end if;
  v_amount := round(v_trip.total_estimated_kz::numeric / v_confirmed_seats);

  for v_passenger in
    select * from public.trip_passengers where trip_id = p_trip_id
  loop
    insert into public.payments (
      trip_id, passenger_id, amount_kz, method, status
    ) values (
      p_trip_id, v_passenger.passenger_id, v_amount, 'dinheiro', 'pendente'
    );
  end loop;

  update public.trips set status = 'concluida', updated_at = now()
  where id = p_trip_id returning * into v_trip;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_uid,
    'trip_completed',
    'trips',
    p_trip_id::text,
    jsonb_build_object('confirmed_seats', v_confirmed_seats, 'amount_per_seat', v_amount)
  );

  return v_trip;
end;
$$;

revoke all on function public.complete_trip(uuid) from public, anon;
grant execute on function public.complete_trip(uuid) to authenticated;

drop function if exists public.cancel_trip(uuid, text);
create or replace function public.cancel_trip(p_trip_id uuid, p_reason text)
returns public.trips
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_trip public.trips;
  v_rule public.fare_rules;
  v_fee integer := 0;
  v_passenger record;
begin
  if v_uid is null then raise exception 'Autenticação obrigatória.'; end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'Motivo obrigatório.'; end if;

  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found then raise exception 'Viagem não encontrada.'; end if;
  if v_trip.driver_id <> v_uid and not public.is_admin() then
    raise exception 'Apenas o motorista proprietário ou um administrador podem cancelar.';
  end if;
  if v_trip.status in ('concluida', 'cancelada') then
    raise exception 'A viagem já não pode ser cancelada.';
  end if;

  select fr.* into v_rule
  from public.routes r
  join public.fare_rules fr on fr.route_id = r.id
  where r.is_active = true
    and fr.is_active = true
    and lower(r.origin_name) = lower(v_trip.origin_name)
    and lower(r.destination_name) = lower(v_trip.destination_name)
  limit 1;

  if found then
    v_fee := case
      when v_trip.status in ('solicitada', 'aceite') then v_rule.driver_cancel_passenger_fee_kz
      else v_rule.late_cancel_fee_kz
    end;
  end if;

  update public.trips set status = 'cancelada', updated_at = now()
  where id = p_trip_id returning * into v_trip;

  insert into public.cancellation_records (trip_id, cancelled_by, reason, fee_kz)
  values (p_trip_id, v_uid, trim(p_reason), v_fee);

  for v_passenger in
    select passenger_id from public.trip_passengers where trip_id = p_trip_id
  loop
    insert into public.notifications (user_id, title, body, type)
    values (
      v_passenger.passenger_id,
      'Viagem cancelada',
      trim(p_reason),
      'trip_cancelled'
    );
  end loop;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_uid,
    'trip_cancelled',
    'trips',
    p_trip_id::text,
    jsonb_build_object('reason', trim(p_reason), 'fee_kz', v_fee)
  );

  return v_trip;
end;
$$;

revoke all on function public.cancel_trip(uuid, text) from public, anon;
grant execute on function public.cancel_trip(uuid, text) to authenticated;
