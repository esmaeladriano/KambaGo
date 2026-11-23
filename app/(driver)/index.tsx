import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

export default function DriverDashboardScreen() {
  const profile = useAuthStore((state) => state.profile);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    setOnline(profile?.accountStatus === 'ativa');
  }, [profile]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Motorista</Text>
          <Text style={styles.name}>{profile?.fullName ?? 'Nome do motorista'}</Text>
        </View>
        <View style={[styles.status, online ? styles.statusOnline : null]}>
          <Text style={[styles.statusText, online ? styles.statusTextOnline : null]}>
            {online ? 'Online' : 'Offline'}
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

      <View style={styles.availability}>
        <View>
          <Text style={styles.cardTitle}>Disponibilidade</Text>
          <Text style={styles.cardText}>Receber novas solicitações</Text>
        </View>
        <Switch
          value={online}
          disabled={profile?.accountStatus !== 'ativa'}
          onValueChange={setOnline}
          trackColor={{ true: KAMBAGO_COLORS.teal, false: KAMBAGO_COLORS.border }}
        />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>0</Text>
          <Text style={styles.summaryLabel}>Viagens hoje</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>0 Kz</Text>
          <Text style={styles.summaryLabel}>Ganhos</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Solicitações</Text>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>
          {online
            ? 'Não existem solicitações novas neste momento.'
            : 'Ative a disponibilidade para ver solicitações.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background },
  content: { padding: 20, gap: 14 },
  header: { marginTop: 34, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: KAMBAGO_COLORS.textSecondary, fontSize: 13 },
  name: { color: KAMBAGO_COLORS.navy, fontSize: 22, fontWeight: '800' },
  status: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: KAMBAGO_COLORS.surfaceMuted },
  statusOnline: { backgroundColor: KAMBAGO_COLORS.successSurface },
  statusText: { color: KAMBAGO_COLORS.textMuted, fontWeight: '700' },
  statusTextOnline: { color: KAMBAGO_COLORS.success },
  pendingCard: { backgroundColor: KAMBAGO_COLORS.amberSurface, borderRadius: 14, padding: 14, gap: 4 },
  pendingTitle: { color: KAMBAGO_COLORS.amberText, fontWeight: '800' },
  pendingText: { color: KAMBAGO_COLORS.textSecondary, lineHeight: 20 },
  availability: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: KAMBAGO_COLORS.border, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: KAMBAGO_COLORS.navy, fontWeight: '800', fontSize: 16 },
  cardText: { color: KAMBAGO_COLORS.textSecondary, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: KAMBAGO_COLORS.border, padding: 16 },
  summaryValue: { color: KAMBAGO_COLORS.navy, fontSize: 20, fontWeight: '800' },
  summaryLabel: { color: KAMBAGO_COLORS.textSecondary, marginTop: 4 },
  sectionTitle: { color: KAMBAGO_COLORS.navy, fontSize: 18, fontWeight: '800', marginTop: 6 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: KAMBAGO_COLORS.border, padding: 18 },
  emptyText: { color: KAMBAGO_COLORS.textSecondary, lineHeight: 20 },
});
