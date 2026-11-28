import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import {
  fetchAvailableTrips,
  requestSharedTrip,
  type AvailableTrip,
  type TripSearchParams,
} from '../../services/trips/tripsService';
import { getIntegrationReadiness } from '../../services/supabase/client';
import PassengerMap, { type PassengerMapRegion } from '../../components/PassengerMap';
import { formatKz } from '../../utils/accountState';

const LUANDA_REGION: PassengerMapRegion = {
  latitude: -8.8383,
  longitude: 13.2344,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function PassengerHomeScreen() {
  const profile = useAuthStore((state) => state.profile);
  const readiness = getIntegrationReadiness();
  const [region, setRegion] = useState<PassengerMapRegion>(LUANDA_REGION);
  const [origin, setOrigin] = useState('A minha localização');
  const [destination, setDestination] = useState('');
  const [trips, setTrips] = useState<AvailableTrip[]>([]);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [seatsToRequest, setSeatsToRequest] = useState(1);
  const swapLocations = () => {
    setOrigin(destination || 'A minha localização');
    setDestination(origin === 'A minha localização' ? '' : origin);
  };

  useEffect(() => {
    void (async () => {
      if (Platform.OS === 'web') return;
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      });
    })();
  }, []);

  const searchTrips = async () => {
    const searchParams: TripSearchParams = {};
    if (origin.trim() && origin !== 'A minha localização') {
      searchParams.origin = origin;
    }
    if (destination.trim()) {
      searchParams.destination = destination;
    }

    setLoading(true);
    const result = await fetchAvailableTrips(searchParams);
    setTrips(result.trips);
    setFeedback(
      result.ok
        ? result.trips.length
          ? `${result.trips.length} viagem(ns) compatível(is) encontrada(s).`
          : 'Nenhuma viagem compatível com a tua pesquisa.'
        : result.message ?? 'Não foi possível procurar viagens.'
    );
    setLoading(false);
  };

  const requestTrip = async (trip: AvailableTrip) => {
    if (seatsToRequest > trip.available_seats) {
      setFeedback(`Só existem ${trip.available_seats} lugar(es) disponível(is).`);
      return;
    }
    const result = await requestSharedTrip(trip.id, destination, seatsToRequest);
    setFeedback(result.message);
    if (result.ok) {
      setSeatsToRequest(1);
      void searchTrips();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {profile?.fullName ?? 'passageiro'}</Text>
          <Text style={styles.question}>Para onde vamos?</Text>
        </View>
      </View>

      <View style={styles.map}>
        {readiness.mapsConfigured ? (
          <PassengerMap region={region} showMarker={Boolean(profile)} />
        ) : (
          <View style={styles.mapPending}>
            <Text style={styles.mapPendingText}>Mapas: configuração pendente. Configure uma chave para ativar o mapa.</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
        <View style={styles.locationCard}>
          <View style={styles.locationDotOrigin} />
          <TextInput
            style={styles.locationInput}
            value={origin}
            onChangeText={setOrigin}
            placeholder="De onde vais sair?"
          />
          <View style={styles.locationDivider} />
          <View style={styles.locationDotDestination} />
          <TextInput
            style={styles.locationInput}
            value={destination}
            onChangeText={setDestination}
            placeholder="Para onde vais?"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Trocar origem e destino"
            style={styles.swapButton}
            onPress={swapLocations}
          >
            <Text style={styles.swapText}>⇅</Text>
          </Pressable>
        </View>

        <View style={styles.seatsRow}>
          <Text style={styles.seatsLabel}>Lugares:</Text>
          <Pressable
            style={styles.seatsButton}
            onPress={() => setSeatsToRequest((s) => Math.max(1, s - 1))}
            disabled={seatsToRequest <= 1}
          >
            <Text style={styles.seatsButtonText}>−</Text>
          </Pressable>
          <Text style={styles.seatsValue}>{seatsToRequest}</Text>
          <Pressable
            style={styles.seatsButton}
            onPress={() => setSeatsToRequest((s) => s + 1)}
          >
            <Text style={styles.seatsButtonText}>+</Text>
          </Pressable>
        </View>

        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        <Pressable
          style={styles.button}
          disabled={loading}
          onPress={() => void searchTrips()}
        >
          <Text style={styles.buttonText}>
            {loading ? 'A procurar...' : 'Encontrar viagem'}
          </Text>
        </Pressable>

        {trips.map((trip) => {
          const pricePerSeat =
            trip.available_seats > 0
              ? Math.ceil(trip.total_estimated_kz / trip.available_seats)
              : 0;
          return (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <Text style={styles.tripTitle}>
                  {trip.origin_name} → {trip.destination_name}
                </Text>
                <Text style={styles.tripPrice}>{formatKz(pricePerSeat)} / lugar</Text>
              </View>
              <Text style={styles.tripMeta}>
                {trip.available_seats} lugar(es) disponível · Total até{' '}
                {formatKz(trip.total_estimated_kz)}
              </Text>
              {trip.driver_name && (
                <Text style={styles.tripDriver}>
                  Motorista: {trip.driver_name} · {trip.vehicle_brand ?? ''}
                  {trip.vehicle_plate ? ` · ${trip.vehicle_plate}` : ''}
                </Text>
              )}
              <View style={styles.tripActions}>
                <Text style={styles.seatsHint}>
                  Máximo disponível: {trip.available_seats}
                </Text>
                <Pressable
                  style={styles.requestButton}
                  onPress={() => void requestTrip(trip)}
                  disabled={seatsToRequest > trip.available_seats}
                >
                  <Text style={styles.requestText}>Solicitar</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background },
  header: { position: 'absolute', zIndex: 2, top: 48, left: 16, right: 16 },
  greeting: { color: KAMBAGO_COLORS.textSecondary, fontSize: 14 },
  question: { color: KAMBAGO_COLORS.textPrimary, fontSize: 24, fontWeight: '800', marginTop: 2 },
  map: { height: '48%' },
  mapPending: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: KAMBAGO_COLORS.surfaceMuted, padding: 24 },
  mapPendingText: { color: KAMBAGO_COLORS.warning, textAlign: 'center', lineHeight: 20, fontWeight: '700' },
  panel: { flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -16 },
  panelContent: { padding: 20, gap: 10 },
  locationCard: {
    borderWidth: 1,
    borderColor: KAMBAGO_COLORS.border,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  locationInput: { minHeight: 44, paddingLeft: 18, color: KAMBAGO_COLORS.textPrimary },
  locationDivider: { height: 1, backgroundColor: KAMBAGO_COLORS.border, marginLeft: 18 },
  locationDotOrigin: {
    position: 'absolute',
    left: 14,
    top: 22,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: KAMBAGO_COLORS.primary,
  },
  locationDotDestination: {
    position: 'absolute',
    left: 14,
    top: 67,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: KAMBAGO_COLORS.primary,
  },
  swapButton: {
    position: 'absolute',
    right: 10,
    top: 49,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: KAMBAGO_COLORS.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapText: { color: KAMBAGO_COLORS.primaryDark, fontWeight: '800' },
  seatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: KAMBAGO_COLORS.border,
  },
  seatsLabel: { color: KAMBAGO_COLORS.textSecondary, fontWeight: '700', fontSize: 14 },
  seatsButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: KAMBAGO_COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatsButtonText: { color: KAMBAGO_COLORS.textPrimary, fontWeight: '800', fontSize: 16 },
  seatsValue: { color: KAMBAGO_COLORS.textPrimary, fontWeight: '800', fontSize: 16, marginHorizontal: 4 },
  feedback: { color: KAMBAGO_COLORS.textSecondary, lineHeight: 20 },
  button: { backgroundColor: KAMBAGO_COLORS.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  buttonText: { color: KAMBAGO_COLORS.textPrimary, fontWeight: '800', fontSize: 16 },
  tripCard: { borderWidth: 1, borderColor: KAMBAGO_COLORS.border, borderRadius: 14, padding: 14, gap: 8, backgroundColor: '#FFFFFF' },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tripTitle: { color: KAMBAGO_COLORS.textPrimary, fontWeight: '700', fontSize: 16 },
  tripPrice: { color: KAMBAGO_COLORS.primaryDark, fontWeight: '800', fontSize: 16 },
  tripMeta: { color: KAMBAGO_COLORS.textSecondary, fontSize: 14 },
  tripDriver: { color: KAMBAGO_COLORS.textSecondary, fontSize: 13, marginTop: 4 },
  tripActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  seatsHint: { color: KAMBAGO_COLORS.textSecondary, fontSize: 12 },
  requestButton: { backgroundColor: KAMBAGO_COLORS.primaryDark, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  requestText: { color: '#FFFFFF', fontWeight: '700' },
});
