import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import {
  setDriverAvailability,
  fetchMyTripRequests,
  type TripRequestRow,
} from '../../services/trips/tripsService';
import { formatKz } from '../../utils/accountState';

export default function DriverDashboardScreen() {
  const profile = useAuthStore((state) => state.profile);
  const [isAvailable, setIsAvailable] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [requests, setRequests] = useState<TripRequestRow[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const [tripsToday, setTripsToday] = useState(0);
  const [tripsCompleted, setTripsCompleted] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [availableSeatsCount, setAvailableSeatsCount] = useState(0);
  const [confirmedEarnings, setConfirmedEarnings] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (profile?.accountStatus === 'ativa') {
      setIsAvailable(profile.isAvailable ?? false);
    } else {
      setIsAvailable(false);
    }
  }, [profile]);

  const updateAvailability = async (available: boolean) => {
    setAvailabilityLoading(true);
    setFeedback('');
    const result = await setDriverAvailability(available);
    setAvailabilityLoading(false);
    if (!result.ok) {
      setFeedback(result.message);
      setIsAvailable(profile?.isAvailable ?? false);
      return;
    }
    setIsAvailable(available);
    setFeedback(available ? 'Disponibilidade ativada.' : 'Disponibilidade desativada.');
    if (available) {
      void loadRequests();
    }
  };

  const loadRequests = async () => {
    setRequestsLoading(true);
    const result = await fetchMyTripRequests();
    setRequestsLoading(false);
    if (result.ok) {
      const pending = result.requests.filter((r) => r.status === 'pendente');
      setRequests(result.requests);
      setPendingRequestsCount(pending.length);
    } else {
      setFeedback(result.message ?? 'Não foi possível carregar as solicitações.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Motorista</Text>
          <Text style={styles.name}>{profile?.fullName ?? 'Nome do motorista'}</Text>
        </View>
        <View style={[styles.status, isAvailable ? styles.statusOnline : null]}>
          <Text style={[styles.statusText, isAvailable ? styles.statusTextOnline : null]}>
            {isAvailable ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {profile?.accountStatus !== 'ativa' && (
        <View style={styles.pendingCard}>
          <Text style={styles.pendingTitle}>Conta aguardando aprovação</Text>
          <Text style={styles.pendingText}>
            O estado do motorista só fica ativo após aprovação administrativa.
          </Text>
        </View>
      )}

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      <View style={styles.availability}>
        <View>
          <Text style={styles.cardTitle}>Disponibilidade</Text>
          <Text style={styles.cardText}>Receber novas solicitações</Text>
        </View>
        <Switch
          value={isAvailable}
          disabled={
            profile?.accountStatus !== 'ativa' || availabilityLoading
          }
          onValueChange={(available) => void updateAvailability(available)}
          trackColor={{
            true: KAMBAGO_COLORS.primary,
            false: KAMBAGO_COLORS.border,
          }}
        />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{tripsToday}</Text>
          <Text style={styles.summaryLabel}>Viagens hoje</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{tripsCompleted}</Text>
          <Text style={styles.summaryLabel}>Viagens concluídas</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{pendingRequestsCount}</Text>
          <Text style={styles.summaryLabel}>Solicitações pendentes</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{availableSeatsCount}</Text>
          <Text style={styles.summaryLabel}>Lugares disponíveis</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {confirmedEarnings === null ? '—' : `${confirmedEarnings} Kz`}
          </Text>
          <Text style={styles.summaryLabel}>Ganhos confirmados</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Solicitações recebidas</Text>
      {requestsLoading ? (
        <Text style={styles.emptyText}>A carregar solicitações...</Text>
      ) : requests.length === 0 ? (
        <Text style={styles.emptyText}>
          {isAvailable
            ? 'Não existem solicitações novas neste momento.'
            : 'Ative a disponibilidade para ver solicitações.'}
        </Text>
      ) : (
        requests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestInfo}>
              <Text style={styles.requestPassenger}>
                Passageiro ID: {request.passenger_id}
              </Text>
              <Text style={styles.requestRoute}>
                {request.origin_name ?? 'Origem'} →{' '}
                {request.destination_name ?? 'Destino'}
              </Text>
              <Text style={styles.requestMeta}>
                {request.seats_requested} lugar(es) ·
                {request.status === 'pendente'
                  ? formatKz(request.estimated_fare_kz ?? 0)
                  : ''}
              </Text>
            </View>
            {request.status === 'pendente' && (
              <View style={styles.requestActions}>
                <Pressable style={styles.acceptButton} onPress={() => {}}>
                  <Text style={styles.buttonText}>Aceitar</Text>
                </Pressable>
                <Pressable style={styles.rejectButton} onPress={() => {}}>
                  <Text style={styles.buttonText}>Rejeitar</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))
      )}

      {statsLoading && <Text style={styles.body}>A carregar indicadores...</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background },
  content: { padding: 20, gap: 14 },
  header: { marginTop: 34, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: KAMBAGO_COLORS.textSecondary, fontSize: 13 },
  name: { color: KAMBAGO_COLORS.textPrimary, fontSize: 22, fontWeight: '800' },
  status: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: KAMBAGO_COLORS.surfaceMuted },
  statusOnline: { backgroundColor: KAMBAGO_COLORS.successSurface },
  statusText: { color: KAMBAGO_COLORS.textSecondary, fontWeight: '700' },
  statusTextOnline: { color: KAMBAGO_COLORS.success },
  pendingCard: { backgroundColor: KAMBAGO_COLORS.warningSurface, borderRadius: 14, padding: 14, gap: 4 },
  pendingTitle: { color: KAMBAGO_COLORS.warning, fontWeight: '800' },
  pendingText: { color: KAMBAGO_COLORS.textSecondary, lineHeight: 20 },
  feedback: { color: KAMBAGO_COLORS.danger, lineHeight: 20 },
  availability: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: KAMBAGO_COLORS.border, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: KAMBAGO_COLORS.textPrimary, fontWeight: '800', fontSize: 16 },
  cardText: { color: KAMBAGO_COLORS.textSecondary, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  summaryCard: { flex: 1, minWidth: 120, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: KAMBAGO_COLORS.border, padding: 14 },
  summaryValue: { color: KAMBAGO_COLORS.textPrimary, fontSize: 20, fontWeight: '800' },
  summaryLabel: { color: KAMBAGO_COLORS.textSecondary, marginTop: 4, fontSize: 12 },
  sectionTitle: { color: KAMBAGO_COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 6 },
  emptyText: { color: KAMBAGO_COLORS.textSecondary, lineHeight: 20 },
  requestCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KAMBAGO_COLORS.border, borderRadius: 14, padding: 14, gap: 8, marginBottom: 10 },
  requestInfo: { gap: 4 },
  requestPassenger: { color: KAMBAGO_COLORS.textPrimary, fontWeight: '700', fontSize: 14 },
  requestRoute: { color: KAMBAGO_COLORS.textSecondary, fontSize: 14 },
  requestMeta: { color: KAMBAGO_COLORS.textSecondary, fontSize: 12 },
  requestActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  acceptButton: { backgroundColor: KAMBAGO_COLORS.success, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  rejectButton: { backgroundColor: KAMBAGO_COLORS.danger, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  body: { color: KAMBAGO_COLORS.textSecondary, lineHeight: 20 },
});
