import { Text, View, StyleSheet } from 'react-native';
import { KAMBAGO_COLORS } from '../constants/theme';

export interface PassengerMapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export default function PassengerMap(_props: {
  region: PassengerMapRegion;
  showMarker: boolean;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Mapas disponíveis no Expo Go.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KAMBAGO_COLORS.surfaceMuted,
  },
  text: {
    color: KAMBAGO_COLORS.textSecondary,
    fontWeight: '700',
  },
});
