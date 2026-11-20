-- Seed de desenvolvimento apenas (não executar com dados fictícios em produção)
-- Corredor inicial configurável: Zango -> Mutamba (Luanda, Angola)

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
  max_detour_meters = excluded.max_detour_meters,
  destination_tolerance_meters = excluded.destination_tolerance_meters,
  search_radius_meters = excluded.search_radius_meters,
  is_active = excluded.is_active;
