-- KambaGo - Migration 014: bloqueia operações de mobilidade para contas suspensas
-- Regras afetadas: "Utilizador suspenso não executa operações de mobilidade."
-- start_trip, complete_trip e cancel_trip passam a rejeitar quando o motorista
-- tem account_status = 'suspensa'. Não altera nem substitui as migrations 001 a 013.
-- Reversível: recriar as funções anteriores sem o filtro de account_status.

-- start_trip: apenas motorista não suspenso pode iniciar.
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
  v_profile public.profiles;
begin
  if v_uid is null then raise exception 'Autenticação obrigatória.'; end if;
  select * into v_profile from public.profiles where id = v_uid for update;
  if not found or v_profile.account_status = 'suspensa' then
    raise exception 'Conta suspensa. Não é possível iniciar viagens.';
  end if;
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

-- complete_trip: apenas motorista não suspenso pode concluir.
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
  v_profile public.profiles;
  v_confirmed_seats integer;
  v_amount integer;
  v_passenger record;
begin
  if v_uid is null then raise exception 'Autenticação obrigatória.'; end if;
  select * into v_profile from public.profiles where id = v_uid for update;
  if not found or v_profile.account_status = 'suspensa' then
    raise exception 'Conta suspensa. Não é possível concluir viagens.';
  end if;
  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found or v_trip.driver_id <> v_uid then
    raise exception 'Apenas o motorista proprietário pode concluir a viagem.';
  end if;
  if v_trip.status <> 'em_andamento' then
    raise exception 'Transição inválida: a viagem deve estar em andamento.';
  end if;
  select coalesce(sum(seats), 0) into v_confirmed_seats
  from public.trip_passengers where trip_id = p_trip_id;
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
    v_uid, 'trip_completed', 'trips', p_trip_id::text,
    jsonb_build_object('confirmed_seats', v_confirmed_seats, 'amount_per_seat', v_amount)
  );
  return v_trip;
end;
$$;

revoke all on function public.complete_trip(uuid) from public, anon;
grant execute on function public.complete_trip(uuid) to authenticated;

-- cancel_trip: motorista suspenso não cancela; admin pode.
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
  v_profile public.profiles;
  v_rule public.fare_rules;
  v_fee integer := 0;
  v_passenger record;
  v_is_admin boolean;
begin
  if v_uid is null then raise exception 'Autenticação obrigatória.'; end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Motivo obrigatório.';
  end if;
  select public.is_admin() into v_is_admin;
  if not v_is_admin then
    select * into v_profile from public.profiles where id = v_uid for update;
    if not found or v_profile.account_status = 'suspensa' then
      raise exception 'Conta suspensa. Não é possível cancelar viagens.';
    end if;
  end if;
  select * into v_trip from public.trips where id = p_trip_id for update;
  if not found then raise exception 'Viagem não encontrada.'; end if;
  if v_trip.driver_id <> v_uid and not v_is_admin then
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
    v_uid, 'trip_cancelled', 'trips', p_trip_id::text,
    jsonb_build_object('reason', trim(p_reason), 'fee_kz', v_fee)
  );
  return v_trip;
end;
$$;

revoke all on function public.cancel_trip(uuid, text) from public, anon;
grant execute on function public.cancel_trip(uuid, text) to authenticated;
