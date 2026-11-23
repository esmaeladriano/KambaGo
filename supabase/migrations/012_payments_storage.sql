-- KambaGo - Migration 012: pagamentos e armazenamento
-- Não altera as migrations 001 a 011.

drop function if exists public.mark_payment_paid(uuid);
create or replace function public.mark_payment_paid(p_payment_id uuid)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_payment public.payments;
  v_trip public.trips;
begin
  if v_uid is null then raise exception 'Autenticação obrigatória.'; end if;

  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then raise exception 'Pagamento não encontrado.'; end if;

  select * into v_trip
  from public.trips
  where id = v_payment.trip_id;

  if v_trip.driver_id <> v_uid then
    raise exception 'Apenas o motorista da viagem pode confirmar o pagamento.';
  end if;
  if v_payment.method <> 'dinheiro' then
    raise exception 'Métodos electrónicos não estão disponíveis.';
  end if;
  if v_payment.status <> 'pendente' then
    raise exception 'O pagamento já não está pendente.';
  end if;

  update public.payments
     set status = 'pago'
   where id = p_payment_id
  returning * into v_payment;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_uid,
    'payment_marked_paid',
    'payments',
    p_payment_id::text,
    jsonb_build_object('trip_id', v_payment.trip_id, 'amount_kz', v_payment.amount_kz)
  );

  return v_payment;
end;
$$;

revoke all on function public.mark_payment_paid(uuid) from public, anon;
grant execute on function public.mark_payment_paid(uuid) to authenticated;

alter table public.payments
  add column if not exists method_status text not null default 'disponivel';

update public.payments
   set method_status = 'nao_disponivel'
 where method not in ('dinheiro');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
