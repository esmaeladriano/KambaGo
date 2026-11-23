import { Text, View, StyleSheet } from 'react-native';
import { KAMBAGO_COLORS } from '../../constants/theme';

export default function DriverTripsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Viagens</Text>
      <Text style={styles.body}>Viagens pendentes, ativas e concluídas serão apresentadas aqui.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background, padding: 20, gap: 10 },
  title: { fontSize: 22, fontWeight: '800', color: KAMBAGO_COLORS.navy },
  body: { color: KAMBAGO_COLORS.textSecondary, lineHeight: 20 },
});
