import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { KAMBAGO_COLORS } from '../../constants/theme';
import {
  cancelTrip,
  completeTrip,
  createTrip,
  startTrip,
} from '../../services/trips/tripsService';

export default function DriverTripsScreen() {
  const [tripId, setTripId] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [fare, setFare] = useState('');
  const [seats, setSeats] = useState('');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async (action: () => Promise<{ ok: boolean; message: string }>) => {
    setLoading(true);
    setFeedback('');
    const result = await action();
    setFeedback(result.message);
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Viagens</Text>
      <View style={styles.card}>
        <Text style={styles.section}>Criar viagem</Text>
        <TextInput style={styles.input} value={origin} onChangeText={setOrigin} placeholder="Origem" />
        <TextInput style={styles.input} value={destination} onChangeText={setDestination} placeholder="Destino" />
        <TextInput style={styles.input} value={fare} onChangeText={setFare} placeholder="Preço total (Kz)" keyboardType="number-pad" />
        <TextInput style={styles.input} value={seats} onChangeText={setSeats} placeholder="Lugares disponíveis" keyboardType="number-pad" />
        <Pressable
          style={styles.button}
          disabled={loading}
          onPress={() => void run(() => createTrip(origin, destination, Number(fare), Number(seats)))}
        >
          <Text style={styles.buttonText}>{loading ? 'A processar...' : 'Criar viagem'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Gerir viagem</Text>
        <TextInput style={styles.input} value={tripId} onChangeText={setTripId} placeholder="ID da viagem" autoCapitalize="none" />
        <Pressable style={styles.button} disabled={loading || !tripId} onPress={() => void run(() => startTrip(tripId))}>
          <Text style={styles.buttonText}>Iniciar viagem</Text>
        </Pressable>
        <Pressable style={styles.button} disabled={loading || !tripId} onPress={() => void run(() => completeTrip(tripId))}>
          <Text style={styles.buttonText}>Concluir viagem</Text>
        </Pressable>
        <TextInput style={styles.input} value={reason} onChangeText={setReason} placeholder="Motivo do cancelamento" />
        <Pressable style={styles.reject} disabled={loading || !tripId} onPress={() => void run(() => cancelTrip(tripId, reason))}>
          <Text style={styles.buttonText}>Cancelar viagem</Text>
        </Pressable>
      </View>

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: KAMBAGO_COLORS.textPrimary },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KAMBAGO_COLORS.border, borderRadius: 16, padding: 14, gap: 8 },
  section: { color: KAMBAGO_COLORS.textPrimary, fontWeight: '800', fontSize: 16 },
  input: { borderWidth: 1, borderColor: KAMBAGO_COLORS.border, borderRadius: 12, padding: 12 },
  button: { backgroundColor: KAMBAGO_COLORS.primaryDark, borderRadius: 12, alignItems: 'center', paddingVertical: 13 },
  reject: { backgroundColor: KAMBAGO_COLORS.danger, borderRadius: 12, alignItems: 'center', paddingVertical: 13 },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
  feedback: { color: KAMBAGO_COLORS.danger, lineHeight: 20 },
});
