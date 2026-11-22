-- APENAS DESENVOLVIMENTO LOCAL — nunca executar em produção
do $$
begin
  if coalesce(current_setting('app.env', true), '') <> 'development' then
    raise exception 'Seed de desenvolvimento bloqueado: app.env deve ser development';
  end if;
end $$;

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'passageiro-teste@kambago.ao', null, '{"role":"passenger","full_name":"Passageiro E-mail"}'::jsonb),
  ('eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 'motorista-teste@kambago.ao', null, '{"role":"driver","full_name":"Motorista E-mail"}'::jsonb)
on conflict (id) do nothing;
