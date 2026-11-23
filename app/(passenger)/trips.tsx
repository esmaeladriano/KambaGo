import { Text, View, StyleSheet } from 'react-native';
import { KAMBAGO_COLORS } from '../../constants/theme';

export default function PassengerTripsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Minhas viagens</Text>
      <Text style={styles.body}>As viagens solicitadas e ativas aparecerão aqui.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background, padding: 20, gap: 10 },
  title: { fontSize: 22, fontWeight: '800', color: KAMBAGO_COLORS.navy },
  body: { color: KAMBAGO_COLORS.textSecondary, lineHeight: 20 },
});
