-- KambaGo - Migration 016: RPC de ganhos do motorista
-- Não altera nem substitui as migrations 001 a 015.
-- Adiciona fetch_driver_earnings() para calcular ganhos confirmados
-- apenas de pagamentos pertencentes a viagens do motorista autenticado.

drop function if exists public.fetch_driver_earnings();
create or replace function public.fetch_driver_earnings()
returns table (
  total_kz integer,
  payments_count integer,
  pending_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  return query
  select
    coalesce(sum(case when p.status = 'pago' then p.amount_kz else 0 end), 0) as total_kz,
    coalesce(count(*) filter (where p.status = 'pago'), 0) as payments_count,
    coalesce(count(*) filter (where p.status = 'pendente'), 0) as pending_count
  from public.payments p
  join public.trips t on t.id = p.trip_id
  where t.driver_id = v_uid;
end;
$$;

revoke all on function public.fetch_driver_earnings() from public, anon;
grant execute on function public.fetch_driver_earnings() to authenticated;

-- Índice para acelerar consulta de ganhos por motorista
create index if not exists idx_payments_trip_status on public.payments(trip_id, status);