-- KambaGo - Migration 005: Confirmação de cadastro por código enviado ao e-mail
--   - Adiciona coluna email_verified em public.profiles
--   - Protege email_verified no trigger prevent_profile_privilege_escalation
--   - Atualiza handle_new_auth_user para refletir email_confirmed_at na criação
--   - Cria RPC SECURITY DEFINER confirm_email_verification() sem parâmetros do cliente

alter table public.profiles
  alter column phone drop not null;

alter table public.profiles
  add column if not exists email_verified boolean not null default false;

create index if not exists idx_profiles_email on public.profiles(lower(email))
  where email is not null;

-- Atualiza trigger de prevenção de escalamento de privilégios para proteger também email_verified
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Não é permitido alterar o papel da conta diretamente.';
    end if;
    if new.account_status is distinct from old.account_status then
      raise exception 'Não é permitido alterar o estado da conta diretamente.';
    end if;
    if new.phone_verified is distinct from old.phone_verified then
      raise exception 'A verificação de telefone só pode ser alterada pelo servidor.';
    end if;
    if new.email_verified is distinct from old.email_verified then
      raise exception 'A verificação de e-mail só pode ser alterada pelo servidor.';
    end if;
  end if;
  return new;
end;
$$;

-- Atualiza criação de perfil após registo para gravar email normalizado e email_verified inicial
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role := 'passenger';
  v_phone text;
  v_full_name text;
  v_email text;
begin
  if (new.raw_user_meta_data ->> 'role') = 'driver' then
    v_role := 'driver';
  end if;

  v_phone := nullif(trim(coalesce(nullif(new.phone, ''), new.raw_user_meta_data ->> 'phone', '')), '');
  v_full_name := coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'Utilizador KambaGo');
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
    'pendente',
    new.phone_confirmed_at is not null,
    new.email_confirmed_at is not null,
    nullif(new.raw_user_meta_data ->> 'consent_terms_at', '')::timestamptz,
    nullif(new.raw_user_meta_data ->> 'consent_privacy_at', '')::timestamptz
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (new.id, 'profile_created', 'profiles', new.id::text, jsonb_build_object('role', v_role));

  return new;
end;
$$;

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (
  auth.uid() = id
  and role = 'passenger'
  and account_status = 'pendente'
  and phone_verified = false
  and email_verified = false
);

-- RPC segura para confirmar verificação de e-mail no servidor e ativar passageiros
create or replace function public.confirm_email_verification()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_auth_email text;
  v_email_confirmed_at timestamptz;
  v_profile public.profiles;
  v_previous_status public.account_status;
  v_next_status public.account_status;
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  select u.email, u.email_confirmed_at
    into v_auth_email, v_email_confirmed_at
  from auth.users u
  where u.id = v_uid;

  if not found or v_email_confirmed_at is null or nullif(trim(coalesce(v_auth_email, '')), '') is null then
    raise exception 'E-mail ainda não confirmado no servidor de autenticação.';
  end if;

  select *
    into v_profile
  from public.profiles p
  where p.id = v_uid
  for update;

  if not found then
    raise exception 'Perfil não encontrado para este utilizador.';
  end if;

  if lower(trim(v_auth_email)) <> lower(trim(coalesce(v_profile.email, ''))) then
    raise exception 'O e-mail confirmado não coincide com o e-mail do perfil.';
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
     set email_verified = true,
         account_status = v_next_status
   where id = v_uid
   returning * into v_profile;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_uid,
    'email_verified',
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

revoke all on function public.confirm_email_verification() from public, anon;
grant execute on function public.confirm_email_verification() to authenticated;
