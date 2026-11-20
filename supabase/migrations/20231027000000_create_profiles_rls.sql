-- KambaGo - Migration: 20231027000000_create_profiles_rls.sql
-- 1) Ativa RLS na tabela profiles: ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- 2) Política 'public_read_profiles': permite SELECT apenas nas colunas (id, full_name, avatar_url)
--    a utilizadores autenticados através de permissões por coluna.
-- 3) Política 'user_manage_own_profile': permite SELECT, UPDATE e DELETE na linha onde id = auth.uid().

alter table public.profiles
  add column if not exists avatar_url text;

-- 1. Ativar RLS na tabela profiles
alter table public.profiles enable row level security;

-- 2. Permissões por coluna para a role authenticated (sem INSERT direto, gerido por trigger SECURITY DEFINER)
grant usage on schema public to authenticated;
revoke all on public.profiles from public, anon, authenticated;
grant select (id, full_name, avatar_url) on public.profiles to authenticated;
grant update (full_name, email, avatar_path, avatar_url, data_saver_enabled, intt_registration_number, expo_push_token) on public.profiles to authenticated;
grant delete on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

-- Limpar políticas anteriores para manter apenas as políticas definidas abaixo
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
drop policy if exists "public_read_profiles" on public.profiles;
drop policy if exists "user_manage_own_profile" on public.profiles;

-- 3. Política 'public_read_profiles': SELECT de (id, full_name, avatar_url) para utilizadores autenticados
create policy "public_read_profiles"
on public.profiles
for select
to authenticated
using (auth.uid() is not null);

-- 4. Política 'user_manage_own_profile': SELECT, UPDATE e DELETE apenas na própria linha (id = auth.uid())
create policy "user_manage_own_profile"
on public.profiles
for all
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- 5. RPC segura para o próprio utilizador obter os seus dados privados completos (id = auth.uid())
create or replace function public.get_my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- 6. View e RPC de correspondência mantidas alinhadas com (id, full_name, avatar_url)
drop view if exists public.profile_public_info;
create view public.profile_public_info as
select
  p.id,
  p.full_name,
  coalesce(p.avatar_url, p.avatar_path) as avatar_url
from public.profiles p
where auth.uid() is not null;

revoke all on public.profile_public_info from public, anon;
grant select on public.profile_public_info to authenticated;
grant select on public.profile_public_info to service_role;

drop function if exists public.get_public_profiles_for_matching(uuid[]);
create function public.get_public_profiles_for_matching(p_profile_ids uuid[])
returns table (
  id uuid,
  full_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    coalesce(p.avatar_url, p.avatar_path) as avatar_url
  from public.profiles p
  where auth.uid() is not null
    and p.id = any(p_profile_ids);
$$;

revoke all on function public.get_public_profiles_for_matching(uuid[]) from public, anon;
grant execute on function public.get_public_profiles_for_matching(uuid[]) to authenticated;
