import { View, Text, Pressable, StyleSheet } from 'react-native';
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
        <Text style={styles.brand}>{ptAO.brand.name}</Text>
        <Text style={styles.slogan}>{ptAO.brand.slogan}</Text>
        <Text style={styles.tagline}>{ptAO.brand.tagline}</Text>
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
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.navy, padding: 24, justifyContent: 'space-between' },
  hero: { marginTop: 64 },
  brand: { fontSize: 34, fontWeight: '700', color: '#FFFFFF' },
  slogan: { fontSize: 20, fontWeight: '600', color: KAMBAGO_COLORS.teal, marginTop: 8 },
  tagline: { fontSize: 15, color: '#CBD5E1', marginTop: 12, lineHeight: 22 },
  banner: { backgroundColor: KAMBAGO_COLORS.amberSurface, padding: 14, borderRadius: 12 },
  bannerTitle: { fontSize: 13, fontWeight: '700', color: KAMBAGO_COLORS.amberText },
  bannerText: { fontSize: 13, color: KAMBAGO_COLORS.navy, marginTop: 4 },
  actions: { gap: 12, marginBottom: 24 },
  primaryButton: { backgroundColor: KAMBAGO_COLORS.teal, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: { backgroundColor: '#1E3A5F', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  secondaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
