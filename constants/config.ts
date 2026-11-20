import type { MapsProviderName, SmsProviderName } from '../types/auth';

export interface AppRuntimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isSupabaseConfigured: boolean;
  mapsProvider: MapsProviderName;
  mapsApiKeyConfigured: boolean;
  smsProvider: SmsProviderName;
  isSmsConfigured: boolean;
  appEnv: 'development' | 'staging' | 'production';
}

export const DEFAULT_CORRIDOR_CONFIG = {
  code: 'zango-mutamba',
  originName: 'Zango',
  destinationName: 'Mutamba',
  maxDetourMeters: 1000,
  destinationToleranceMeters: 500,
  searchRadiusMeters: 2000,
  minTripFareKz: 1000,
  maxTripFareKz: 12000,
  freeCancelMinutesAfterBooking: 5,
  freeCancelMinutesBeforePickup: 15,
  lateCancelFeeKz: 200,
  driverCancelPassengerFeeKz: 0,
  driverLocationIntervalMs: 12000,
  autocompleteDebounceMs: 500,
  autocompleteMinChars: 3,
} as const;

function readEnvValue(keys: string[]): string {
  const metaEnv =
    typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ? (import.meta as unknown as { env: Record<string, string | undefined> }).env
      : undefined;

  const procEnv = typeof process !== 'undefined' && process.env ? process.env : undefined;

  for (const key of keys) {
    const fromMeta = metaEnv?.[key];
    if (typeof fromMeta === 'string' && fromMeta.trim().length > 0) {
      return fromMeta.trim();
    }
    const fromProc = procEnv?.[key];
    if (typeof fromProc === 'string' && fromProc.trim().length > 0) {
      return fromProc.trim();
    }
  }
  return '';
}

export function readAppConfig(): AppRuntimeConfig {
  const supabaseUrl = readEnvValue(['EXPO_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL']);
  const supabaseAnonKey = readEnvValue(['EXPO_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY']);
  const rawMapsProvider = readEnvValue(['EXPO_PUBLIC_MAPS_PROVIDER', 'VITE_MAPS_PROVIDER']);
  const mapsProvider: MapsProviderName = rawMapsProvider === 'mapbox' ? 'mapbox' : 'google';

  const mapsKey =
    mapsProvider === 'mapbox'
      ? readEnvValue(['EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN', 'VITE_MAPBOX_PUBLIC_TOKEN'])
      : readEnvValue(['EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', 'VITE_GOOGLE_MAPS_API_KEY']);

  const rawSmsProvider = readEnvValue(['EXPO_PUBLIC_SMS_PROVIDER', 'SMS_PROVIDER']);
  const smsProvider: SmsProviderName =
    rawSmsProvider === 'twilio' || rawSmsProvider === 'africastalking' ? rawSmsProvider : 'pending';

  const rawEnv = readEnvValue(['EXPO_PUBLIC_APP_ENV', 'NODE_ENV']);
  const appEnv =
    rawEnv === 'production' || rawEnv === 'staging' ? rawEnv : 'development';

  return {
    supabaseUrl,
    supabaseAnonKey,
    isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
    mapsProvider,
    mapsApiKeyConfigured: Boolean(mapsKey),
    smsProvider,
    isSmsConfigured: smsProvider !== 'pending',
    appEnv,
  };
}
