import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchAvailableTrips, requestSharedTrip, type AvailableTrip } from '../../services/trips/tripsService';

const LUANDA_REGION: Region = {
  latitude: -8.8383,
  longitude: 13.2344,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function PassengerHomeScreen() {
  const profile = useAuthStore((state) => state.profile);
  const [region, setRegion] = useState<Region>(LUANDA_REGION);
  const [origin, setOrigin] = useState('A minha localização');
  const [destination, setDestination] = useState('');
  const [trips, setTrips] = useState<AvailableTrip[]>([]);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
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
        <MapView style={StyleSheet.absoluteFill} initialRegion={region}>
          <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
        </MapView>
      </View>

      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
        <TextInput
          style={styles.input}
          value={origin}
          onChangeText={setOrigin}
          placeholder="Local de partida"
        />
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={setDestination}
          placeholder="Destino"
        />
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
  panel: { flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -16 },
  panelContent: { padding: 20, gap: 10 },
  input: { borderWidth: 1, borderColor: KAMBAGO_COLORS.border, borderRadius: 12, padding: 14, backgroundColor: '#FFFFFF' },
  feedback: { color: KAMBAGO_COLORS.textSecondary, lineHeight: 20 },
  button: { backgroundColor: KAMBAGO_COLORS.amber, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  buttonText: { color: KAMBAGO_COLORS.navy, fontWeight: '800', fontSize: 16 },
  tripCard: { borderWidth: 1, borderColor: KAMBAGO_COLORS.border, borderRadius: 14, padding: 14, gap: 8 },
  tripTitle: { color: KAMBAGO_COLORS.navy, fontWeight: '700' },
  tripMeta: { color: KAMBAGO_COLORS.textSecondary },
  requestButton: { alignSelf: 'flex-start', backgroundColor: KAMBAGO_COLORS.tealDark, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  requestText: { color: '#FFFFFF', fontWeight: '700' },
});
