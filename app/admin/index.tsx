import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect } from 'expo-router';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import {
  approveDriver,
  approveVehicle,
  fetchAdminQueue,
  rejectDriver,
  rejectVehicle,
  suspendAccount,
  type PendingDriver,
  type PendingVehicle,
} from '../../services/admin/adminService';

export default function AdminScreen() {
  const profile = useAuthStore((state) => state.profile);
  const [drivers, setDrivers] = useState<PendingDriver[]>([]);
  const [vehicles, setVehicles] = useState<PendingVehicle[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const load = async () => {
    setLoading(true);
    const result = await fetchAdminQueue();
    setFeedback(result.ok ? '' : result.message ?? 'Não foi possível carregar a fila.');
    setDrivers(result.drivers);
    setVehicles(result.vehicles);
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.role === 'admin') void load();
  }, [profile]);

  if (profile?.role !== 'admin') return <Redirect href="/(passenger)" />;

  const act = async (action: () => Promise<{ ok: boolean; message: string }>) => {
    setFeedback('');
    const result = await action();
    setFeedback(result.message);
    if (result.ok) await load();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Área administrativa</Text>
      <TextInput
        style={styles.input}
        value={reason}
        onChangeText={setReason}
        placeholder="Motivo de rejeição"
      />
      {loading ? <Text style={styles.body}>A carregar fila...</Text> : null}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      <Text style={styles.section}>Motoristas pendentes</Text>
      {!loading && drivers.length === 0 ? <Text style={styles.body}>Nenhum motorista pendente.</Text> : null}
      {drivers.map((driver) => (
        <View key={driver.id} style={styles.card}>
          <Text style={styles.name}>{driver.full_name}</Text>
          {driver.email ? <Text style={styles.body}>{driver.email}</Text> : null}
          <View style={styles.row}>
            <Pressable style={styles.approve} onPress={() => void act(() => approveDriver(driver.id))}>
              <Text style={styles.buttonText}>Aprovar</Text>
            </Pressable>
            <Pressable style={styles.reject} onPress={() => void act(() => rejectDriver(driver.id, reason))}>
              <Text style={styles.buttonText}>Rejeitar</Text>
            </Pressable>
            <Pressable style={styles.reject} onPress={() => void act(() => suspendAccount(driver.id))}>
              <Text style={styles.buttonText}>Suspender</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Text style={styles.section}>Veículos pendentes</Text>
      {!loading && vehicles.length === 0 ? <Text style={styles.body}>Nenhum veículo pendente.</Text> : null}
      {vehicles.map((vehicle) => (
        <View key={vehicle.id} style={styles.card}>
          <Text style={styles.name}>{vehicle.plate} · {vehicle.brand}{vehicle.model ? ` ${vehicle.model}` : ''}</Text>
          <View style={styles.row}>
            <Pressable style={styles.approve} onPress={() => void act(() => approveVehicle(vehicle.id))}>
              <Text style={styles.buttonText}>Aprovar</Text>
            </Pressable>
            <Pressable style={styles.reject} onPress={() => void act(() => rejectVehicle(vehicle.id, reason))}>
              <Text style={styles.buttonText}>Rejeitar</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: KAMBAGO_COLORS.navy },
  section: { fontSize: 18, fontWeight: '800', color: KAMBAGO_COLORS.navy, marginTop: 8 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KAMBAGO_COLORS.border, borderRadius: 14, padding: 14, gap: 8 },
  name: { color: KAMBAGO_COLORS.navy, fontWeight: '700' },
  body: { color: KAMBAGO_COLORS.textSecondary },
  feedback: { color: KAMBAGO_COLORS.danger },
  input: { borderWidth: 1, borderColor: KAMBAGO_COLORS.border, borderRadius: 12, padding: 12, backgroundColor: '#FFFFFF' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  approve: { backgroundColor: KAMBAGO_COLORS.tealDark, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  reject: { backgroundColor: KAMBAGO_COLORS.danger, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});
