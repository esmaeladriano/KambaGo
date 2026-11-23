-- Testes SQL da migration 009
begin;
select plan(1);

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_delete_own'
  ) then
    raise exception 'Política profiles_delete_own ainda existe';
  end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'profiles'
      and grantee = 'authenticated'
      and privilege_type = 'DELETE'
  ) then
    raise exception 'authenticated ainda pode eliminar perfis diretamente';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_account_status_admin'
  ) then
    raise exception 'RPC set_account_status_admin não existe';
  end if;

  if exists (
    select 1
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'bootstrap_first_admin'
      and grantee in ('public', 'anon', 'authenticated')
  ) then
    raise exception 'bootstrap_first_admin está acessível pela API pública';
  end if;
end $$;

select pass('Migration 009: verificações estruturais concluídas');
select * from finish();
rollback;
