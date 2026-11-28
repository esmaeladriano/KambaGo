import { Tabs } from 'expo-router';
import { KAMBAGO_COLORS } from '../../constants/theme';

export default function PassengerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: KAMBAGO_COLORS.primaryDark,
        tabBarInactiveTintColor: KAMBAGO_COLORS.textSecondary,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="trips" options={{ title: 'Viagens' }} />
      <Tabs.Screen name="activity" options={{ title: 'Atividade' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', href: '/profile' }} />
    </Tabs>
  );
}
