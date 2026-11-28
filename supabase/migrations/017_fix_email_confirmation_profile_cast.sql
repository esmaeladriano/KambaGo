-- KambaGo - Migration 017: corrige cast text -> enum no trigger/RPC de confirmação de e-mail
-- Causa: em 013_profile_after_email_confirmation.sql, as expressões
--   case when v_role = 'driver' then 'pendente' else 'ativa' end
-- devolvem text, mas a coluna account_status é do tipo enum public.account_status,
-- provocando "column account_status is of type account_status but expression is of type text".
-- Esta migration recria as funções com casts explícitos para o enum.
-- Não altera nem substitui as migrations 001 a 016.

create or replace function public.create_profile_after_email_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role public.user_role;
  v_phone text;
  v_full_name text;
  v_email text;
begin
  if old.email_confirmed_at is not null
     or new.email_confirmed_at is null
  then
    return new;
  end if;

  v_role := case
    when new.raw_user_meta_data ->> 'role' = 'driver' then 'driver'::public.user_role
    else 'passenger'::public.user_role
  end;
  v_phone := nullif(
    trim(coalesce(
      nullif(new.phone, ''),
      new.raw_user_meta_data ->> 'phone',
      ''
    )),
    ''
  );
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'Utilizador KambaGo'
  );
  v_email := nullif(lower(trim(coalesce(new.email, ''))), '');

  insert into public.profiles (
    id,
    full_name,
    phone,
    email,
    role,
    account_status,
    phone_verified,
    email_verified,
    consent_terms_at,
    consent_privacy_at
  ) values (
    new.id,
    v_full_name,
    v_phone,
    v_email,
    v_role,
    (case when v_role = 'driver' then 'pendente' else 'ativa' end)::public.account_status,
    new.phone_confirmed_at is not null,
    true,
    nullif(new.raw_user_meta_data ->> 'consent_terms_at', '')::timestamptz,
    nullif(new.raw_user_meta_data ->> 'consent_privacy_at', '')::timestamptz
  )
  on conflict (id) do update
  set
    full_name = case
      when public.profiles.full_name is null or public.profiles.full_name = ''
      then excluded.full_name
      else public.profiles.full_name
    end,
    phone = coalesce(public.profiles.phone, excluded.phone),
    email = coalesce(excluded.email, public.profiles.email),
    email_verified = true,
    account_status = (case
      when public.profiles.account_status = 'suspensa' then 'suspensa'
      when public.profiles.role = 'driver' then
        case
          when public.profiles.account_status = 'ativa' then 'ativa'
          else 'pendente'
        end
      else 'ativa'
    end)::public.account_status,
    updated_at = now();

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    new.id,
    'email_confirmed_profile_created',
    'profiles',
    new.id::text,
    jsonb_build_object('role', v_role)
  );
  return new;
end;
$$;

create or replace function public.confirm_email_verification()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_auth record;
  v_profile public.profiles;
  v_role public.user_role;
  v_previous_status public.account_status;
  v_next_status public.account_status;
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  select u.email, u.email_confirmed_at, u.phone, u.phone_confirmed_at, u.raw_user_meta_data
    into v_auth
  from auth.users u
  where u.id = v_uid;

  if not found
     or v_auth.email_confirmed_at is null
     or nullif(trim(coalesce(v_auth.email, '')), '') is null
  then
    raise exception 'E-mail ainda não confirmado no servidor de autenticação.';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;

  -- Se o perfil já existe, o e-mail confirmado tem de coincidir com o e-mail do perfil
  -- (regressão de segurança reintroduzida face à migration 005).
  if found and lower(trim(v_auth.email)) <> lower(trim(coalesce(v_profile.email, ''))) then
    raise exception 'O e-mail confirmado não coincide com o e-mail do perfil.';
  end if;

  v_role := case
    when v_auth.raw_user_meta_data ->> 'role' = 'driver' then 'driver'::public.user_role
    else 'passenger'::public.user_role
  end;

  if not found then
    -- Perfil ainda não criado (trigger não disparou): cria-o agora.
    insert into public.profiles (
      id, full_name, phone, email, role, account_status,
      phone_verified, email_verified, consent_terms_at, consent_privacy_at
    ) values (
      v_uid,
      coalesce(nullif(trim(v_auth.raw_user_meta_data ->> 'full_name'), ''), split_part(v_auth.email, '@', 1), 'Utilizador KambaGo'),
      nullif(trim(coalesce(v_auth.phone, v_auth.raw_user_meta_data ->> 'phone', '')), ''),
      lower(trim(v_auth.email)),
      v_role,
      (case when v_role = 'driver' then 'pendente' else 'ativa' end)::public.account_status,
      v_auth.phone_confirmed_at is not null,
      true,
      nullif(v_auth.raw_user_meta_data ->> 'consent_terms_at', '')::timestamptz,
      nullif(v_auth.raw_user_meta_data ->> 'consent_privacy_at', '')::timestamptz
    )
    returning * into v_profile;
  else
    v_previous_status := v_profile.account_status;
    if v_previous_status = 'suspensa' then
      v_next_status := 'suspensa';
    elsif v_profile.role = 'driver' then
      v_next_status := case when v_previous_status = 'ativa' then 'ativa' else 'pendente' end;
    else
      v_next_status := 'ativa';
    end if;

    update public.profiles
      set email_verified = true,
          account_status = v_next_status,
          updated_at = now()
      where id = v_uid
      returning * into v_profile;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_uid,
    'email_confirmed_profile_created',
    'profiles',
    v_uid::text,
    jsonb_build_object('role', v_profile.role)
  );

  return v_profile;
end;
$$;