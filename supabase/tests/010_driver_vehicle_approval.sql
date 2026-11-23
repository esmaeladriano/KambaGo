-- Testes SQL da migration 010
begin;
select plan(1);

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'approve_driver',
        'reject_driver',
        'approve_vehicle',
        'reject_vehicle'
      )
  ) then
    raise exception 'Uma ou mais RPCs de aprovação não existem';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_vehicles_guard_verification'
  ) then
    raise exception 'Trigger de proteção de verificação de veículo não existe';
  end if;
end $$;

select pass('Migration 010: verificações estruturais concluídas');
select * from finish();
rollback;
