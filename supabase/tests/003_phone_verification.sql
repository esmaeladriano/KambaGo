-- Testes SQL / pgTAP (T4): Verificação de telefone e ativação segura do passageiro
begin;
select plan(7);

select has_function('public', 'confirm_phone_verification', 'RPC confirm_phone_verification existe');

do $$
declare
  v_passenger uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_driver uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_suspended uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_profile public.profiles;
  v_unconfirmed_blocked boolean := false;
  v_client_escalation_blocked boolean := false;
begin
  -- 1. Inserir utilizadores em auth.users sem confirmação de telefone inicial
  insert into auth.users (id, phone, phone_confirmed_at, raw_user_meta_data)
  values
    (v_passenger, '+244923100001', null, '{"role":"passenger","full_name":"Passageiro Teste"}'::jsonb),
    (v_driver, '+244923100002', now(), '{"role":"driver","full_name":"Motorista Teste"}'::jsonb),
    (v_suspended, '+244923100003', now(), '{"role":"passenger","full_name":"Conta Suspensa"}'::jsonb)
  on conflict (id) do nothing;

  -- Garantir estado suspenso no utilizador 3
  update public.profiles set account_status = 'suspensa' where id = v_suspended;

  -- Caso 1: Passageiro recém-registado começa pendente e phone_verified = false
  select * into v_profile from public.profiles where id = v_passenger;
  if v_profile.account_status <> 'pendente' or v_profile.phone_verified <> false then
    raise exception 'Passageiro novo deve iniciar pendente e com phone_verified = false';
  end if;

  -- Caso 2: Passageiro sem phone_confirmed_at em auth.users NÃO pode confirmar telefone
  perform set_config('request.jwt.claim.sub', v_passenger::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  begin
    perform public.confirm_phone_verification();
  exception when others then
    v_unconfirmed_blocked := true;
  end;
  if not v_unconfirmed_blocked then
    raise exception 'confirm_phone_verification devia falhar sem phone_confirmed_at';
  end if;

  -- Caso 3: Cliente NÃO pode alterar phone_verified nem account_status diretamente via UPDATE
  begin
    update public.profiles
       set phone_verified = true, account_status = 'ativa'
     where id = v_passenger;
  exception when others then
    v_client_escalation_blocked := true;
  end;
  if not v_client_escalation_blocked then
    raise exception 'Cliente não deve conseguir alterar phone_verified/account_status diretamente';
  end if;

  reset role;

  -- Simular confirmação SMS no Supabase Auth (auth.users.phone_confirmed_at)
  update auth.users set phone_confirmed_at = now() where id = v_passenger;

  -- Caso 4: Após verificação SMS, passageiro chama RPC e passa a ativa + phone_verified = true
  perform set_config('request.jwt.claim.sub', v_passenger::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  select * into v_profile from public.confirm_phone_verification();
  if v_profile.account_status <> 'ativa' or v_profile.phone_verified <> true then
    raise exception 'Passageiro confirmado devia ficar ativa e phone_verified = true';
  end if;
  reset role;

  -- Caso 5: Motorista verificado fica com phone_verified = true mas mantém account_status = pendente
  perform set_config('request.jwt.claim.sub', v_driver::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  select * into v_profile from public.confirm_phone_verification();
  if v_profile.account_status <> 'pendente' or v_profile.phone_verified <> true then
    raise exception 'Motorista confirmado deve manter account_status = pendente';
  end if;
  reset role;

  -- Caso 6: Conta suspensa NÃO é reativada pela verificação de telefone
  perform set_config('request.jwt.claim.sub', v_suspended::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  select * into v_profile from public.confirm_phone_verification();
  if v_profile.account_status <> 'suspensa' or v_profile.phone_verified <> true then
    raise exception 'Conta suspensa não pode ser reativada via confirm_phone_verification';
  end if;
  reset role;
end $$;

select pass('Passageiro inicia pendente com phone_verified = false');
select pass('confirm_phone_verification bloqueia utilizador sem phone_confirmed_at');
select pass('Cliente impedido de alterar phone_verified e account_status diretamente');
select pass('Passageiro passa a ativa após confirm_phone_verification');
select pass('Motorista mantém account_status = pendente após verificação');
select pass('Conta suspensa nunca é reativada por confirm_phone_verification');

select * from finish();
rollback;
