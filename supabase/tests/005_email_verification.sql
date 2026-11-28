-- Testes SQL / pgTAP para verificação segura por e-mail
begin;
select plan(10);

select has_function('public', 'confirm_email_verification', 'RPC confirm_email_verification existe');

select is(
  (
    select p.pronargs
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'confirm_email_verification'
  ),
  0::smallint,
  'RPC confirm_email_verification não aceita parâmetros do cliente'
);

select is(
  pg_catalog.has_function_privilege('anon', 'public.confirm_email_verification()', 'execute'),
  false,
  'Utilizador anónimo não tem permissão execute na RPC confirm_email_verification'
);

do $$
declare
  v_passenger uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_driver uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
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
    (v_wrong, 'perfil-teste@kambago.ao', null, '{"role":"passenger","full_name":"E-mail Diferente"}'::jsonb)
  on conflict (id) do nothing;

  -- Confirma o e-mail de v_wrong para que o trigger crie o perfil (migration 013),
  -- depois altera o e-mail do perfil para simular divergência.
  update auth.users set email_confirmed_at = now() where id = v_wrong;
  update public.profiles set email = 'outro-teste@kambago.ao' where id = v_wrong;

  -- 1. Passageiro recém-registado inicia pendente com email_verified = false
  select * into v_profile from public.profiles where id = v_passenger;
  if v_profile.account_status <> 'pendente' or v_profile.email_verified <> false then
    raise exception 'Estado inicial inválido para passageiro';
  end if;

  -- 2. Depois de auth.users.email_confirmed_at preenchido e RPC chamada pelo utilizador, passageiro fica ativa
  update auth.users set email_confirmed_at = now() where id = v_passenger;
  perform set_config('request.jwt.claim.sub', v_passenger::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select * into v_profile from public.confirm_email_verification();
  if v_profile.account_status <> 'ativa' or v_profile.email_verified <> true then
    raise exception 'Passageiro confirmado por e-mail não ficou ativo';
  end if;
  reset role;

  -- 3. Cliente não consegue alterar email_verified nem account_status diretamente
  v_blocked := false;
  begin
    perform set_config('request.jwt.claim.sub', v_passenger::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
    update public.profiles set email_verified = false, account_status = 'pendente' where id = v_passenger;
  exception when others then
    v_blocked := true;
  end;
  reset role;
  if not v_blocked then
    raise exception 'Cliente conseguiu alterar email_verified ou account_status diretamente';
  end if;

  -- 4. Motorista confirmado por e-mail permanece pendente até aprovação administrativa
  update auth.users set email_confirmed_at = now() where id = v_driver;
  perform set_config('request.jwt.claim.sub', v_driver::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select * into v_profile from public.confirm_email_verification();
  if v_profile.account_status <> 'pendente' or v_profile.email_verified <> true then
    raise exception 'Motorista confirmado por e-mail não manteve estado pendente';
  end if;
  reset role;

  -- 5. Conta suspensa não é reativada pela RPC
  update auth.users set email_confirmed_at = now() where id = v_suspended;
  -- O perfil só é criado após confirmação de e-mail (migration 013); suspende-o agora.
  update public.profiles set account_status = 'suspensa' where id = v_suspended;
  perform set_config('request.jwt.claim.sub', v_suspended::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select * into v_profile from public.confirm_email_verification();
  if v_profile.account_status <> 'suspensa' then
    raise exception 'Conta suspensa foi reativada indevidamente';
  end if;
  reset role;

  -- 6. Confirmação com e-mail diferente do perfil é recusada
  v_blocked := false;
  perform set_config('request.jwt.claim.sub', v_wrong::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    perform public.confirm_email_verification();
  exception when others then
    v_blocked := true;
  end;
  reset role;
  if not v_blocked then
    raise exception 'E-mail diferente do perfil foi aceite pela RPC';
  end if;

  -- 7. Utilizador anónimo não consegue executar confirm_email_verification()
  v_blocked := false;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  set local role anon;
  begin
    perform public.confirm_email_verification();
  exception when others then
    v_blocked := true;
  end;
  reset role;
  if not v_blocked then
    raise exception 'Utilizador anónimo conseguiu executar confirm_email_verification';
  end if;
end $$;

select pass('Passageiro recém-registado inicia pendente sem email_verified');
select pass('RPC ativa passageiro confirmado por e-mail');
select pass('Cliente não altera email_verified ou account_status diretamente');
select pass('Motorista confirmado por e-mail mantém pendente');
select pass('Conta suspensa não é reativada');
select pass('E-mail confirmado diferente do perfil é recusado');
select pass('Execução anónima da RPC bloqueada em tempo de execução');

select * from finish();
rollback;
