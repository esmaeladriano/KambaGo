begin;
select plan(4);

select has_table('public', 'profiles', 'Tabela profiles existe');

select has_trigger(
  'auth',
  'users',
  'trg_create_profile_after_email_confirmation',
  'Trigger cria perfil na confirmação de e-mail'
);

do $$
declare
  v_id uuid := 'b1130000-0000-4000-8000-000000000013';
begin
  insert into auth.users (
    id,
    email,
    raw_user_meta_data,
    email_confirmed_at
  ) values (
    v_id,
    'pending-profile-013@kambago.ao',
    '{"role":"passenger","full_name":"Perfil Confirmado"}'::jsonb,
    null
  )
  on conflict (id) do update set email_confirmed_at = null;

  if exists (select 1 from public.profiles where id = v_id) then
    raise exception 'Perfil foi criado antes da confirmação';
  end if;

  update auth.users
  set email_confirmed_at = now()
  where id = v_id;

  if not exists (
    select 1
    from public.profiles
    where id = v_id
      and email_verified = true
      and account_status = 'ativa'
  ) then
    raise exception 'Perfil não foi criado após confirmação';
  end if;
end $$;

select ok(
  not exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where u.email_confirmed_at is null
  ),
  'Não existem perfis operacionais para utilizadores não confirmados'
);

select is(
  (select count(*) from public.profiles where id = 'b1130000-0000-4000-8000-000000000013'),
  1::bigint,
  'Perfil confirmado é criado uma única vez'
);

select * from finish();
rollback;
