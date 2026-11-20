import { readAppConfig } from '../../constants/config';
import { ptAO } from '../../locales/pt-AO';
import type { MapsProviderName } from '../../types/auth';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RouteSummary {
  distanceMeters: number;
  durationSeconds: number;
  polyline: LatLng[];
  cached: boolean;
}

export interface AddressSuggestion {
  id: string;
  label: string;
  coordinates: LatLng;
}

export interface MapsProvider {
  readonly providerName: MapsProviderName;
  readonly isConfigured: boolean;
  autocompleteAddress(query: string): Promise<{
    ok: boolean;
    pendingConfig?: boolean;
    message?: string;
    suggestions: AddressSuggestion[];
  }>;
  estimateRoute(origin: LatLng, destination: LatLng): Promise<{
    ok: boolean;
    pendingConfig?: boolean;
    message?: string;
    route?: RouteSummary;
  }>;
}

class UnconfiguredMapsProvider implements MapsProvider {
  constructor(readonly providerName: MapsProviderName) {}
  readonly isConfigured = false;

  async autocompleteAddress() {
    return {
      ok: false,
      pendingConfig: true,
      message: ptAO.setupStatus.mapsMissing,
      suggestions: [],
    };
  }

  async estimateRoute() {
    return {
      ok: false,
      pendingConfig: true,
      message: ptAO.setupStatus.mapsMissing,
    };
  }
}

export function getMapsProvider(): MapsProvider {
  const config = readAppConfig();
  // pendente Etapa 3: ligar implementação concreta de Google Maps / Mapbox quando a chave estiver ativa
  return new UnconfiguredMapsProvider(config.mapsProvider);
}
