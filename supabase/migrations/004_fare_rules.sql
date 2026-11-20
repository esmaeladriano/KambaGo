-- KambaGo - Migration 004: Tabela fare_rules e políticas RLS de rotas/tarifas na base de dados
-- Retira tarifas, janelas de cancelamento e parâmetros de corredor do código cliente.

create table if not exists public.fare_rules (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null unique references public.routes(id) on delete cascade,
  min_fare_kz integer not null check (min_fare_kz > 0),
  max_fare_kz integer not null check (max_fare_kz >= min_fare_kz),
  free_cancel_minutes_after_booking integer not null default 5 check (free_cancel_minutes_after_booking >= 0),
  free_cancel_minutes_before_pickup integer not null default 15 check (free_cancel_minutes_before_pickup >= 0),
  late_cancel_fee_kz integer not null default 200 check (late_cancel_fee_kz >= 0),
  driver_cancel_passenger_fee_kz integer not null default 0 check (driver_cancel_passenger_fee_kz >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_fare_rules_updated_at on public.fare_rules;
create trigger trg_fare_rules_updated_at
before update on public.fare_rules
for each row execute function public.set_updated_at();

-- Auditoria automática de alterações em fare_rules
create or replace function public.log_fare_rules_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_id text;
begin
  v_entity_id := coalesce(new.id, old.id)::text;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'fare_rule_' || lower(tg_op),
    'fare_rules',
    v_entity_id,
    case
      when tg_op = 'DELETE' then to_jsonb(old)
      else to_jsonb(new)
    end
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_fare_rules_audit on public.fare_rules;
create trigger trg_fare_rules_audit
after insert or update or delete on public.fare_rules
for each row execute function public.log_fare_rules_changes();

alter table public.fare_rules enable row level security;

-- Políticas de fare_rules: leitura por utilizadores autenticados (regras ativas ou admin); escrita apenas admin
drop policy if exists "fare_rules_select_active" on public.fare_rules;
create policy "fare_rules_select_active"
on public.fare_rules for select
to authenticated
using (is_active = true or public.is_admin());

drop policy if exists "fare_rules_insert_admin" on public.fare_rules;
create policy "fare_rules_insert_admin"
on public.fare_rules for insert
to authenticated
with check (public.is_admin());

drop policy if exists "fare_rules_update_admin" on public.fare_rules;
create policy "fare_rules_update_admin"
on public.fare_rules for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "fare_rules_delete_admin" on public.fare_rules;
create policy "fare_rules_delete_admin"
on public.fare_rules for delete
to authenticated
using (public.is_admin());

-- Endurecer políticas de routes para leitura autenticada e escrita exclusiva de administradores
drop policy if exists "routes_select_active" on public.routes;
create policy "routes_select_active"
on public.routes for select
to authenticated
using (is_active = true or public.is_admin());

drop policy if exists "routes_insert_admin" on public.routes;
create policy "routes_insert_admin"
on public.routes for insert
to authenticated
with check (public.is_admin());

drop policy if exists "routes_update_admin" on public.routes;
create policy "routes_update_admin"
on public.routes for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "routes_delete_admin" on public.routes;
create policy "routes_delete_admin"
on public.routes for delete
to authenticated
using (public.is_admin());
