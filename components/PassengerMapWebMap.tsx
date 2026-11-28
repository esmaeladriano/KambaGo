/**
 * PassengerMapWebMap — Mapa real para Web (MapLibre GL JS via react-map-gl).
 *
 * Só é importado pelo PassengerMap.web.tsx, ou seja, apenas no navegador.
 * No Android/iOS usa-se o PassengerMap.native.tsx (react-native-maps).
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, useWindowDimensions } from 'react-native';
import Map, { Marker, type NavigationControlPosition } from 'react-map-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { KAMBAGO_COLORS } from '../constants/theme';

export interface PassengerMapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface Props {
  region: PassengerMapRegion;
  showMarker: boolean;
  mapsProvider: 'google' | 'mapbox';
  mapsApiKey: string;
}

const DEFAULT_STYLE_URL =
  'https://demotiles.maplibre.org/style.json'; // estilo livre sem chave (fallback visual)

function styleUrlForProvider(provider: 'google' | 'mapbox', apiKey: string): string {
  // Se não houver chave de API, usamos o estilo livre do MapLibre (sem token).
  // Com chave do Mapbox, pode-se usar um estilo personalizado da conta do utilizador.
  if (provider === 'mapbox' && apiKey.trim().length > 0) {
    return `mapbox://styles/mapbox/streets-v11`;
  }
  if (provider === 'google' && apiKey.trim().length > 0) {
    // react-map-gl não consome diretamente API Key do Google; manteremos o estilo MapLibre
    // e documentamos que a chave do Google é necessária para serviços de geocodificação/rota.
    return DEFAULT_STYLE_URL;
  }
  return DEFAULT_STYLE_URL;
}

export default function PassengerMapWebMap({
  region,
  showMarker,
  mapsProvider,
  mapsApiKey,
}: Props) {
  const { width, height } = useWindowDimensions();
  const mapRef = useRef<any>(null);
  const [styleSet, setStyleSet] = useState(false);

  const styleUrl = styleUrlForProvider(mapsProvider, mapsApiKey);

  // Ajusta o viewport com base na latitudeDelta/longitudeDelta da região.
  const zoom = useZoomFromDelta(region.latitudeDelta, region.longitudeDelta);

  useEffect(() => {
    // Quando a chave/styles mudam, força re-render do estilo no mapa.
    setStyleSet((prev) => !prev);
  }, [mapsProvider, mapsApiKey]);

  if (width === 0 || height === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Map
        ref={mapRef}
        style={{ width: width, height: height }}
        initialViewState={{
          longitude: region.longitude,
          latitude: region.latitude,
          zoom,
        }}
        mapStyle={styleUrl}
        maplibre={{ styleOverride: { styleSet } }}
      >
        {showMarker && (
          <Marker
            longitude={region.longitude}
            latitude={region.latitude}
            color={KAMBAGO_COLORS.tealDark}
          />
        )}
      </Map>
      <View style={styles.attribution}>
        <Text style={styles.attributionText}>
          {mapsProvider === 'mapbox'
            ? 'Mapas MapLibre / Mapbox Streets'
            : 'Mapas MapLibre (estilo livre)'}
        </Text>
      </View>
    </View>
  );
}

// Converte latitudeDelta/longitudeDelta num nível de zoom aproximado.
function useZoomFromDelta(latDelta: number, lngDelta: number): number {
  const delta = Math.max(latDelta, lngDelta);
  if (delta >= 1) return 10;
  if (delta >= 0.5) return 11;
  if (delta >= 0.25) return 12;
  if (delta >= 0.1) return 13;
  return 14;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: KAMBAGO_COLORS.surfaceMuted,
  },
  attribution: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  attributionText: {
    color: KAMBAGO_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
});