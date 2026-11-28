import { getSupabaseClient } from '../supabase/client';

export interface PendingDriver {
  id: string;
  full_name: string;
  email: string | null;
  account_status: string;
}

export interface PendingVehicle {
  id: string;
  driver_id: string;
  plate: string;
  brand: string;
  model: string | null;
  is_verified: boolean;
}

export interface AdminUser {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  account_status: string;
  is_available: boolean;
  created_at: string;
}

export interface AdminTrip {
  id: string;
  driver_id: string;
  status: string;
  origin_name: string;
  destination_name: string;
  total_estimated_kz: number;
  available_seats: number;
  created_at: string;
}

export interface AdminStats {
  totalUsers: number;
  totalDrivers: number;
  totalPassengers: number;
  totalTrips: number;
  totalRequests: number;
  totalEarningsKz: number;
}

export async function fetchAdminQueue(): Promise<{
  ok: boolean;
  drivers: PendingDriver[];
  vehicles: PendingVehicle[];
  message?: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, drivers: [], vehicles: [], message: 'Supabase não configurado.' };
  }

  const [driversResult, vehiclesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,full_name,email,account_status')
      .eq('role', 'driver')
      .eq('account_status', 'pendente'),
    supabase
      .from('vehicles')
      .select('id,driver_id,plate,brand,model,is_verified')
      .eq('is_verified', false),
  ]);

  if (driversResult.error || vehiclesResult.error) {
    return {
      ok: false,
      drivers: [],
      vehicles: [],
      message: driversResult.error?.message ?? vehiclesResult.error?.message,
    };
  }

  return {
    ok: true,
    drivers: (driversResult.data ?? []) as PendingDriver[],
    vehicles: (vehiclesResult.data ?? []) as PendingVehicle[],
  };
}

export async function fetchAdminUsers(): Promise<{
  ok: boolean;
  users: AdminUser[];
  message?: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, users: [], message: 'Supabase não configurado.' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,email,phone,role,account_status,is_available,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return { ok: false, users: [], message: error.message };
  }

  return { ok: true, users: (data ?? []) as AdminUser[] };
}

export async function fetchAdminTrips(): Promise<{
  ok: boolean;
  trips: AdminTrip[];
  message?: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, trips: [], message: 'Supabase não configurado.' };
  }

  const { data, error } = await supabase
    .from('trips')
    .select('id,driver_id,status,origin_name,destination_name,total_estimated_kz,available_seats,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return { ok: false, trips: [], message: error.message };
  }

  return { ok: true, trips: (data ?? []) as AdminTrip[] };
}

export async function fetchAdminStats(): Promise<{
  ok: boolean;
  stats: AdminStats;
  message?: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      stats: { totalUsers: 0, totalDrivers: 0, totalPassengers: 0, totalTrips: 0, totalRequests: 0, totalEarningsKz: 0 },
      message: 'Supabase não configurado.',
    };
  }

  const [usersResult, driversResult, passengersResult, tripsResult, requestsResult, earningsResult] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'driver'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'passenger'),
    supabase.from('trips').select('id', { count: 'exact', head: true }),
    supabase.from('trip_requests').select('id', { count: 'exact', head: true }),
    supabase.rpc('fetch_driver_earnings'),
  ]);

  if (usersResult.error || driversResult.error || passengersResult.error || tripsResult.error || requestsResult.error) {
    return {
      ok: false,
      stats: { totalUsers: 0, totalDrivers: 0, totalPassengers: 0, totalTrips: 0, totalRequests: 0, totalEarningsKz: 0 },
      message: usersResult.error?.message ?? driversResult.error?.message ?? passengersResult.error?.message ?? tripsResult.error?.message ?? requestsResult.error?.message,
    };
  }

  const earningsRow = (earningsResult.data ?? [])[0] as { total_kz: number } | undefined;

  return {
    ok: true,
    stats: {
      totalUsers: usersResult.count ?? 0,
      totalDrivers: driversResult.count ?? 0,
      totalPassengers: passengersResult.count ?? 0,
      totalTrips: tripsResult.count ?? 0,
      totalRequests: requestsResult.count ?? 0,
      totalEarningsKz: earningsRow?.total_kz ?? 0,
    },
  };
}

export async function approveDriver(id: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Supabase não configurado.' };
  const { error } = await supabase.rpc('approve_driver', { p_driver_id: id });
  return error ? { ok: false, message: error.message } : { ok: true, message: 'Motorista aprovado.' };
}

export async function rejectDriver(id: string, reason: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Supabase não configurado.' };
  const { error } = await supabase.rpc('reject_driver', { p_driver_id: id, p_reason: reason });
  return error ? { ok: false, message: error.message } : { ok: true, message: 'Motorista rejeitado.' };
}

export async function approveVehicle(id: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Supabase não configurado.' };
  const { error } = await supabase.rpc('approve_vehicle', { p_vehicle_id: id });
  return error ? { ok: false, message: error.message } : { ok: true, message: 'Veículo aprovado.' };
}

export async function rejectVehicle(id: string, reason: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Supabase não configurado.' };
  const { error } = await supabase.rpc('reject_vehicle', { p_vehicle_id: id, p_reason: reason });
  return error ? { ok: false, message: error.message } : { ok: true, message: 'Veículo rejeitado.' };
}

export async function suspendAccount(id: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Supabase não configurado.' };
  const { error } = await supabase.rpc('set_account_status_admin', {
    p_user_id: id,
    p_status: 'suspensa',
  });
  return error ? { ok: false, message: error.message } : { ok: true, message: 'Conta suspensa.' };
}

export async function reactivateAccount(id: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, message: 'Supabase não configurado.' };
  const { error } = await supabase.rpc('set_account_status_admin', {
    p_user_id: id,
    p_status: 'ativa',
  });
  return error ? { ok: false, message: error.message } : { ok: true, message: 'Conta reativada.' };
}
