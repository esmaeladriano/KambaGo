import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { ptAO } from '../../locales/pt-AO';
import {
  emailVerificationSchema,
  type EmailVerificationFormValues,
} from '../../utils/validation';
import {
  sendEmailVerificationCode,
  verifyEmailCode,
} from '../../services/auth/authService';
import { useAuthStore } from '../../store/useAuthStore';

const PENDING_EMAIL_STORAGE_KEY = 'kambago_pending_verification_email';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const emailFromRoute =
    typeof params.email === 'string' ? params.email.trim().toLowerCase() : '';
  const setPendingVerificationEmail = useAuthStore((s) => s.setPendingVerificationEmail);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);
  const [email, setEmail] = useState('');
  const [hasEmail, setHasEmail] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EmailVerificationFormValues>({
    resolver: zodResolver(emailVerificationSchema),
    defaultValues: {
      email: '',
      code: '',
    },
  });
  const code = watch('code');

  useEffect(() => {
    let mounted = true;
    const resolveEmail = async () => {
      const routeEmail = emailFromRoute || '';
      if (routeEmail) {
        setEmail(routeEmail);
        setHasEmail(true);
        await setPendingVerificationEmail(routeEmail);
        await SecureStore.setItemAsync(PENDING_EMAIL_STORAGE_KEY, routeEmail);
        return;
      }
      const stored = await SecureStore.getItemAsync(PENDING_EMAIL_STORAGE_KEY);
      if (stored && mounted) {
        setEmail(stored);
        setHasEmail(true);
        await setPendingVerificationEmail(stored);
      } else if (mounted) {
        setHasEmail(false);
      }
    };
    void resolveEmail();
    return () => {
      mounted = false;
    };
  }, [emailFromRoute, setPendingVerificationEmail]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const clearPendingEmail = async () => {
    await SecureStore.deleteItemAsync(PENDING_EMAIL_STORAGE_KEY);
    await setPendingVerificationEmail('');
  };

  const onSubmit = async (values: EmailVerificationFormValues) => {
    const res = await verifyEmailCode({ email, code: values.code });
    setFeedback(res.message);
    if (res.ok && res.data) {
      const confirmedProfile = res.data;
      setProfile(confirmedProfile);
      setVerified(true);
      await clearPendingEmail();
      if (confirmedProfile.accountStatus === 'ativa') {
        setTimeout(() => {
          router.replace(
            confirmedProfile.role === 'driver'
              ? '/(driver)'
              : '/(passenger)'
          );
        }, 900);
      }
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0 || !email) return;
    setIsResending(true);
    const res = await sendEmailVerificationCode(email);
    setFeedback(res.message);
    if (res.ok) setResendSeconds(60);
    setIsResending(false);
  };

  if (!hasEmail) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{ptAO.auth.verifyEmailTitle}</Text>
        <Text style={styles.subtitle}>{ptAO.auth.verifyEmailSubtitle}</Text>
        <Text style={styles.error}>
          Não encontrámos o e-mail do registo.
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => router.replace('/(auth)/register')}
        >
          <Text style={styles.buttonText}>Voltar ao registo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{ptAO.auth.verifyEmailTitle}</Text>
      <Text style={styles.subtitle}>{ptAO.auth.verifyEmailSubtitle}</Text>
      {feedback ? (
        <Text style={[styles.feedback, verified ? styles.feedbackSuccess : null]}>
          {feedback}
        </Text>
      ) : (
        <Text style={styles.feedback}>
          Conta criada. Verificamos o teu e-mail antes de ativar a conta.
        </Text>
      )}

      <View style={styles.emailCard}>
        <Text style={styles.emailLabel}>E-mail utilizado no cadastro</Text>
        <Text style={styles.emailText}>{email}</Text>
        <Pressable onPress={() => router.replace('/(auth)/register')}>
          <Text style={styles.editEmail}>Corrigir e-mail</Text>
        </Pressable>
      </View>

      <Controller
        control={control}
        name="code"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            placeholder={ptAO.auth.fields.emailCodePlaceholder}
            value={value}
            onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
            autoComplete="one-time-code"
            accessibilityLabel="Código de confirmação de seis dígitos"
          />
        )}
      />
      {errors.code && <Text style={styles.error}>{errors.code.message}</Text>}

      <Pressable
        style={styles.button}
        disabled={
          isSubmitting ||
          verified ||
          (code?.replace(/\D/g, '').length ?? 0) !== 6
        }
        onPress={() => void handleSubmit(onSubmit)()}
      >
        <Text style={styles.buttonText}>
          {isSubmitting
            ? 'A verificar...'
            : verified
              ? 'E-mail confirmado'
              : ptAO.auth.actions.submitVerifyEmail}
        </Text>
      </Pressable>
      <Pressable
        disabled={isResending || verified || resendSeconds > 0}
        onPress={handleResend}
      >
        <Text style={styles.link}>
          {isResending
            ? 'A reenviar código...'
            : resendSeconds > 0
              ? `Reenviar código em 00:${String(resendSeconds).padStart(2, '0')}`
              : 'Reenviar código'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: KAMBAGO_COLORS.navy },
  subtitle: { fontSize: 14, color: KAMBAGO_COLORS.textSecondary },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: KAMBAGO_COLORS.border,
    borderRadius: 12,
    padding: 14,
  },
  error: { color: KAMBAGO_COLORS.danger, fontSize: 13 },
  feedback: {
    backgroundColor: KAMBAGO_COLORS.amberSurface,
    color: KAMBAGO_COLORS.amberText,
    padding: 12,
    borderRadius: 10,
  },
  feedbackSuccess: {
    backgroundColor: KAMBAGO_COLORS.successSurface,
    color: KAMBAGO_COLORS.success,
  },
  emailCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: KAMBAGO_COLORS.border,
    borderRadius: 12,
    padding: 12,
  },
  emailLabel: {
    color: KAMBAGO_COLORS.textMuted,
    fontSize: 12,
  },
  emailText: {
    color: KAMBAGO_COLORS.navy,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 3,
  },
  editEmail: {
    color: KAMBAGO_COLORS.tealDark,
    fontWeight: '700',
    marginTop: 8,
  },
  button: {
    backgroundColor: KAMBAGO_COLORS.teal,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  link: { color: KAMBAGO_COLORS.navy, fontWeight: '600', textAlign: 'center', marginTop: 8 },
});
