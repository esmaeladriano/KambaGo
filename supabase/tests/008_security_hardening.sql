-- Testes SQL da migration 008

do $$
begin
  if to_regclass('public.vehicles') is null then
    raise exception 'Tabela vehicles não existe';
  end if;

  if to_regclass('public.trip_requests') is null then
    raise exception 'Tabela trip_requests não existe';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'is_available'
  ) then
    raise exception 'Coluna is_available não existe';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'discover_available_trips'
  ) then
    raise exception 'RPC discover_available_trips não existe';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'request_shared_trip'
  ) then
    raise exception 'RPC request_shared_trip não existe';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'accept_trip_request'
  ) then
    raise exception 'RPC accept_trip_request não existe';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'trip_requests'
      and cmd = 'ALL'
  ) then
    raise exception 'Política FOR ALL ainda permite mutação direta em trip_requests';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'trip_requests'
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'Cliente autenticado ainda tem mutação direta em trip_requests';
  end if;
end $$;

select
  'Migration 008: verificações de segurança concluídas' as resultado;
