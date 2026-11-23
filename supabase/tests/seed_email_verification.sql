-- Seed mínimo local para testes de e-mail. Não executar em produção.
begin;
select plan(1);
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'passageiro-teste@kambago.ao', null, '{"role":"passenger","full_name":"Passageiro E-mail"}'::jsonb),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'motorista-teste@kambago.ao', null, '{"role":"driver","full_name":"Motorista E-mail"}'::jsonb)
on conflict (id) do nothing;
select pass('Seed mínimo de utilizadores criado');
select * from finish();
rollback;
