-- Testes SQL / pgTAP da Migration 20231027000000: RLS, public_read_profiles e user_manage_own_profile
begin;
select plan(6);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS está ativa na tabela public.profiles'
);

select has_column('public', 'profiles', 'avatar_url', 'Coluna avatar_url existe em profiles');
select has_function('public', 'get_my_profile', 'RPC get_my_profile existe');

-- Verificar políticas exatas em public.profiles
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'public_read_profiles'
  ),
  'Política public_read_profiles existe'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'user_manage_own_profile'
  ),
  'Política user_manage_own_profile existe'
);

-- Testar SELECT público limitado por coluna, bloqueio de phone, e UPDATE/DELETE próprios
do $$
declare
  v_user_a uuid := '11111111-1111-1111-1111-111111111111';
  v_user_b uuid := '22222222-2222-2222-2222-222222222222';
  v_updated_rows integer;
  v_deleted_rows integer;
  v_public_b_count integer;
  v_phone_blocked boolean := false;
begin
  insert into auth.users (id, email)
  values (v_user_a, 'a@kambago.ao'), (v_user_b, 'b@kambago.ao')
  on conflict (id) do nothing;

  insert into public.profiles (id, full_name, phone, avatar_url, role, account_status, phone_verified)
  values
    (v_user_a, 'Passageiro A', '+244923000001', null, 'passenger', 'ativa', true),
    (v_user_b, 'Motorista B', '+244923000002', null, 'driver', 'ativa', true)
  on conflict (id) do update set account_status = 'ativa', phone_verified = true;

  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  -- User A lê (id, full_name, avatar_url) de B diretamente via public_read_profiles
  select count(*) into v_public_b_count
  from (select id, full_name, avatar_url from public.profiles where id = v_user_b) t;
  if v_public_b_count <> 1 then
    raise exception 'Utilizador A autenticado deveria ler (id, full_name, avatar_url) de B';
  end if;

  -- User A NÃO pode fazer SELECT de coluna privada (phone) em public.profiles
  begin
    perform phone from public.profiles where id = v_user_b;
  exception when insufficient_privilege then
    v_phone_blocked := true;
  end;
  if not v_phone_blocked then
    raise exception 'SELECT da coluna privada phone deveria estar bloqueado para authenticated';
  end if;

  -- User A NÃO pode atualizar nem eliminar B
  update public.profiles set full_name = 'Alterado' where id = v_user_b;
  get diagnostics v_updated_rows = row_count;
  if v_updated_rows <> 0 then
    raise exception 'Utilizador A não pode atualizar o perfil de B';
  end if;

  delete from public.profiles where id = v_user_b;
  get diagnostics v_deleted_rows = row_count;
  if v_deleted_rows <> 0 then
    raise exception 'Utilizador A não pode eliminar o perfil de B';
  end if;

  -- User A PODE atualizar e eliminar o próprio registo
  update public.profiles set full_name = 'Passageiro A Atualizado' where id = v_user_a;
  get diagnostics v_updated_rows = row_count;
  if v_updated_rows <> 1 then
    raise exception 'Utilizador A deveria conseguir atualizar o próprio perfil';
  end if;

  delete from public.profiles where id = v_user_a;
  get diagnostics v_deleted_rows = row_count;
  if v_deleted_rows <> 1 then
    raise exception 'Utilizador A deveria conseguir eliminar o próprio perfil';
  end if;

  reset role;
end $$;

select pass('Políticas public_read_profiles e user_manage_own_profile verificadas');

select * from finish();
rollback;
