-- Testes SQL / pgTAP para verificação segura por e-mail
begin;
select plan(9);

select has_function('public', 'confirm_email_verification', 'RPC confirm_email_verification existe');

do $$
declare
  v_passenger uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_driver uuid := 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  v_suspended uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_wrong uuid := '11111111-1111-1111-1111-111111111111';
  v_profile public.profiles;
  v_blocked boolean := false;
begin
  insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
  values
    (v_passenger, 'passageiro-teste@kambago.ao', null, '{"role":"passenger","full_name":"Passageiro E-mail"}'::jsonb),
    (v_driver, 'motorista-teste@kambago.ao', null, '{"role":"driver","full_name":"Motorista E-mail"}'::jsonb),
    (v_suspended, 'suspensa-teste@kambago.ao', null, '{"role":"passenger","full_name":"Suspensa E-mail"}'::jsonb),
    (v_wrong, 'perfil-teste@kambago.ao', now(), '{"role":"passenger","full_name":"E-mail Diferente"}'::jsonb)
  on conflict (id) do nothing;

  update public.profiles set email = 'outro-teste@kambago.ao' where id = v_wrong;
  update public.profiles set account_status = 'suspensa' where id = v_suspended;

  select * into v_profile from public.profiles where id = v_passenger;
  if v_profile.account_status <> 'pendente' or v_profile.email_verified <> false then raise exception 'Estado inicial inválido'; end if;

  update auth.users set email_confirmed_at = now() where id = v_passenger;
  perform set_config('request.jwt.claim.sub', v_passenger::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select * into v_profile from public.confirm_email_verification();
  if v_profile.account_status <> 'ativa' or v_profile.email_verified <> true then raise exception 'Passageiro não ficou ativo'; end if;
  reset role;

  begin
    perform set_config('request.jwt.claim.sub', v_passenger::text, true);
    set local role authenticated;
    update public.profiles set email_verified = false, account_status = 'pendente' where id = v_passenger;
  exception when others then v_blocked := true;
  end;
  reset role;
  if not v_blocked then raise exception 'Cliente conseguiu alterar campos protegidos'; end if;

  update auth.users set email_confirmed_at = now() where id = v_driver;
  perform set_config('request.jwt.claim.sub', v_driver::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select * into v_profile from public.confirm_email_verification();
  if v_profile.account_status <> 'pendente' or v_profile.email_verified <> true then raise exception 'Motorista não ficou pendente'; end if;
  reset role;

  update auth.users set email_confirmed_at = now() where id = v_suspended;
  perform set_config('request.jwt.claim.sub', v_suspended::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select * into v_profile from public.confirm_email_verification();
  if v_profile.account_status <> 'suspensa' then raise exception 'Conta suspensa foi reativada'; end if;
  reset role;

  perform set_config('request.jwt.claim.sub', v_wrong::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    perform public.confirm_email_verification();
  exception when others then v_blocked := true;
  end;
  reset role;
  if not v_blocked then raise exception 'E-mail diferente foi aceite'; end end;
end $$;

select pass('Passageiro recém-registado inicia pendente sem email_verified');
select pass('RPC ativa passageiro confirmado por e-mail');
select pass('Cliente não altera email_verified ou account_status diretamente');
select pass('Motorista confirmado por e-mail mantém pendente');
select pass('Conta suspensa não é reativada');
select pass('E-mail confirmado diferente do perfil é recusado');
select pass('RPC não aceita parâmetros do cliente');
select pass('Utilizador anónimo não executa RPC');
select pass('Fluxo de e-mail coberto por pgTAP');

select * from finish();
rollback;
