-- Testes SQL / pgTAP para o bloqueio de mobilidade de contas suspensas (migration 014)
-- Confirma que:
--   * motorista suspenso não consegue start_trip, complete_trip nem cancel_trip;
--   * motorista ativo, dono da viagem, consegue start_trip;
--   * admin consegue cancel_trip mesmo com o motorista suspenso.
begin;
select plan(5);

do $$
declare
  v_suspended uuid := 'a0140000-0000-4000-8000-000000000001';
  v_active uuid := 'a0140000-0000-4000-8000-000000000002';
  v_admin uuid := 'a0140000-0000-4000-8000-000000000003';
  v_trip_start uuid := 'a0140000-0000-4000-8000-000000000010';
  v_trip_complete uuid := 'a0140000-0000-4000-8000-000000000011';
  v_trip_active uuid := 'a0140000-0000-4000-8000-000000000012';
  v_trip_admin uuid := 'a0140000-0000-4000-8000-000000000013';
  v_blocked boolean := false;
  v_status public.trip_status;
begin
  -- Cria utilizadores já confirmados (o trigger de confirmação não é necessário aqui;
  -- inserimos os perfis diretamente com os estados pretendidos).
  insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
  values
    (v_suspended, 'suspenso-014@kambago.ao', now(), '{"role":"driver","full_name":"Motorista Suspenso"}'::jsonb),
    (v_active, 'ativo-014@kambago.ao', now(), '{"role":"driver","full_name":"Motorista Ativo"}'::jsonb),
    (v_admin, 'admin-014@kambago.ao', now(), '{"role":"admin","full_name":"Administrador Teste"}'::jsonb)
  on conflict (id) do nothing;

  insert into public.profiles (id, full_name, phone, email, role, account_status, email_verified)
  values
    (v_suspended, 'Motorista Suspenso', '+244923001401', 'suspenso-014@kambago.ao', 'driver'::public.user_role, 'suspensa'::public.account_status, true),
    (v_active, 'Motorista Ativo', '+244923001402', 'ativo-014@kambago.ao', 'driver'::public.user_role, 'ativa'::public.account_status, true),
    (v_admin, 'Administrador Teste', '+244923001403', 'admin-014@kambago.ao', 'admin'::public.user_role, 'ativa'::public.account_status, true)
  on conflict (id) do update
  set account_status = excluded.account_status,
      role = excluded.role;

  -- Viagens de teste (dono = motorista suspenso, exceto a do motorista ativo).
  insert into public.trips (id, driver_id, status, origin_name, destination_name, total_estimated_kz, available_seats)
  values
    (v_trip_start, v_suspended, 'aceite', 'Zango', 'Mutamba', 1000, 4),
    (v_trip_complete, v_suspended, 'em_andamento', 'Zango', 'Mutamba', 1000, 4),
    (v_trip_active, v_active, 'aceite', 'Zango', 'Mutamba', 1000, 4),
    (v_trip_admin, v_suspended, 'aceite', 'Zango', 'Mutamba', 1000, 4)
  on conflict (id) do nothing;

  -- 1. Motorista suspenso não consegue iniciar a viagem.
  v_blocked := false;
  perform set_config('request.jwt.claim.sub', v_suspended::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    perform public.start_trip(v_trip_start);
  exception when others then
    v_blocked := true;
  end;
  reset role;
  if not v_blocked then
    raise exception 'Motorista suspenso conseguiu iniciar a viagem';
  end if;

  -- 2. Motorista suspenso não consegue concluir a viagem.
  v_blocked := false;
  perform set_config('request.jwt.claim.sub', v_suspended::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    perform public.complete_trip(v_trip_complete);
  exception when others then
    v_blocked := true;
  end;
  reset role;
  if not v_blocked then
    raise exception 'Motorista suspenso conseguiu concluir a viagem';
  end if;

  -- 3. Motorista suspenso não consegue cancelar a viagem.
  v_blocked := false;
  perform set_config('request.jwt.claim.sub', v_suspended::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    perform public.cancel_trip(v_trip_admin, 'teste suspenso');
  exception when others then
    v_blocked := true;
  end;
  reset role;
  if not v_blocked then
    raise exception 'Motorista suspenso conseguiu cancelar a viagem';
  end if;

  -- 4. Motorista ativo, dono da viagem, consegue iniciar.
  perform set_config('request.jwt.claim.sub', v_active::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select status into v_status from public.start_trip(v_trip_active);
  reset role;
  if v_status <> 'em_andamento' then
    raise exception 'Motorista ativo não conseguiu iniciar a viagem';
  end if;

  -- 5. Admin consegue cancelar a viagem de um motorista suspenso.
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select status into v_status from public.cancel_trip(v_trip_admin, 'cancelamento admin');
  reset role;
  if v_status <> 'cancelada' then
    raise exception 'Admin não conseguiu cancelar a viagem do motorista suspenso';
  end if;
end $$;

select pass('Motorista suspenso não inicia viagem (start_trip bloqueado)');
select pass('Motorista suspenso não conclui viagem (complete_trip bloqueado)');
select pass('Motorista suspenso não cancela viagem (cancel_trip bloqueado)');
select pass('Motorista ativo dono da viagem inicia viagem (start_trip aceite)');
select pass('Admin cancela viagem de motorista suspenso (cancel_trip aceite)');

select * from finish();
rollback;