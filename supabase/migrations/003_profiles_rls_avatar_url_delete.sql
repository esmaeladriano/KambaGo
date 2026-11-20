-- KambaGo - Migration 003: Suporte a avatar_url, política DELETE própria e projeção pública (id, full_name, avatar_url)
-- Garante RLS ativa em public.profiles:
--   1. Utilizadores autenticados só atualizam e eliminam o seu próprio registo (auth.uid() = id).
--   2. Utilizadores autenticados leem os seus próprios dados completos em public.profiles.
--   3. Utilizadores autenticados leem apenas informação pública básica (id, full_name, avatar_url)
--      de qualquer perfil para compatibilidade via public.profile_public_info e RPC dedicada,
--      protegendo dados privados (telefone, e-mail, tokens e consentimentos).

-- 1. Garantir RLS ativa na tabela profiles e adicionar coluna avatar_url
alter table public.profiles enable row level security;

alter table public.profiles
  add column if not exists avatar_url text;

-- 2. Políticas de leitura, atualização e eliminação próprias em public.profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles for delete
to authenticated
using (auth.uid() = id);

-- 3. Atualizar a view de informação pública básica para incluir avatar_url
drop view if exists public.profile_public_info;
create view public.profile_public_info as
select
  p.id,
  p.full_name,
  p.avatar_url,
  p.role,
  p.account_status
from public.profiles p
where auth.uid() is not null;

revoke all on public.profile_public_info from public, anon;
grant select on public.profile_public_info to authenticated;

-- 4. Atualizar RPC de compatibilidade para devolver (id, full_name, avatar_url)
drop function if exists public.get_public_profiles_for_matching(uuid[]);
create function public.get_public_profiles_for_matching(p_profile_ids uuid[])
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  role public.user_role,
  account_status public.account_status
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.avatar_url,
    p.role,
    p.account_status
  from public.profiles p
  where auth.uid() is not null
    and p.id = any(p_profile_ids);
$$;

revoke all on function public.get_public_profiles_for_matching(uuid[]) from public, anon;
grant execute on function public.get_public_profiles_for_matching(uuid[]) to authenticated;
