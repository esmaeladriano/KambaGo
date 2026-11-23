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
