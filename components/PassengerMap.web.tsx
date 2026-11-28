import { StyleSheet, View, Text, Platform, useWindowDimensions } from 'react-native';
import { KAMBAGO_COLORS } from '../constants/theme';
import { readAppConfig } from '../constants/config';
import { ptAO } from '../locales/pt-AO';

export interface PassengerMapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export default function PassengerMapWeb({
  region,
  showMarker,
}: {
  region: PassengerMapRegion;
  showMarker: boolean;
}) {
  const config = readAppConfig();
  const { width, height } = useWindowDimensions();
  const isConfigured = config.mapsApiKeyConfigured;

  if (!isConfigured) {
    return (
      <View style={styles.container}>
        <View style={styles.pendingCard}>
          <Text style={styles.pendingTitle}>{ptAO.setupStatus.mapsMissing}</Text>
          <Text style={styles.pendingText}>
            {'Configure EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ou EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN '}
            {'no ficheiro .env.local para ativar o mapa na Web.'}
          </Text>
        </View>
      </View>
    );
  }

  // O mapa real só é renderizado no navegador (web). No Android usa-se o ficheiro .native.tsx.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const MapComponent = require('./PassengerMapWebMap').default;

  return (
    <View style={[styles.container, { width, height }]}>
      <MapComponent
        region={region}
        showMarker={showMarker}
        mapsProvider={config.mapsProvider}
        mapsApiKey={
          config.mapsProvider === 'mapbox'
            ? process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN ?? ''
            : process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: KAMBAGO_COLORS.surfaceMuted,
  },
  pendingCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: KAMBAGO_COLORS.surfaceMuted,
    padding: 24,
  },
  pendingTitle: {
    color: KAMBAGO_COLORS.textPrimary,
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  pendingText: {
    color: KAMBAGO_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 14,
  },
});
