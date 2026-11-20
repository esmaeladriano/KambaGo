-- KambaGo - Migration: 20231027000000_create_profiles_rls.sql
-- 1) Garante que a tabela public.profiles tem RLS ativado.
-- 2) Adiciona a política 'public_read_profiles' aliada a permissões por coluna para que
--    utilizadores autenticados possam fazer SELECT apenas de (id, full_name, avatar_url).
-- 3) Adiciona políticas para que cada utilizador possa fazer SELECT, UPDATE e DELETE
--    apenas na sua própria linha (auth.uid() = id).

alter table public.profiles
  add column if not exists avatar_url text;

-- 1. Ativar RLS na tabela profiles
alter table public.profiles enable row level security;

-- 2. Permissões explícitas por coluna para a role authenticated
-- Revoga acesso amplo e permite SELECT direto apenas nas colunas públicas (id, full_name, avatar_url)
grant usage on schema public to authenticated;
revoke all on public.profiles from public, anon, authenticated;
grant select (id, full_name, avatar_url) on public.profiles to authenticated;
grant update (full_name, email, avatar_path, avatar_url, data_saver_enabled, intt_registration_number, expo_push_token) on public.profiles to authenticated;
grant delete on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

-- 3. Política 'public_read_profiles': leitura pública básica para utilizadores autenticados
drop policy if exists "public_read_profiles" on public.profiles;
create policy "public_read_profiles"
on public.profiles
for select
to authenticated
using (auth.uid() is not null);

-- 4. Políticas individuais por utilizador (auth.uid() = id)
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using (auth.uid() = id);

-- 5. RPC segura para o próprio utilizador obter os seus dados privados completos (auth.uid() = id)
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
