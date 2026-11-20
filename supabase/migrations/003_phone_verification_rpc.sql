-- KambaGo - Migration 003: Confirmação segura de verificação de telefone no servidor
-- RPC SECURITY DEFINER sem parâmetros do cliente:
--   - Exige utilizador autenticado (auth.uid() is not null)
--   - Verifica em auth.users se phone_confirmed_at está preenchido e coincide com profiles.phone
--   - Atualiza phone_verified = true e ativa apenas passageiros (nunca reativa contas 'suspensa'; motoristas mantêm 'pendente')
--   - Regista auditoria em public.audit_logs

create or replace function public.confirm_phone_verification()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_auth_phone text;
  v_phone_confirmed_at timestamptz;
  v_profile public.profiles;
  v_previous_status public.account_status;
  v_next_status public.account_status;
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  select u.phone, u.phone_confirmed_at
    into v_auth_phone, v_phone_confirmed_at
  from auth.users u
  where u.id = v_uid;

  if not found or v_phone_confirmed_at is null or nullif(trim(coalesce(v_auth_phone, '')), '') is null then
    raise exception 'Número de telefone ainda não confirmado no servidor de autenticação.';
  end if;

  select *
    into v_profile
  from public.profiles p
  where p.id = v_uid
  for update;

  if not found then
    raise exception 'Perfil não encontrado para este utilizador.';
  end if;

  if regexp_replace(v_auth_phone, '^\+', '') <> regexp_replace(v_profile.phone, '^\+', '') then
    raise exception 'O telefone confirmado não coincide com o telefone do perfil.';
  end if;

  v_previous_status := v_profile.account_status;

  if v_previous_status = 'suspensa' then
    v_next_status := 'suspensa';
  elsif v_profile.role = 'driver' then
    if v_previous_status = 'ativa' then
      v_next_status := 'ativa';
    else
      v_next_status := 'pendente';
    end if;
  else
    v_next_status := 'ativa';
  end if;

  update public.profiles
     set phone_verified = true,
         account_status = v_next_status
   where id = v_uid
   returning * into v_profile;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_uid,
    'phone_verified',
    'profiles',
    v_uid::text,
    jsonb_build_object(
      'role', v_profile.role,
      'previous_status', v_previous_status,
      'new_status', v_next_status
    )
  );

  return v_profile;
end;
$$;

revoke all on function public.confirm_phone_verification() from public, anon;
grant execute on function public.confirm_phone_verification() to authenticated;
