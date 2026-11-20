-- Testes SQL / pgTAP (T6): RLS rigorosa em profiles e RPC get_public_profiles_for_matching
begin;
select plan(11);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS está ativa na tabela public.profiles'
);

select has_column('public', 'profiles', 'avatar_path', 'Coluna avatar_path existe em profiles');
select hasnt_column('public', 'profiles', 'avatar_url', 'Coluna legada avatar_url foi removida de profiles');
select has_function('public', 'get_my_profile', 'RPC get_my_profile existe');
select has_function('public', 'get_public_profiles_for_matching', 'RPC get_public_profiles_for_matching existe');

select ok(
  not exists (
    select 1 from pg_views
    where schemaname = 'public' and viewname = 'profile_public_info'
  ),
  'View profile_public_info removida para evitar contorno de RLS'
);

select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'public_read_profiles'
  ),
  'Política insegura public_read_profiles não existe em profiles'
);

do $$
declare
  v_user_a uuid := '11111111-1111-1111-1111-111111111111';
  v_user_b uuid := '22222222-2222-2222-2222-222222222222';
  v_suspended uuid := '33333333-3333-3333-3333-333333333333';
  v_admin uuid := '44444444-4444-4444-4444-444444444444';
  v_count integer;
  v_updated_rows integer;
  v_role_blocked boolean := false;
  v_status_blocked boolean := false;
  v_verified_blocked boolean := false;
begin
  insert into auth.users (id, phone, phone_confirmed_at, raw_user_meta_data)
  values
    (v_user_a, '+244923000001', now(), '{"role":"passenger","full_name":"Passageiro A"}'::jsonb),
    (v_user_b, '+244923000002', now(), '{"role":"driver","full_name":"Motorista B"}'::jsonb),
    (v_suspended, '+244923000003', now(), '{"role":"passenger","full_name":"Conta Suspensa"}'::jsonb),
    (v_admin, '+244923000004', now(), '{"role":"passenger","full_name":"Admin KambaGo"}'::jsonb)
  on conflict (id) do nothing;

  update public.profiles set account_status = 'ativa', phone_verified = true where id in (v_user_a, v_user_b);
  update public.profiles set account_status = 'suspensa', phone_verified = true where id = v_suspended;
  update public.profiles set role = 'admin', account_status = 'ativa', phone_verified = true where id = v_admin;

  -- Como User A (passageiro autenticado)
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  -- 1. User A NÃO consegue ler a linha de User B em public.profiles
  select count(*) into v_count from public.profiles where id = v_user_b;
  if v_count <> 0 then
    raise exception 'Utilizador A não deveria conseguir ler o perfil de User B em public.profiles';
  end if;

  -- 2. User A vê apenas contas 'ativa' via get_public_profiles_for_matching (nunca 'suspensa')
  select count(*) into v_count
  from public.get_public_profiles_for_matching(array[v_user_b, v_suspended]);
  if v_count <> 1 then
    raise exception 'get_public_profiles_for_matching devia devolver apenas User B (ativa) e excluir conta suspensa';
  end if;

  if exists (
    select 1 from public.get_public_profiles_for_matching(array[v_suspended])
  ) then
    raise exception 'Conta suspensa não pode aparecer em get_public_profiles_for_matching';
  end if;

  -- 3. User A NÃO pode atualizar o próprio role, account_status ou phone_verified
  begin
    update public.profiles set role = 'admin' where id = v_user_a;
  exception when others then
    v_role_blocked := true;
  end;
  if not v_role_blocked then
    raise exception 'Utilizador A não pode alterar o próprio role';
  end if;

  begin
    update public.profiles set account_status = 'suspensa' where id = v_user_a;
  exception when others then
    v_status_blocked := true;
  end;
  if not v_status_blocked then
    raise exception 'Utilizador A não pode alterar o próprio account_status';
  end if;

  begin
    update public.profiles set phone_verified = false where id = v_user_a;
  exception when others then
    v_verified_blocked := true;
  end;
  if not v_verified_blocked then
    raise exception 'Utilizador A não pode alterar o próprio phone_verified';
  end if;

  -- 4. User A NÃO pode atualizar nem eliminar User B
  update public.profiles set full_name = 'Invasão' where id = v_user_b;
  get diagnostics v_updated_rows = row_count;
  if v_updated_rows <> 0 then
    raise exception 'Utilizador A não pode atualizar User B';
  end if;

  reset role;

  -- 5. Admin consegue ler todos os perfis sem recursão RLS
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  select count(*) into v_count
  from public.profiles
  where id in (v_user_a, v_user_b, v_suspended, v_admin);
  if v_count <> 4 then
    raise exception 'Admin deveria conseguir ler todos os 4 perfis';
  end if;

  reset role;
end $$;

select pass('Utilizador A não lê perfil de Utilizador B em public.profiles');
select pass('Conta suspensa excluída de get_public_profiles_for_matching');
select pass('Admin lê todos os perfis sem recursão RLS');
select pass('Utilizador impedido de alterar role, account_status e phone_verified próprios');

select * from finish();
rollback;
