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

export async function createTrip(
  origin: string,
  destination: string,
  totalFareKz: number,
  seats: number
): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Supabase não configurado.' };

  const { error } = await supabase.rpc('create_trip', {
    origin,
    destination,
    total_fare_kz: totalFareKz,
    seats,
  });
  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: 'Viagem criada.' };
}

export async function startTrip(tripId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Supabase não configurado.' };
  const { error } = await supabase.rpc('start_trip', { p_trip_id: tripId });
  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: 'Viagem iniciada.' };
}

export async function completeTrip(tripId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Supabase não configurado.' };
  const { error } = await supabase.rpc('complete_trip', { p_trip_id: tripId });
  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: 'Viagem concluída.' };
}

export async function cancelTrip(tripId: string, reason: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Supabase não configurado.' };
  const { error } = await supabase.rpc('cancel_trip', {
    p_trip_id: tripId,
    p_reason: reason,
  });
  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: 'Viagem cancelada.' };
}

export async function acceptTripRequest(requestId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Supabase não configurado.' };
  const { error } = await supabase.rpc('accept_trip_request', { p_request_id: requestId });
  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: 'Pedido aceite.' };
}

export async function rejectTripRequest(requestId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Supabase não configurado.' };
  const { error } = await supabase.rpc('reject_trip_request', { p_request_id: requestId });
  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: 'Pedido rejeitado.' };
}

export async function cancelMyTripRequest(requestId: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Supabase não configurado.' };
  const { error } = await supabase.rpc('cancel_my_trip_request', { p_request_id: requestId });
  return error
    ? { ok: false, message: error.message }
    : { ok: true, message: 'Pedido cancelado.' };
}

export interface PaidEarnings {
  totalKz: number;
  paymentsCount: number;
}

export async function fetchPaidEarnings(): Promise<{
  ok: boolean;
  earnings: PaidEarnings;
  message?: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, earnings: { totalKz: 0, paymentsCount: 0 }, message: 'Supabase não configurado.' };
  }

  const { data, error } = await supabase
    .from('payments')
    .select('amount_kz,status')
    .eq('status', 'pago');

  if (error) {
    return { ok: false, earnings: { totalKz: 0, paymentsCount: 0 }, message: error.message };
  }

  const payments = (data ?? []) as Array<{ amount_kz: number; status: string }>;
  return {
    ok: true,
    earnings: {
      totalKz: payments.reduce((sum, payment) => sum + payment.amount_kz, 0),
      paymentsCount: payments.length,
    },
  };
}

export interface TripRequestRow {
  id: string;
  trip_id: string;
  passenger_id: string;
  status: string;
  seats_requested: number;
  destination_name: string | null;
  created_at: string;
}

export async function fetchMyTripRequests(): Promise<{
  ok: boolean;
  requests: TripRequestRow[];
  message?: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, requests: [], message: 'Supabase não configurado.' };
  const { data, error } = await supabase
    .from('trip_requests')
    .select('id,trip_id,passenger_id,status,seats_requested,destination_name,created_at')
    .order('created_at', { ascending: false });
  if (error) return { ok: false, requests: [], message: error.message };
  return { ok: true, requests: (data ?? []) as TripRequestRow[] };
}
