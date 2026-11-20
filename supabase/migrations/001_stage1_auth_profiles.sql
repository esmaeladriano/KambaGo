-- KambaGo - Etapa 1: Autenticação, Perfis, Auditoria e Corredor Configurável
-- Migration: 001_stage1_auth_profiles.sql

create extension if not exists "pgcrypto";

-- Enums de domínio
do $$ begin
  create type public.user_role as enum ('passenger', 'driver', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.account_status as enum ('pendente', 'ativa', 'suspensa');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.intt_verification_status as enum ('pendente_confirmacao');
exception
  when duplicate_object then null;
end $$;

-- Tabela de perfis (ligada a auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) >= 3),
  phone text not null unique check (phone ~ '^\+2449[0-9]{8}$'),
  email text,
  role public.user_role not null default 'passenger',
  account_status public.account_status not null default 'pendente',
  phone_verified boolean not null default false,
  avatar_path text,
  data_saver_enabled boolean not null default false,
  intt_registration_number text,
  intt_verification_status public.intt_verification_status not null default 'pendente_confirmacao',
  consent_terms_at timestamptz,
  consent_privacy_at timestamptz,
  expo_push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_phone on public.profiles(phone);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_account_status on public.profiles(account_status);

-- Tabela de registos de auditoria imutáveis
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_actor on public.audit_logs(actor_id, created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

-- Tabela inicial de corredores configuráveis (ex.: Zango -> Mutamba)
create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  origin_name text not null,
  destination_name text not null,
  origin_lat double precision not null,
  origin_lng double precision not null,
  destination_lat double precision not null,
  destination_lng double precision not null,
  max_detour_meters integer not null default 1000 check (max_detour_meters > 0),
  destination_tolerance_meters integer not null default 500 check (destination_tolerance_meters > 0),
  search_radius_meters integer not null default 2000 check (search_radius_meters > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Trigger de updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Criação automática de perfil após registo em auth.users
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
begin
  if (new.raw_user_meta_data ->> 'role') = 'driver' then
    v_role := 'driver';
  end if;

  v_phone := coalesce(nullif(new.phone, ''), new.raw_user_meta_data ->> 'phone');
  v_full_name := coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'Utilizador KambaGo');

  insert into public.profiles (
    id,
    full_name,
    phone,
    email,
    role,
    account_status,
    phone_verified,
    consent_terms_at,
    consent_privacy_at
  ) values (
    new.id,
    v_full_name,
    v_phone,
    new.email,
    v_role,
    'pendente',
    new.phone_confirmed_at is not null,
    nullif(new.raw_user_meta_data ->> 'consent_terms_at', '')::timestamptz,
    nullif(new.raw_user_meta_data ->> 'consent_privacy_at', '')::timestamptz
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (new.id, 'profile_created', 'profiles', new.id::text, jsonb_build_object('role', v_role));

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Função RPC para exclusão segura da conta pelo próprio utilizador
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

-- RLS obrigatória em todas as tabelas
alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.routes enable row level security;

-- Políticas de profiles: utilizador só vê e atualiza o próprio perfil (sem alterar role/account_status)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
on public.profiles for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (
  auth.uid() = id
  and role = (select p.role from public.profiles p where p.id = auth.uid())
  and account_status = (select p.account_status from public.profiles p where p.id = auth.uid())
);

-- Políticas de audit_logs: apenas leitura pelo próprio ator ou admin; nunca editável pelo cliente
drop policy if exists "audit_logs_select_own" on public.audit_logs;
create policy "audit_logs_select_own"
on public.audit_logs for select
using (
  actor_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- Corredores ativos visíveis para utilizadores autenticados
drop policy if exists "routes_select_active" on public.routes;
create policy "routes_select_active"
on public.routes for select
using (is_active = true);

-- Bucket privado para fotografias de perfil (URL assinada de curta duração)
insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', false)
on conflict (id) do nothing;

drop policy if exists "avatars_select_own" on storage.objects;
create policy "avatars_select_own"
on storage.objects for select
using (
  bucket_id = 'profile-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'profile-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
on storage.objects for update
using (
  bucket_id = 'profile-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
