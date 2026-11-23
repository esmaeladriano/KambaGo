import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KAMBAGO_COLORS } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';

export default function RootLayout() {
  const hydratePreferences = useAuthStore((s) => s.hydratePreferences);
  const profile = useAuthStore((state) => state.profile);
  const segments = useSegments();

  useEffect(() => {
    void hydratePreferences();
  }, [hydratePreferences]);

  useEffect(() => {
    if (!profile) return;

    const inPassengerArea = segments[0] === '(passenger)';
    const inDriverArea = segments[0] === '(driver)';

    if (profile.role === 'driver' && inPassengerArea) {
      router.replace('/(driver)');
    } else if (profile.role !== 'driver' && inDriverArea) {
      router.replace('/(passenger)');
    }
  }, [profile, segments]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: KAMBAGO_COLORS.navy },
          headerTintColor: '#FFFFFF',
          contentStyle: { backgroundColor: KAMBAGO_COLORS.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/welcome" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Entrar' }} />
        <Stack.Screen name="(auth)/register" options={{ title: 'Criar conta' }} />
        <Stack.Screen name="(auth)/forgot-password" options={{ title: 'Recuperar palavra-passe' }} />
        <Stack.Screen name="(auth)/verify-email" options={{ title: 'Confirmar e-mail' }} />
        <Stack.Screen name="(passenger)" options={{ headerShown: false }} />
        <Stack.Screen name="(driver)" options={{ headerShown: false }} />
        <Stack.Screen name="profile/index" options={{ title: 'O meu perfil' }} />
        <Stack.Screen name="profile/privacy-legal" options={{ title: 'Termos e Privacidade' }} />
      </Stack>
    </>
  );
}
