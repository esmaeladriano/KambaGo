-- KambaGo - Migration 010: aprovação administrativa de motoristas e veículos
-- Não altera as migrations 001 a 009.

alter table public.profiles
  add column if not exists driver_rejection_reason text,
  add column if not exists driver_reviewed_at timestamptz,
  add column if not exists driver_reviewed_by uuid;

alter table public.vehicles
  add column if not exists rejection_reason text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid;

drop function if exists public.approve_driver(uuid);
create or replace function public.approve_driver(p_driver_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Apenas administradores podem aprovar motoristas.';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_driver_id and role = 'driver'
  for update;

  if not found then
    raise exception 'Motorista não encontrado.';
  end if;

  update public.profiles
     set account_status = 'ativa',
         is_available = false,
         driver_rejection_reason = null,
         driver_reviewed_at = now(),
         driver_reviewed_by = auth.uid()
   where id = p_driver_id
  returning * into v_profile;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'driver_approved', 'profiles', p_driver_id::text, '{}'::jsonb);

  return v_profile;
end;
$$;

revoke all on function public.approve_driver(uuid) from public, anon;
grant execute on function public.approve_driver(uuid) to authenticated;

drop function if exists public.reject_driver(uuid, text);
create or replace function public.reject_driver(p_driver_id uuid, p_reason text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Apenas administradores podem rejeitar motoristas.';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Motivo da rejeição obrigatório.';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_driver_id and role = 'driver'
  for update;

  if not found then
    raise exception 'Motorista não encontrado.';
  end if;

  update public.profiles
     set account_status = 'pendente',
         is_available = false,
         driver_rejection_reason = trim(p_reason),
         driver_reviewed_at = now(),
         driver_reviewed_by = auth.uid()
   where id = p_driver_id
  returning * into v_profile;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'driver_rejected',
    'profiles',
    p_driver_id::text,
    jsonb_build_object('reason', trim(p_reason))
  );

  return v_profile;
end;
$$;

revoke all on function public.reject_driver(uuid, text) from public, anon;
grant execute on function public.reject_driver(uuid, text) to authenticated;

drop function if exists public.approve_vehicle(uuid);
create or replace function public.approve_vehicle(p_vehicle_id uuid)
returns public.vehicles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vehicle public.vehicles;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Apenas administradores podem aprovar veículos.';
  end if;

  select * into v_vehicle
  from public.vehicles
  where id = p_vehicle_id
  for update;

  if not found then
    raise exception 'Veículo não encontrado.';
  end if;

  update public.vehicles
     set is_verified = true,
         rejection_reason = null,
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_vehicle_id
  returning * into v_vehicle;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'vehicle_approved', 'vehicles', p_vehicle_id::text, '{}'::jsonb);

  return v_vehicle;
end;
$$;

revoke all on function public.approve_vehicle(uuid) from public, anon;
grant execute on function public.approve_vehicle(uuid) to authenticated;

drop function if exists public.reject_vehicle(uuid, text);
create or replace function public.reject_vehicle(p_vehicle_id uuid, p_reason text)
returns public.vehicles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vehicle public.vehicles;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Apenas administradores podem rejeitar veículos.';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Motivo da rejeição obrigatório.';
  end if;

  select * into v_vehicle
  from public.vehicles
  where id = p_vehicle_id
  for update;

  if not found then
    raise exception 'Veículo não encontrado.';
  end if;

  update public.vehicles
     set is_verified = false,
         rejection_reason = trim(p_reason),
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_vehicle_id
  returning * into v_vehicle;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'vehicle_rejected',
    'vehicles',
    p_vehicle_id::text,
    jsonb_build_object('reason', trim(p_reason))
  );

  return v_vehicle;
end;
$$;

revoke all on function public.reject_vehicle(uuid, text) from public, anon;
grant execute on function public.reject_vehicle(uuid, text) to authenticated;
