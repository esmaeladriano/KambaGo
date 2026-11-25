import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useLocalSearchParams } from 'expo-router';
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

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const pendingVerificationEmail = useAuthStore((s) => s.pendingVerificationEmail);
  const setPendingVerificationEmail = useAuthStore((s) => s.setPendingVerificationEmail);
  const clearPendingVerificationEmail = useAuthStore((s) => s.clearPendingVerificationEmail);
  const setProfile = useAuthStore((s) => s.setProfile);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResendDisabled, setIsResendDisabled] = useState(true);

  const email = emailParam || pendingVerificationEmail || '';

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailVerificationFormValues>({
    resolver: zodResolver(emailVerificationSchema),
    defaultValues: { email, code: '' },
  });

  useEffect(() => {
    if (email) {
      setPendingVerificationEmail(email);
    }
    return () => {
      // Cleanup timer if component unmounts
    };
  }, [email, setPendingVerificationEmail]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setIsResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
    setIsResendDisabled(false);
  }, [resendCooldown]);

  const startResendCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setIsResendDisabled(true);
  };

  const onSubmit = async (values: EmailVerificationFormValues) => {
    const res = await verifyEmailCode(values);
    setFeedback(res.message);
    if (res.ok && res.data) {
      clearPendingVerificationEmail();
      setProfile(res.data);
      if (res.data.accountStatus === 'ativa') {
        router.replace(res.data.role === 'driver' ? '/(driver)' : '/(passenger)');
      } else if (res.data.role === 'driver') {
        router.replace('/(driver)');
      }
    }
  };

  const handleResend = async () => {
    if (isResendDisabled || !email) return;
    const res = await sendEmailVerificationCode(email);
    setFeedback(res.message);
    if (res.ok) {
      startResendCooldown();
    }
  };

  const handleFixEmail = () => {
    if (email) {
      router.push(`/auth/register?email=${encodeURIComponent(email)}`);
    } else {
      router.push('/auth/register');
    }
  };

  const handleBackToRegister = () => {
    router.push('/auth/register');
  };

  if (!email) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{ptAO.auth.verifyEmailTitle}</Text>
        <Text style={styles.subtitle}>{ptAO.auth.verifyEmailSubtitleNoEmail}</Text>
        <Pressable style={styles.button} onPress={handleBackToRegister}>
          <Text style={styles.buttonText}>{ptAO.common.back}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{ptAO.auth.verifyEmailTitle}</Text>
      <Text style={styles.subtitle}>{ptAO.auth.verifyEmailSubtitle}</Text>
      {feedback && <Text style={styles.feedback}>{feedback}</Text>}

      <View style={styles.emailCard}>
        <Text style={styles.emailLabel}>{ptAO.auth.fields.email}</Text>
        <Text style={styles.emailValue}>{email}</Text>
        <Pressable onPress={handleFixEmail}>
          <Text style={styles.fixEmailLink}>{ptAO.auth.actions.fixEmail}</Text>
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
            onChangeText={onChange}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
            letterSpacing={8}
          />
        )}
      />
      {errors.code && <Text style={styles.error}>{errors.code.message}</Text>}

      {resendCooldown > 0 && (
        <Text style={styles.cooldownText}>
          {ptAO.auth.feedback.resendCooldown.replace('{s}', String(resendCooldown))}
        </Text>
      )}

      <Pressable
        style={styles.button}
        disabled={isSubmitting}
        onPress={() => void handleSubmit(onSubmit)()}
      >
        <Text style={styles.buttonText}>{ptAO.auth.actions.submitVerifyEmail}</Text>
      </Pressable>

      <Pressable
        style={[styles.resendButton, isResendDisabled && styles.resendButtonDisabled]}
        onPress={handleResend}
        disabled={isResendDisabled || isSubmitting}
      >
        <Text style={styles.resendButtonText}>{ptAO.auth.actions.resendEmailCode}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: KAMBAGO_COLORS.navy },
  subtitle: { fontSize: 14, color: KAMBAGO_COLORS.textSecondary },
  feedback: {
    backgroundColor: KAMBAGO_COLORS.amberSurface,
    color: KAMBAGO_COLORS.amberText,
    padding: 12,
    borderRadius: 10,
  },
  emailCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: KAMBAGO_COLORS.border,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  emailLabel: { fontSize: 12, fontWeight: '600', color: KAMBAGO_COLORS.textSecondary, textTransform: 'uppercase' },
  emailValue: { fontSize: 16, fontWeight: '500', color: KAMBAGO_COLORS.navy },
  fixEmailLink: { color: KAMBAGO_COLORS.teal, fontWeight: '600', fontSize: 13, textAlign: 'right' },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: KAMBAGO_COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 20,
  },
  error: { color: KAMBAGO_COLORS.danger, fontSize: 13 },
  cooldownText: { color: KAMBAGO_COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
  button: {
    backgroundColor: KAMBAGO_COLORS.teal,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  resendButton: { alignItems: 'center', marginTop: 8 },
  resendButtonDisabled: { opacity: 0.5 },
  resendButtonText: { color: KAMBAGO_COLORS.navy, fontWeight: '600', fontSize: 14 },
});