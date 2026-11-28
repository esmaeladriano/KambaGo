import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native';
import { Redirect } from 'expo-router';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import {
  approveDriver,
  approveVehicle,
  fetchAdminQueue,
  fetchAdminStats,
  fetchAdminTrips,
  fetchAdminUsers,
  reactivateAccount,
  rejectDriver,
  rejectVehicle,
  suspendAccount,
  type AdminStats,
  type AdminTrip,
  type AdminUser,
  type PendingDriver,
  type PendingVehicle,
} from '../../services/admin/adminService';

export default function AdminScreen() {
  const profile = useAuthStore((state) => state.profile);
  const [drivers, setDrivers] = useState<PendingDriver[]>([]);
  const [vehicles, setVehicles] = useState<PendingVehicle[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [trips, setTrips] = useState<AdminTrip[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const load = async () => {
    setLoading(true);
    const result = await fetchAdminQueue();
    setFeedback(result.ok ? '' : result.message ?? 'Não foi possível carregar a fila.');
    setDrivers(result.drivers);
    setVehicles(result.vehicles);
    setLoading(false);
  };

  const loadStats = async () => {
    setStatsLoading(true);
    const result = await fetchAdminStats();
    if (result.ok) {
      setStats(result.stats);
    }
    setStatsLoading(false);
  };

  const loadUsers = async () => {
    const result = await fetchAdminUsers();
    if (result.ok) {
      setUsers(result.users);
    }
  };

  const loadTrips = async () => {
    const result = await fetchAdminTrips();
    if (result.ok) {
      setTrips(result.trips);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      void load();
      void loadStats();
      void loadUsers();
      void loadTrips();
    }
  }, [profile]);

  if (profile?.role !== 'admin') return <Redirect href="/(passenger)" />;

  const act = async (action: () => Promise<{ ok: boolean; message: string }>) => {
    setFeedback('');
    const result = await action();
    setFeedback(result.message);
    if (result.ok) {
      void load();
      void loadStats();
      void loadUsers();
      void loadTrips();
    }
  };

  const confirmAction = (title: string, action: () => void) => {
    Alert.alert(title, 'Tem a certeza que deseja executar esta ação?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: action, style: 'destructive' },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Área administrativa</Text>

      {statsLoading ? (
        <Text style={styles.body}>A carregar indicadores...</Text>
      ) : stats && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Utilizadores</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalDrivers}</Text>
            <Text style={styles.statLabel}>Motoristas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalPassengers}</Text>
            <Text style={styles.statLabel}>Passageiros</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalTrips}</Text>
            <Text style={styles.statLabel}>Viagens</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalRequests}</Text>
            <Text style={styles.statLabel}>Pedidos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalEarningsKz} Kz</Text>
            <Text style={styles.statLabel}>Ganhos totais</Text>
          </View>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={reason}
          onChangeText={setReason}
          placeholder="Motivo de rejeição"
        />
      </View>

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      <Text style={styles.section}>Motoristas pendentes</Text>
      {!loading && drivers.length === 0 ? (
        <Text style={styles.body}>Nenhum motorista pendente.</Text>
      ) : null}
      {drivers.map((driver) => (
        <View key={driver.id} style={styles.card}>
          <Text style={styles.name}>{driver.full_name}</Text>
          {driver.email ? <Text style={styles.body}>{driver.email}</Text> : null}
          <View style={styles.row}>
            <Pressable style={styles.approve} onPress={() => void act(() => approveDriver(driver.id))}>
              <Text style={styles.buttonText}>Aprovar</Text>
            </Pressable>
            <Pressable
              style={styles.reject}
              onPress={() =>
                confirmAction('Rejeitar motorista', () => void act(() => rejectDriver(driver.id, reason)))
              }
            >
              <Text style={styles.buttonText}>Rejeitar</Text>
            </Pressable>
            <Pressable
              style={styles.reject}
              onPress={() =>
                confirmAction('Suspender conta', () => void act(() => suspendAccount(driver.id)))
              }
            >
              <Text style={styles.buttonText}>Suspender</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Text style={styles.section}>Veículos pendentes</Text>
      {!loading && vehicles.length === 0 ? (
        <Text style={styles.body}>Nenhum veículo pendente.</Text>
      ) : null}
      {vehicles.map((vehicle) => (
        <View key={vehicle.id} style={styles.card}>
          <Text style={styles.name}>
            {vehicle.plate} · {vehicle.brand}{vehicle.model ? ` ${vehicle.model}` : ''}
          </Text>
          <View style={styles.row}>
            <Pressable style={styles.approve} onPress={() => void act(() => approveVehicle(vehicle.id))}>
              <Text style={styles.buttonText}>Aprovar</Text>
            </Pressable>
            <Pressable
              style={styles.reject}
              onPress={() =>
                confirmAction('Rejeitar veículo', () => void act(() => rejectVehicle(vehicle.id, reason)))
              }
            >
              <Text style={styles.buttonText}>Rejeitar</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Text style={styles.section}>Utilizadores</Text>
      {!loading && users.length === 0 ? (
        <Text style={styles.body}>Nenhum utilizador encontrado.</Text>
      ) : null}
      {users.map((user) => (
        <View key={user.id} style={styles.card}>
          <Text style={styles.name}>{user.full_name}</Text>
          <Text style={styles.body}>{user.email ?? 'Sem e-mail'} · {user.role}</Text>
          <Text style={styles.body}>{user.account_status}</Text>
          <View style={styles.row}>
            {user.account_status === 'suspensa' ? (
              <Pressable
                style={styles.approve}
                onPress={() =>
                  confirmAction('Reativar conta', () => void act(() => reactivateAccount(user.id)))
                }
              >
                <Text style={styles.buttonText}>Reativar</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.reject}
                onPress={() =>
                  confirmAction('Suspender conta', () => void act(() => suspendAccount(user.id)))
                }
              >
                <Text style={styles.buttonText}>Suspender</Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}

      <Text style={styles.section}>Viagens recentes</Text>
      {!loading && trips.length === 0 ? (
        <Text style={styles.body}>Nenhuma viagem registada.</Text>
      ) : null}
      {trips.slice(0, 10).map((trip) => (
        <View key={trip.id} style={styles.card}>
          <Text style={styles.name}>
            {trip.origin_name} → {trip.destination_name}
          </Text>
          <Text style={styles.body}>
            Estado: {trip.status} · {trip.available_seats} lugar(es) · {trip.total_estimated_kz} Kz
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: KAMBAGO_COLORS.textPrimary },
  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  statCard: { flex: 1, minWidth: 110, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: KAMBAGO_COLORS.border, padding: 14 },
  statValue: { color: KAMBAGO_COLORS.textPrimary, fontSize: 20, fontWeight: '800' },
  statLabel: { color: KAMBAGO_COLORS.textSecondary, marginTop: 4, fontSize: 12 },
  inputRow: { marginBottom: 12 },
  input: { borderWidth: 1, borderColor: KAMBAGO_COLORS.border, borderRadius: 12, padding: 12, backgroundColor: '#FFFFFF' },
  section: { fontSize: 18, fontWeight: '800', color: KAMBAGO_COLORS.textPrimary, marginTop: 10 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KAMBAGO_COLORS.border, borderRadius: 14, padding: 14, gap: 8, marginBottom: 8 },
  name: { color: KAMBAGO_COLORS.textPrimary, fontWeight: '700' },
  body: { color: KAMBAGO_COLORS.textSecondary, lineHeight: 20 },
  feedback: { color: KAMBAGO_COLORS.danger },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  approve: { backgroundColor: KAMBAGO_COLORS.primaryDark, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  reject: { backgroundColor: KAMBAGO_COLORS.danger, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});
