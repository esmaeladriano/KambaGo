-- KambaGo - Migration 007: táxi partilhado
-- Não altera nem substitui as migrations 001 a 006.

create type public.trip_status as enum (
  'solicitada',
  'aceite',
  'a_caminho',
  'embarque',
  'em_andamento',
  'concluida',
  'cancelada'
);

create type public.trip_request_status as enum (
  'pendente',
  'aceite',
  'rejeitada',
  'cancelada'
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  plate text not null unique,
  brand text not null,
  model text,
  color text,
  legal_capacity integer not null check (legal_capacity between 1 and 20),
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.profiles(id),
  vehicle_id uuid references public.vehicles(id),
  status public.trip_status not null default 'solicitada',
  origin_name text not null,
  origin_lat double precision not null,
  origin_lng double precision not null,
  destination_name text not null,
  destination_lat double precision not null,
  destination_lng double precision not null,
  max_detour_meters integer not null default 1000,
  total_estimated_kz integer not null default 0 check (total_estimated_kz >= 0),
  available_seats integer not null default 0 check (available_seats >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  passenger_id uuid references public.profiles(id),
  stop_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  sequence integer not null check (sequence >= 1),
  unique(trip_id, sequence)
);

create table if not exists public.trip_requests (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  status public.trip_request_status not null default 'pendente',
  seats_requested integer not null default 1 check (seats_requested between 1 and 20),
  origin_name text,
  destination_name text,
  estimated_fare_kz integer check (estimated_fare_kz >= 0),
  created_at timestamptz not null default now(),
  unique(trip_id, passenger_id)
);

create table if not exists public.trip_passengers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  seats integer not null default 1 check (seats between 1 and 20),
  individual_fare_kz integer not null default 0 check (individual_fare_kz >= 0),
  boarded_at timestamptz,
  dropped_off_at timestamptz,
  unique(trip_id, passenger_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  amount_kz integer not null check (amount_kz >= 0),
  method text not null default 'presencial',
  status text not null default 'pendente',
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_trips_status on public.trips(status);
create index if not exists idx_trips_driver on public.trips(driver_id);
create index if not exists idx_trip_requests_trip on public.trip_requests(trip_id);
create index if not exists idx_trip_passengers_trip on public.trip_passengers(trip_id);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);

alter table public.vehicles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_stops enable row level security;
alter table public.trip_requests enable row level security;
alter table public.trip_passengers enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.saved_places enable row level security;

drop policy if exists "trips_select_discovery" on public.trips;
create policy "trips_select_discovery"
on public.trips for select
to authenticated
using (status = 'solicitada');

drop policy if exists "trips_select_active" on public.trips;
create policy "trips_select_active"
on public.trips for select
to authenticated
using (
  status in ('solicitada', 'aceite', 'a_caminho', 'embarque', 'em_andamento')
  and (
    driver_id = auth.uid()
    or exists (
      select 1
      from public.trip_passengers tp
      where tp.trip_id = trips.id
        and tp.passenger_id = auth.uid()
    )
  )
);

drop policy if exists "trip_requests_own" on public.trip_requests;
create policy "trip_requests_own"
on public.trip_requests for all
to authenticated
using (passenger_id = auth.uid())
with check (passenger_id = auth.uid());

drop policy if exists "trip_passengers_own" on public.trip_passengers;
create policy "trip_passengers_own"
on public.trip_passengers for select
to authenticated
using (
  passenger_id = auth.uid()
  or exists (
    select 1 from public.trips t
    where t.id = trip_passengers.trip_id
      and t.driver_id = auth.uid()
  )
);

drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own"
on public.notifications for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "saved_places_own" on public.saved_places;
create policy "saved_places_own"
on public.saved_places for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
