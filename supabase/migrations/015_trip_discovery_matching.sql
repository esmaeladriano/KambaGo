-- KambaGo - Migration 015: descoberta de viagens com correspondência real de rota
-- Não altera nem substitui as migrations 001 a 014.
-- Adiciona parâmetros de origem/destino à RPC discover_available_trips() para
-- permitir pesquisa real de viagens compatíveis com a intenção do passageiro.

-- Função auxiliar de normalização de texto para comparação de localidades.
-- Remove acentos, espaços extras e converte para minúsculas.
create or replace function public.normalize_place_name(p_text text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_result text;
begin
  -- Converte para minúsculas, remove espaços extras nas pontas
  v_result := lower(trim(coalesce(p_text, '')));
  -- Remove acentos comuns (abordagem simples, sem depender de extensões)
  v_result := regexp_replace(v_result, '[áàâãä]', 'a', 'g');
  v_result := regexp_replace(v_result, '[éèêë]', 'e', 'g');
  v_result := regexp_replace(v_result, '[íìîï]', 'i', 'g');
  v_result := regexp_replace(v_result, '[óòôõö]', 'o', 'g');
  v_result := regexp_replace(v_result, '[úùûü]', 'u', 'g');
  v_result := regexp_replace(v_result, '[ç]', 'c', 'g');
  -- Colapsa espaços múltiplos em um só
  v_result := regexp_replace(v_result, '\s+', ' ', 'g');
  return v_result;
end;
$$;

-- Atualiza discover_available_trips para aceitar origem e destino opcionais.
-- Quando fornecidos, filtra viagens cuja origem/destino sejam compatíveis
-- (normalização de nomes e/ou proximidade de coordenadas).
drop function if exists public.discover_available_trips(text, text);
create or replace function public.discover_available_trips(
  p_origin text default null,
  p_destination text default null
)
returns table (
  trip_id uuid,
  origin_name text,
  destination_name text,
  available_seats integer,
  estimated_fare_kz integer,
  status public.trip_status,
  driver_id uuid,
  driver_name text,
  vehicle_plate text,
  vehicle_brand text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_origin_norm text;
  v_dest_norm text;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.';
  end if;

  v_origin_norm := public.normalize_place_name(p_origin);
  v_dest_norm := public.normalize_place_name(p_destination);

  return query
  select
    t.id,
    t.origin_name,
    t.destination_name,
    t.available_seats,
    t.total_estimated_kz,
    t.status,
    t.driver_id,
    p.full_name as driver_name,
    v.plate as vehicle_plate,
    v.brand as vehicle_brand
  from public.trips t
  left join public.profiles p on p.id = t.driver_id
  left join public.vehicles v on v.id = t.vehicle_id
  where t.status = 'solicitada'
    and t.available_seats > 0
    -- Apenas motoristas ativos e aprovados (veículo verificado)
    and p.account_status = 'ativa'
    and v.is_verified = true
    and (
      -- Sem filtros de origem/destino: devolve todas as viagens disponíveis
      (p_origin is null and p_destination is null)
      or
      -- Filtro por origem e destino (correspondência por nome normalizado)
      (
        p_origin is not null
        and p_destination is not null
        and public.normalize_place_name(t.origin_name) = v_origin_norm
        and public.normalize_place_name(t.destination_name) = v_dest_norm
      )
      or
      -- Filtro apenas por origem
      (
        p_origin is not null
        and p_destination is null
        and public.normalize_place_name(t.origin_name) = v_origin_norm
      )
      or
      -- Filtro apenas por destino
      (
        p_origin is null
        and p_destination is not null
        and public.normalize_place_name(t.destination_name) = v_dest_norm
      )
    )
  order by t.created_at desc;
end;
$$;

revoke all on function public.discover_available_trips(text, text) from public, anon;
grant execute on function public.discover_available_trips(text, text) to authenticated;