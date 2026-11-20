import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { ptAO } from '../../locales/pt-AO';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../../utils/validation';
import { requestPasswordReset } from '../../services/auth/authService';

export default function ForgotPasswordScreen() {
  const [feedback, setFeedback] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    const res = await requestPasswordReset(values.email);
    setFeedback(res.message);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{ptAO.auth.forgotTitle}</Text>
      <Text style={styles.subtitle}>{ptAO.auth.forgotSubtitle}</Text>
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
          />
        )}
      />
      {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

      <Pressable style={styles.button} disabled={isSubmitting} onPress={() => void handleSubmit(onSubmit)()}>
        <Text style={styles.buttonText}>{ptAO.auth.actions.submitForgot}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: KAMBAGO_COLORS.navy },
  subtitle: { fontSize: 14, color: KAMBAGO_COLORS.textSecondary },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KAMBAGO_COLORS.border, borderRadius: 12, padding: 14 },
  error: { color: KAMBAGO_COLORS.danger, fontSize: 13 },
  feedback: { backgroundColor: KAMBAGO_COLORS.amberSurface, color: KAMBAGO_COLORS.amberText, padding: 12, borderRadius: 10 },
  button: { backgroundColor: KAMBAGO_COLORS.teal, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
