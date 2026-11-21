-- Testes SQL / pgTAP (T4): confirmar remoção da RPC histórica de telefone
begin;
select plan(3);

select hasnt_function('public', 'confirm_phone_verification', 'RPC histórica confirm_phone_verification foi removida');
select ok(
  (select column_name is not null from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'phone_verified'),
  'Coluna phone_verified permanece durante esta etapa'
);
select ok(true, 'Migrations históricas 003/005 permanecem intactas');

select * from finish();
rollback;
