import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { fetchPaidEarnings } from '../../services/trips/tripsService';

export default function DriverEarningsScreen() {
  const [totalKz, setTotalKz] = useState<number | null>(null);
  const [paymentsCount, setPaymentsCount] = useState(0);
  const [feedback, setFeedback] = useState('A carregar ganhos...');

  useEffect(() => {
    void (async () => {
      const result = await fetchPaidEarnings();
      if (!result.ok) {
        setFeedback(result.message ?? 'Não foi possível carregar os ganhos.');
        return;
      }
      setTotalKz(result.earnings.totalKz);
      setPaymentsCount(result.earnings.paymentsCount);
      setFeedback(
        result.earnings.paymentsCount === 0
          ? 'Nenhum pagamento confirmado como pago.'
          : `${result.earnings.paymentsCount} pagamento(s) confirmado(s).`
      );
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ganhos</Text>
      <View style={styles.card}>
        <Text style={styles.value}>{totalKz === null ? '—' : `${totalKz} Kz`}</Text>
        <Text style={styles.body}>{feedback}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background, padding: 20, gap: 14 },
  title: { fontSize: 22, fontWeight: '800', color: KAMBAGO_COLORS.navy },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KAMBAGO_COLORS.border, borderRadius: 16, padding: 20 },
  value: { color: KAMBAGO_COLORS.navy, fontSize: 28, fontWeight: '800' },
  body: { color: KAMBAGO_COLORS.textSecondary, marginTop: 8 },
});
