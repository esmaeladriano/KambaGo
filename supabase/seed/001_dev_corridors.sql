-- Seed de desenvolvimento apenas (não executar com dados fictícios em produção)
-- Corredor inicial configurável: Zango -> Mutamba (Luanda, Angola) e regras de tarifa

with upserted_route as (
  insert into public.routes (
    code,
    origin_name,
    destination_name,
    origin_lat,
    origin_lng,
    destination_lat,
    destination_lng,
    max_detour_meters,
    destination_tolerance_meters,
    search_radius_meters,
    is_active
  ) values (
    'zango-mutamba',
    'Zango',
    'Mutamba',
    -8.9936,
    13.3688,
    -8.8147,
    13.2302,
    1000,
    500,
    2000,
    true
  )
  on conflict (code) do update set
    origin_name = excluded.origin_name,
    destination_name = excluded.destination_name,
    max_detour_meters = excluded.max_detour_meters,
    destination_tolerance_meters = excluded.destination_tolerance_meters,
    search_radius_meters = excluded.search_radius_meters,
    is_active = excluded.is_active
  returning id
)
insert into public.fare_rules (
  route_id,
  min_fare_kz,
  max_fare_kz,
  free_cancel_minutes_after_booking,
  free_cancel_minutes_before_pickup,
  late_cancel_fee_kz,
  driver_cancel_passenger_fee_kz,
  is_active
)
select
  id,
  1000,
  12000,
  5,
  15,
  200,
  0,
  true
from upserted_route
on conflict (route_id) do update set
  min_fare_kz = excluded.min_fare_kz,
  max_fare_kz = excluded.max_fare_kz,
  free_cancel_minutes_after_booking = excluded.free_cancel_minutes_after_booking,
  free_cancel_minutes_before_pickup = excluded.free_cancel_minutes_before_pickup,
  late_cancel_fee_kz = excluded.late_cancel_fee_kz,
  driver_cancel_passenger_fee_kz = excluded.driver_cancel_passenger_fee_kz,
  is_active = excluded.is_active;
