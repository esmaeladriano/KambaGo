import { getSupabaseClient } from '../supabase/client';

export interface AvailableTrip {
  id: string;
  origin_name: string;
  destination_name: string;
  available_seats: number;
  total_estimated_kz: number;
  status: string;
}

interface DiscoverAvailableTripRow {
  trip_id: string;
  origin_name: string;
  destination_name: string;
  available_seats: number;
  estimated_fare_kz: number;
  status: string;
}

export async function fetchAvailableTrips(): Promise<{
  ok: boolean;
  trips: AvailableTrip[];
  message?: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, trips: [], message: 'Supabase não configurado.' };
  }

  const { data, error } = await supabase.rpc('discover_available_trips');

  if (error) {
    return { ok: false, trips: [], message: error.message };
  }

  return {
    ok: true,
    trips: ((data ?? []) as DiscoverAvailableTripRow[]).map((trip) => ({
      id: trip.trip_id,
      origin_name: trip.origin_name,
      destination_name: trip.destination_name,
      available_seats: trip.available_seats,
      total_estimated_kz: trip.estimated_fare_kz,
      status: trip.status,
    })),
  };
}

export async function requestSharedTrip(
  tripId: string,
  destinationName: string
): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, message: 'Supabase não configurado.' };
  }

  const { error } = await supabase.rpc('request_shared_trip', {
    p_trip_id: tripId,
    p_destination_name: destinationName,
    p_seats_requested: 1,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: 'Solicitação enviada ao motorista.' };
}

export async function setDriverAvailability(
  available: boolean
): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, message: 'Supabase não configurado.' };
  }

  const { error } = await supabase.rpc('set_driver_availability', {
    p_available: available,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message: available ? 'Disponibilidade ativada.' : 'Disponibilidade desativada.',
  };
}
