-- KambaGo - Migration 002: RLS rigorosa em profiles e RPC segura de correspondência
-- Regras:
--   1. Utilizadores autenticados leem/atualizam/eliminam apenas a sua própria linha em public.profiles.
--   2. Administradores (via public.is_admin() SECURITY DEFINER) leem todos os perfis sem recursão RLS.
--   3. Nenhuma política public_read_profiles nem view SECURITY DEFINER expõe outros perfis.
--   4. Correspondência de viagens usa exclusivamente get_public_profiles_for_matching(uuid[]),
--      que devolve apenas (id, full_name, avatar_path) de contas com account_status = 'ativa'.

alter table public.profiles enable row level security;

-- Remover coluna/objetos legados caso existam numa base anterior
drop view if exists public.profile_public_info;
alter table public.profiles drop column if exists avatar_url;

-- 1. Função auxiliar SECURITY DEFINER para verificar papel admin sem recursão RLS em profiles
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 2. Limpar políticas anteriores e recriar políticas estritas em public.profiles
drop policy if exists "public_read_profiles" on public.profiles;
drop policy if exists "user_manage_own_profile" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "profiles_select_admin"
on public.profiles for select
to authenticated
using (public.is_admin());

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (
  auth.uid() = id
  and role = 'passenger'
  and account_status = 'pendente'
  and phone_verified = false
);

-- 3. Trigger SECURITY INVOKER para impedir escalamento de privilégios pelo cliente
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
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_fields on public.profiles;
create trigger trg_profiles_guard_fields
before update on public.profiles
for each row execute function public.prevent_profile_privilege_escalation();

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "profiles_delete_own"
on public.profiles for delete
to authenticated
using (auth.uid() = id);

-- 4. RPC segura para o próprio utilizador obter os seus dados privados completos (id = auth.uid())
create or replace function public.get_my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.profiles p
  where auth.uid() is not null
    and p.id = auth.uid();
$$;

revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- 5. RPC segura para correspondência de viagens: apenas contas 'ativa' e apenas (id, full_name, avatar_path)
drop function if exists public.get_public_profiles_for_matching(uuid[]);
create function public.get_public_profiles_for_matching(p_profile_ids uuid[])
returns table (
  id uuid,
  full_name text,
  avatar_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.avatar_path
  from public.profiles p
  where auth.uid() is not null
    and p.account_status = 'ativa'
    and p.id = any(p_profile_ids);
$$;

revoke all on function public.get_public_profiles_for_matching(uuid[]) from public, anon;
grant execute on function public.get_public_profiles_for_matching(uuid[]) to authenticated;

-- 6. Política de audit_logs usando public.is_admin() sem recursão
drop policy if exists "audit_logs_select_own" on public.audit_logs;
create policy "audit_logs_select_own"
on public.audit_logs for select
to authenticated
using (
  actor_id = auth.uid()
  or public.is_admin()
);
