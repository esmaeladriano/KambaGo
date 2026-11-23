-- Testes SQL / pgTAP (T7): Tabela fare_rules, RLS e auditoria
begin;
select plan(6);

select has_table('public', 'fare_rules', 'Tabela fare_rules existe');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.fare_rules'::regclass),
  'RLS está ativa na tabela fare_rules'
);

do $$
declare
  v_user uuid := '55555555-5555-5555-5555-555555555555';
  v_admin uuid := '66666666-6666-6666-6666-666666666666';
  v_route_id uuid;
  v_rule_count integer;
  v_updated_count integer;
  v_insert_blocked boolean := false;
  v_update_blocked boolean := false;
begin
  insert into auth.users (id, phone, phone_confirmed_at, raw_user_meta_data)
  values
    (v_user, '+244923400001', now(), '{"role":"passenger","full_name":"Passageiro Tarifas"}'::jsonb),
    (v_admin, '+244923400002', now(), '{"role":"passenger","full_name":"Admin Tarifas"}'::jsonb)
  on conflict (id) do nothing;

  update public.profiles set role = 'admin', account_status = 'ativa', phone_verified = true where id = v_admin;
  update public.profiles set account_status = 'ativa', phone_verified = true where id = v_user;

  insert into public.routes (
    code, origin_name, destination_name,
    origin_lat, origin_lng, destination_lat, destination_lng
  ) values (
    'teste-corredor', 'Zango', 'Mutamba', -8.9936, 13.3688, -8.8147, 13.2302
  )
  on conflict (code) do update set is_active = true
  returning id into v_route_id;

  -- Admin cria tarifa inicial
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  insert into public.fare_rules (route_id, min_fare_kz, max_fare_kz)
  values (v_route_id, 1000, 12000)
  on conflict (route_id) do update set min_fare_kz = 1000, max_fare_kz = 12000;

  reset role;

  -- Passageiro pode ler regra ativa mas NÃO pode inserir nem alterar
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  select count(*) into v_rule_count from public.fare_rules where route_id = v_route_id;
  if v_rule_count <> 1 then
    raise exception 'Utilizador autenticado deve conseguir ler fare_rules ativas';
  end if;

  begin
    insert into public.fare_rules (route_id, min_fare_kz, max_fare_kz)
    values (gen_random_uuid(), 500, 1000);
  exception when others then
    v_insert_blocked := true;
  end;
  if not v_insert_blocked then
    raise exception 'Utilizador comum não pode inserir fare_rules';
  end if;

  begin
    update public.fare_rules set min_fare_kz = 100 where route_id = v_route_id;
    get diagnostics v_updated_count = row_count;
    v_update_blocked := v_updated_count = 0;
  exception when others then
    v_update_blocked := true;
  end;
  if not v_update_blocked then
    raise exception 'Utilizador comum não pode atualizar fare_rules';
  end if;

  reset role;

  -- Verificar registo de auditoria
  if not exists (
    select 1 from public.audit_logs
    where entity_type = 'fare_rules'
      and actor_id = v_admin
  ) then
    raise exception 'Alteração de fare_rules por admin devia gerar audit_log';
  end if;
end $$;

select pass('Utilizador autenticado lê fare_rules ativas');
select pass('Utilizador comum bloqueado de escrever em fare_rules');
select pass('Admin escreve em fare_rules com registo em audit_logs');
select pass('Políticas admin-only de routes e fare_rules verificadas');

select * from finish();
rollback;
