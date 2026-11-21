import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readAppConfig } from '../../constants/config';
import { supabaseAuthStorage } from './deviceStorage';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = readAppConfig();
  if (!config.isSupabaseConfigured) {
    return null;
  }
  if (cachedClient && cachedUrl === config.supabaseUrl) {
    return cachedClient;
  }
  cachedUrl = config.supabaseUrl;
  cachedClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      storage: supabaseAuthStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: typeof document !== 'undefined',
    },
  });
  return cachedClient;
}

export function getIntegrationReadiness() {
  const config = readAppConfig();
  return {
    supabaseConfigured: config.isSupabaseConfigured,
    mapsConfigured: config.mapsApiKeyConfigured,
    mapsProvider: config.mapsProvider,
    notificationsConfigured: config.isNotificationsConfigured,
  };
}
