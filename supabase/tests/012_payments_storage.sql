-- Testes SQL da migration 012
begin;
select plan(1);

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'mark_payment_paid'
  ) then
    raise exception 'RPC mark_payment_paid não existe';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'profile-avatars'
      and public = false
      and file_size_limit = 2097152
      and allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']
  ) then
    raise exception 'Bucket profile-avatars não está limitado corretamente';
  end if;
end $$;

select pass('Migration 012: verificações estruturais concluídas');
select * from finish();
rollback;
