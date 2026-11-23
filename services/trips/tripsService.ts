import { getSupabaseClient } from '../supabase/client';

export interface AvailableTrip {
  id: string;
  origin_name: string;
  destination_name: string;
  available_seats: number;
  total_estimated_kz: number;
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

  const { data, error } = await supabase
    .from('trips')
    .select('id, origin_name, destination_name, available_seats, total_estimated_kz, status')
    .eq('status', 'solicitada')
    .gt('available_seats', 0)
    .order('created_at', { ascending: false });

  if (error) {
    return { ok: false, trips: [], message: error.message };
  }

  return {
    ok: true,
    trips: (data ?? []) as AvailableTrip[],
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

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { ok: false, message: 'Sessão expirada. Inicia sessão novamente.' };
  }

  const { error } = await supabase.from('trip_requests').insert({
    trip_id: tripId,
    passenger_id: userData.user.id,
    destination_name: destinationName,
    status: 'pendente',
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: 'Solicitação enviada ao motorista.' };
}
