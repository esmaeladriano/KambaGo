import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { ptAO } from '../../locales/pt-AO';
import { getIntegrationReadiness } from '../../services/supabase/client';

export default function WelcomeScreen() {
  const router = useRouter();
  const readiness = getIntegrationReadiness();

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Image
          source={require('../../assets/images/kambago-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brand}>{ptAO.brand.name}</Text>
        <Text style={styles.title}>A tua viagem começa aqui.</Text>
        <Text style={styles.subtitle}>
          Partilha o caminho, divide o preço e chega ao teu destino.
        </Text>
      </View>

      {!readiness.supabaseConfigured && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>{ptAO.common.pendingSetupBadge}</Text>
          <Text style={styles.bannerText}>{ptAO.setupStatus.supabaseMissing}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/onboarding')}
        >
          <Text style={styles.primaryButtonText}>{ptAO.welcome.primaryCta}</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.secondaryButtonText}>{ptAO.welcome.secondaryCta}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 24, justifyContent: 'space-between' },
  hero: { marginTop: 54, alignItems: 'center' },
  logo: { width: 180, height: 180 },
  brand: { fontSize: 32, fontWeight: '800', color: KAMBAGO_COLORS.textPrimary },
  title: { fontSize: 26, fontWeight: '800', color: KAMBAGO_COLORS.textPrimary, marginTop: 26, textAlign: 'center' },
  subtitle: { fontSize: 16, color: KAMBAGO_COLORS.textSecondary, marginTop: 10, lineHeight: 24, textAlign: 'center' },
  banner: { backgroundColor: KAMBAGO_COLORS.warningSurface, padding: 14, borderRadius: 12 },
  bannerTitle: { fontSize: 13, fontWeight: '700', color: KAMBAGO_COLORS.warning },
  bannerText: { fontSize: 13, color: KAMBAGO_COLORS.textPrimary, marginTop: 4 },
  actions: { gap: 12, marginBottom: 24 },
  primaryButton: { backgroundColor: KAMBAGO_COLORS.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: KAMBAGO_COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: { color: KAMBAGO_COLORS.primaryDark, fontSize: 15, fontWeight: '700' },
});
