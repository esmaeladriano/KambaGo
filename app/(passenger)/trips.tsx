import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { KAMBAGO_COLORS } from '../../constants/theme';
import {
  cancelMyTripRequest,
  fetchMyTripRequests,
  type TripRequestRow,
} from '../../services/trips/tripsService';

export default function PassengerTripsScreen() {
  const [requests, setRequests] = useState<TripRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const load = async () => {
    setLoading(true);
    const result = await fetchMyTripRequests();
    setRequests(result.requests);
    setFeedback(result.ok ? '' : result.message ?? 'Não foi possível carregar os pedidos.');
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Minhas viagens</Text>
      {loading ? <Text style={styles.body}>A carregar pedidos...</Text> : null}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      {!loading && !feedback && requests.length === 0 ? (
        <Text style={styles.body}>Nenhum pedido solicitado.</Text>
      ) : null}
      {requests.map((request) => (
        <View key={request.id} style={styles.card}>
          <Text style={styles.name}>{request.destination_name ?? 'Destino não informado'}</Text>
          <Text style={styles.body}>Estado: {request.status} · {request.seats_requested} lugar(es)</Text>
          {request.status === 'pendente' ? (
            <Pressable
              style={styles.cancel}
              onPress={async () => {
                const result = await cancelMyTripRequest(request.id);
                setFeedback(result.message);
                if (result.ok) await load();
              }}
            >
              <Text style={styles.cancelText}>Cancelar pedido</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: KAMBAGO_COLORS.textPrimary },
  body: { color: KAMBAGO_COLORS.textSecondary, lineHeight: 20 },
  feedback: { color: KAMBAGO_COLORS.danger, lineHeight: 20 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KAMBAGO_COLORS.border, borderRadius: 14, padding: 14, gap: 8 },
  name: { color: KAMBAGO_COLORS.textPrimary, fontWeight: '700' },
  cancel: { alignSelf: 'flex-start', backgroundColor: KAMBAGO_COLORS.danger, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  cancelText: { color: '#FFFFFF', fontWeight: '700' },
});
