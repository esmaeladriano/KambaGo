import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { ptAO } from '../../locales/pt-AO';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../../utils/validation';
import { updatePassword } from '../../services/auth/authService';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token, type } = useLocalSearchParams<{ token?: string; type?: string }>();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token || type !== 'recovery') {
      setFeedback(ptAO.auth.feedback.resetInvalidLink);
      return;
    }

    const res = await updatePassword(token, values.password);
    setFeedback(res.message);
    if (res.ok) {
      setIsSuccess(true);
    }
  };

  if (isSuccess) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{ptAO.auth.resetSuccessTitle}</Text>
        <Text style={styles.subtitle}>{ptAO.auth.resetSuccessSubtitle}</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.buttonText}>{ptAO.auth.actions.goToLogin}</Text>
        </Pressable>
      </View>
    );
  }

  if (!token || type !== 'recovery') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{ptAO.auth.resetInvalidTitle}</Text>
        <Text style={styles.subtitle}>{ptAO.auth.feedback.resetInvalidLink}</Text>
        <Pressable style={styles.button} onPress={() => router.push('/(auth)/forgot-password')}>
          <Text style={styles.buttonText}>{ptAO.auth.actions.submitForgot}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{ptAO.auth.resetTitle}</Text>
      <Text style={styles.subtitle}>{ptAO.auth.resetSubtitle}</Text>
      {feedback && <Text style={styles.feedback}>{feedback}</Text>}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            placeholder={ptAO.auth.fields.passwordPlaceholder}
            value={value}
            onChangeText={onChange}
            secureTextEntry
            autoComplete="new-password"
          />
        )}
      />
      {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            placeholder={ptAO.auth.fields.confirmPasswordPlaceholder}
            value={value}
            onChangeText={onChange}
            secureTextEntry
            autoComplete="new-password"
          />
        )}
      />
      {errors.confirmPassword && <Text style={styles.error}>{errors.confirmPassword.message}</Text>}

      <Pressable
        style={styles.button}
        disabled={isSubmitting}
        onPress={() => void handleSubmit(onSubmit)()}
      >
        <Text style={styles.buttonText}>{ptAO.auth.actions.submitReset}</Text>
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
});