-- KambaGo - Migration 009: reforço de contas e perfis
-- Não altera as migrations 001 a 008.

drop policy if exists "profiles_delete_own" on public.profiles;
revoke delete on table public.profiles from authenticated, anon;

create or replace function public.request_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_uid, 'account_deletion_requested', 'profiles', v_uid::text, '{}'::jsonb);

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

drop function if exists public.set_account_status_admin(uuid, text);
create or replace function public.set_account_status_admin(p_user_id uuid, p_status text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_previous public.account_status;
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.';
  end if;
  if not public.is_admin() then
    raise exception 'Apenas administradores podem alterar estados de conta.';
  end if;
  if p_status not in ('pendente', 'ativa', 'suspensa') then
    raise exception 'Estado de conta inválido.';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Conta não encontrada.';
  end if;

  v_previous := v_profile.account_status;
  update public.profiles
     set account_status = p_status::public.account_status,
         is_available = case when p_status = 'ativa' then is_available else false end
   where id = p_user_id
  returning * into v_profile;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_uid,
    'account_status_changed',
    'profiles',
    p_user_id::text,
    jsonb_build_object('previous_status', v_previous, 'new_status', p_status)
  );

  return v_profile;
end;
$$;

revoke all on function public.set_account_status_admin(uuid, text) from public, anon;
grant execute on function public.set_account_status_admin(uuid, text) to authenticated;

drop function if exists public.bootstrap_first_admin(text);
create or replace function public.bootstrap_first_admin(p_email text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if not exists (
    select 1 from public.profiles
    where role = 'admin'
  ) then
    select * into v_profile
    from public.profiles
    where lower(email) = lower(trim(p_email));

    if not found then
      raise exception 'Perfil não encontrado para o e-mail indicado.';
    end if;

    update public.profiles
       set role = 'admin',
           account_status = 'ativa',
           is_available = false
     where id = v_profile.id
    returning * into v_profile;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      v_profile.id,
      'bootstrap_first_admin',
      'profiles',
      v_profile.id::text,
      jsonb_build_object('email', lower(trim(p_email)))
    );

    return v_profile;
  end if;

  raise exception 'Já existe um administrador.';
end;
$$;

revoke all on function public.bootstrap_first_admin(text) from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin(text) to service_role;
