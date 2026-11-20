-- Testes SQL / pgTAP da Etapa 1: RLS em profiles e audit_logs
begin;
select plan(4);

select has_table('public', 'profiles', 'Tabela profiles existe');
select has_table('public', 'audit_logs', 'Tabela audit_logs existe');
select has_table('public', 'routes', 'Tabela routes existe');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS está ativa na tabela profiles'
);

select * from finish();
rollback;
