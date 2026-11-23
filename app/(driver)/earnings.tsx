import { Text, View, StyleSheet } from 'react-native';
import { KAMBAGO_COLORS } from '../../constants/theme';

export default function DriverEarningsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ganhos</Text>
      <View style={styles.card}>
        <Text style={styles.value}>0 Kz</Text>
        <Text style={styles.body}>Nenhum ganho registado.</Text>
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
