-- KambaGo - Migration 013: perfil operacional criado apenas após confirmação de e-mail
-- Não altera nem substitui as migrations 001 a 012.

-- Contas ainda não confirmadas não podem ter perfil operacional legado.
delete from public.profiles p
where exists (
  select 1
  from auth.users u
  where u.id = p.id
    and u.email_confirmed_at is null
);

-- O trigger histórico deixa de criar perfis no INSERT de auth.users.
drop trigger if exists on_auth_user_created on auth.users;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

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
    case when v_role = 'driver' then 'pendente' else 'ativa' end,
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
    account_status = case
      when public.profiles.account_status = 'suspensa' then 'suspensa'
      when public.profiles.role = 'driver' then
        case
          when public.profiles.account_status = 'ativa' then 'ativa'
          else 'pendente'
        end
      else 'ativa'
    end,
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

drop trigger if exists trg_create_profile_after_email_confirmation on auth.users;
create trigger trg_create_profile_after_email_confirmation
after update of email_confirmed_at on auth.users
for each row execute function public.create_profile_after_email_confirmation();

-- RPC idempotente de confirmação garante que perfil existe após o OTP.
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
  then
    raise exception 'E-mail ainda não confirmado no servidor de autenticação.';
  end if;

  v_role := case
    when v_auth.raw_user_meta_data ->> 'role' = 'driver' then 'driver'::public.user_role
    else 'passenger'::public.user_role
  end;

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
    v_uid,
    coalesce(nullif(trim(v_auth.raw_user_meta_data ->> 'full_name'), ''), split_part(v_auth.email, '@', 1), 'Utilizador KambaGo'),
    nullif(trim(coalesce(v_auth.phone, v_auth.raw_user_meta_data ->> 'phone', '')), ''),
    lower(trim(v_auth.email)),
    v_role,
    case when v_role = 'driver' then 'pendente' else 'ativa' end,
    v_auth.phone_confirmed_at is not null,
    true,
    nullif(v_auth.raw_user_meta_data ->> 'consent_terms_at', '')::timestamptz,
    nullif(v_auth.raw_user_meta_data ->> 'consent_privacy_at', '')::timestamptz
  )
  on conflict (id) do update
  set
    email_verified = true,
    email = coalesce(excluded.email, public.profiles.email),
    account_status = case
      when public.profiles.account_status = 'suspensa' then 'suspensa'
      when public.profiles.role = 'driver' then
        case when public.profiles.account_status = 'ativa' then 'ativa' else 'pendente' end
      else 'ativa'
    end,
    updated_at = now()
  returning * into v_profile;

  return v_profile;
end;
$$;
