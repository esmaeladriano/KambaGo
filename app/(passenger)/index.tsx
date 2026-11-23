import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchAvailableTrips, requestSharedTrip, type AvailableTrip } from '../../services/trips/tripsService';
import { getIntegrationReadiness } from '../../services/supabase/client';
import PassengerMap, { type PassengerMapRegion } from '../../components/PassengerMap';

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
    if (!destination.trim()) {
      setFeedback('Indique o destino da viagem.');
      return;
    }
    setLoading(true);
    const result = await fetchAvailableTrips();
    setTrips(result.trips);
    setFeedback(
      result.ok
        ? result.trips.length
          ? `${result.trips.length} viagem(ns) disponível(is).`
          : 'Nenhuma viagem compatível disponível.'
        : result.message ?? 'Não foi possível procurar viagens.'
    );
    setLoading(false);
  };

  const requestTrip = async (trip: AvailableTrip) => {
    const result = await requestSharedTrip(trip.id, destination);
    setFeedback(result.message);
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
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        <Pressable style={styles.button} disabled={loading} onPress={() => void searchTrips()}>
          <Text style={styles.buttonText}>{loading ? 'A procurar...' : 'Encontrar viagem'}</Text>
        </Pressable>

        {trips.map((trip) => (
          <View key={trip.id} style={styles.tripCard}>
            <Text style={styles.tripTitle}>{trip.origin_name} → {trip.destination_name}</Text>
            <Text style={styles.tripMeta}>
              {trip.available_seats} lugar(es) · Até {trip.total_estimated_kz} Kz
            </Text>
            <Pressable style={styles.requestButton} onPress={() => void requestTrip(trip)}>
              <Text style={styles.requestText}>Solicitar</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background },
  header: { position: 'absolute', zIndex: 2, top: 48, left: 16, right: 16 },
  greeting: { color: KAMBAGO_COLORS.textSecondary, fontSize: 14 },
  question: { color: KAMBAGO_COLORS.navy, fontSize: 24, fontWeight: '800', marginTop: 2 },
  map: { height: '48%' },
  mapPending: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: KAMBAGO_COLORS.surfaceMuted, padding: 24 },
  mapPendingText: { color: KAMBAGO_COLORS.amberText, textAlign: 'center', lineHeight: 20, fontWeight: '700' },
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
  locationInput: { minHeight: 44, paddingLeft: 18, color: KAMBAGO_COLORS.navy },
  locationDivider: { height: 1, backgroundColor: KAMBAGO_COLORS.border, marginLeft: 18 },
  locationDotOrigin: {
    position: 'absolute',
    left: 14,
    top: 22,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: KAMBAGO_COLORS.navy,
  },
  locationDotDestination: {
    position: 'absolute',
    left: 14,
    top: 67,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: KAMBAGO_COLORS.teal,
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
  swapText: { color: KAMBAGO_COLORS.tealDark, fontWeight: '800' },
  feedback: { color: KAMBAGO_COLORS.textSecondary, lineHeight: 20 },
  button: { backgroundColor: KAMBAGO_COLORS.amber, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  buttonText: { color: KAMBAGO_COLORS.navy, fontWeight: '800', fontSize: 16 },
  tripCard: { borderWidth: 1, borderColor: KAMBAGO_COLORS.border, borderRadius: 14, padding: 14, gap: 8 },
  tripTitle: { color: KAMBAGO_COLORS.navy, fontWeight: '700' },
  tripMeta: { color: KAMBAGO_COLORS.textSecondary },
  requestButton: { alignSelf: 'flex-start', backgroundColor: KAMBAGO_COLORS.tealDark, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  requestText: { color: '#FFFFFF', fontWeight: '700' },
});
