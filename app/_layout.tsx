import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { KAMBAGO_COLORS } from '../constants/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" backgroundColor={KAMBAGO_COLORS.background} />
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
        <Stack.Screen name="(auth)/verify-otp" options={{ title: 'Confirmar OTP' }} />
        <Stack.Screen name="profile/index" options={{ title: 'O meu perfil' }} />
        <Stack.Screen name="profile/privacy-legal" options={{ title: 'Termos e Privacidade' }} />
      </Stack>
    </>
  );
}
