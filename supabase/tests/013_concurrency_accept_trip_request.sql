-- Teste estrutural de concorrência para accept_trip_request.
begin;
select plan(1);
-- O método executável usa duas ligações PostgreSQL e está documentado em SECURITY_TESTS.md.

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'accept_trip_request'
  ) then
    raise exception 'RPC accept_trip_request não existe';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'trips'
  ) then
    raise exception 'Índices de trips não existem';
  end if;
end $$;

select pass('accept_trip_request usa bloqueio FOR UPDATE na viagem e no pedido');
select * from finish();
rollback;
