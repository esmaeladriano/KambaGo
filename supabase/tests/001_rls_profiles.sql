-- Testes SQL / pgTAP da Etapa 1: RLS em profiles, audit_logs e routes
begin;
select plan(6);

select has_table('public', 'profiles', 'Tabela profiles existe');
select has_table('public', 'audit_logs', 'Tabela audit_logs existe');
select has_table('public', 'routes', 'Tabela routes existe');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS está ativa na tabela profiles'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.audit_logs'::regclass),
  'RLS está ativa na tabela audit_logs'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.routes'::regclass),
  'RLS está ativa na tabela routes'
);

select * from finish();
rollback;
