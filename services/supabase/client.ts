import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readAppConfig } from '../../constants/config';

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
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return cachedClient;
}

export function getIntegrationReadiness() {
  const config = readAppConfig();
  return {
    supabaseConfigured: config.isSupabaseConfigured,
    smsConfigured: config.isSmsConfigured,
    smsProvider: config.smsProvider,
    mapsConfigured: config.mapsApiKeyConfigured,
    mapsProvider: config.mapsProvider,
    notificationsConfigured: false,
  };
}
