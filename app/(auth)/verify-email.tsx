import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
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

export default function VerifyEmailScreen() {
  const router = useRouter();
  const pendingVerificationEmail = useAuthStore((s) => s.pendingVerificationEmail);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [feedback, setFeedback] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<EmailVerificationFormValues>({
    resolver: zodResolver(emailVerificationSchema),
    defaultValues: { email: pendingVerificationEmail || '', code: '' },
  });

  const onSubmit = async (values: EmailVerificationFormValues) => {
    const res = await verifyEmailCode(values);
    setFeedback(res.message);
    if (res.ok && res.data) {
      setProfile(res.data);
      if (res.data.accountStatus === 'ativa') {
        router.replace(res.data.role === 'driver' ? '/(driver)' : '/(passenger)');
      }
    }
  };

  const handleResend = async () => {
    const res = await sendEmailVerificationCode(getValues('email'));
    setFeedback(res.message);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{ptAO.auth.verifyEmailTitle}</Text>
      <Text style={styles.subtitle}>{ptAO.auth.verifyEmailSubtitle}</Text>
      {feedback && <Text style={styles.feedback}>{feedback}</Text>}

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            placeholder={ptAO.auth.fields.emailPlaceholder}
            value={value}
            onChangeText={onChange}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}
      />
      {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

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
          />
        )}
      />
      {errors.code && <Text style={styles.error}>{errors.code.message}</Text>}

      <Pressable
        style={styles.button}
        disabled={isSubmitting}
        onPress={() => void handleSubmit(onSubmit)()}
      >
        <Text style={styles.buttonText}>{ptAO.auth.actions.submitVerifyEmail}</Text>
      </Pressable>
      <Pressable onPress={handleResend}>
        <Text style={styles.link}>{ptAO.auth.actions.resendEmailCode}</Text>
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
  button: {
    backgroundColor: KAMBAGO_COLORS.teal,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  link: { color: KAMBAGO_COLORS.navy, fontWeight: '600', textAlign: 'center', marginTop: 8 },
});
