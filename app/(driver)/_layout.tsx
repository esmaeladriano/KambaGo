import { Tabs } from 'expo-router';
import { KAMBAGO_COLORS } from '../../constants/theme';

export default function DriverLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: KAMBAGO_COLORS.amber,
        tabBarInactiveTintColor: KAMBAGO_COLORS.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="trips" options={{ title: 'Viagens' }} />
      <Tabs.Screen name="earnings" options={{ title: 'Ganhos' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', href: '/profile' }} />
    </Tabs>
  );
}
