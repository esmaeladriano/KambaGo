-- KambaGo - Migration 002: RLS rigorosa em profiles + projeção pública segura para compatibilidade
-- Garante que cada utilizador lê apenas os seus próprios dados completos em public.profiles,
-- evitando recursão de políticas e impedindo exposição de PII (telefone, e-mail, tokens).
-- Utilizadores autenticados acedem apenas à informação pública básica via view/RPC dedicada.

-- 1. Garantir RLS ativa (e forçada para não-owners) na tabela profiles
alter table public.profiles enable row level security;

-- 2. Função auxiliar SECURITY DEFINER para verificar papel admin sem recursão RLS em profiles
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

-- 3. Limpar e recriar políticas SELECT/INSERT/UPDATE em public.profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
on public.profiles for select
to authenticated
using (public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (
  auth.uid() = id
  and role = 'passenger'
  and account_status = 'pendente'
  and phone_verified = false
);

-- Função auxiliar para impedir escalamento de privilégios no UPDATE do próprio perfil
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Só administradores (ou triggers/funções internas sem auth.uid() de cliente) podem alterar estes campos
  if auth.uid() is not null and not public.is_admin() then
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

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- 4. Projeção pública segura para compatibilidade (apenas utilizadores autenticados)
-- Expõe apenas: id, full_name, role, account_status, avatar_path (sem telefone, e-mail, tokens ou consentimentos).
create or replace view public.profile_public_info as
select
  p.id,
  p.full_name,
  p.role,
  p.account_status,
  p.avatar_path
from public.profiles p
where auth.uid() is not null
  and p.account_status = 'ativa';

revoke all on public.profile_public_info from public, anon;
grant select on public.profile_public_info to authenticated;

-- 5. Função RPC tipada para obter perfis públicos durante a compatibilidade de viagens
create or replace function public.get_public_profiles_for_matching(p_profile_ids uuid[])
returns table (
  id uuid,
  full_name text,
  role public.user_role,
  account_status public.account_status,
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
    p.role,
    p.account_status,
    p.avatar_path
  from public.profiles p
  where auth.uid() is not null
    and p.account_status = 'ativa'
    and p.id = any(p_profile_ids);
$$;

revoke all on function public.get_public_profiles_for_matching(uuid[]) from public, anon;
grant execute on function public.get_public_profiles_for_matching(uuid[]) to authenticated;

-- Atualizar também policy de audit_logs para usar public.is_admin() sem recursão
drop policy if exists "audit_logs_select_own" on public.audit_logs;
create policy "audit_logs_select_own"
on public.audit_logs for select
to authenticated
using (
  actor_id = auth.uid()
  or public.is_admin()
);
