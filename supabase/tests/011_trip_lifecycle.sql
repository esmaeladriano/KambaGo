-- Testes SQL da migration 011

do $$
begin
  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'trips'
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'authenticated ainda pode alterar trips diretamente';
  end if;

  if (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'create_trip',
        'start_trip',
        'complete_trip',
        'cancel_trip'
      )
  ) <> 4 then
    raise exception 'Uma ou mais RPCs de ciclo de viagem não existem';
  end if;
end $$;

select 'Migration 011: verificações estruturais concluídas' as resultado;
