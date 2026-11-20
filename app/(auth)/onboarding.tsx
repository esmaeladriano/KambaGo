import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { ptAO } from '../../locales/pt-AO';

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const slides = ptAO.onboarding.slides;
  const current = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <View style={styles.container}>
      <Text style={styles.step}>
        {ptAO.onboarding.stepLabel} {step + 1} / {slides.length}
      </Text>
      <View style={styles.card}>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          style={styles.primary}
          onPress={() => (isLast ? router.push('/(auth)/register') : setStep(step + 1))}
        >
          <Text style={styles.primaryText}>
            {isLast ? ptAO.onboarding.finishCta : ptAO.common.next}
          </Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.secondaryText}>{ptAO.onboarding.loginCta}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background, padding: 24, justifyContent: 'space-between' },
  step: { marginTop: 48, fontSize: 13, fontWeight: '600', color: KAMBAGO_COLORS.textSecondary },
  card: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 20, borderWidth: 1, borderColor: KAMBAGO_COLORS.border },
  title: { fontSize: 24, fontWeight: '700', color: KAMBAGO_COLORS.navy },
  body: { fontSize: 16, color: KAMBAGO_COLORS.textSecondary, marginTop: 12, lineHeight: 24 },
  actions: { gap: 12, marginBottom: 24 },
  primary: { backgroundColor: KAMBAGO_COLORS.teal, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondary: { paddingVertical: 14, alignItems: 'center' },
  secondaryText: { color: KAMBAGO_COLORS.navy, fontSize: 15, fontWeight: '600' },
});
