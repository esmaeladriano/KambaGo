import { useState } from 'react';
import {
  View as RNView,
  Text as RNText,
  TextInput as RNTextInput,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { ptAO } from '../../locales/pt-AO';
import { registerSchema, type RegisterFormValues } from '../../utils/validation';
import { registerUser } from '../../services/auth/authService';
import { useAuthStore } from '../../store/useAuthStore';

export default function RegisterScreen() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const setPendingVerificationEmail = useAuthStore((s) => s.setPendingVerificationEmail);
  const [feedback, setFeedback] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: emailParam || '',
      password: '',
      confirmPassword: '',
      role: 'passenger',
      acceptedLegalTerms: false,
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (values: RegisterFormValues) => {
    const result = await registerUser(values);
    setFeedback(result.message);
    if (result.ok) {
      setPendingVerificationEmail(values.email);
      router.push('/(auth)/verify-email');
    }
  };

  return (
    <RNScrollView style={styles.container} contentContainerStyle={styles.content}>
      <RNText style={styles.title}>{ptAO.auth.registerTitle}</RNText>
      <RNText style={styles.subtitle}>{ptAO.auth.registerSubtitle}</RNText>
      {feedback && <RNText style={styles.feedback}>{feedback}</RNText>}

      <RNView style={styles.roleRow}>
        <RNPressable
          style={[styles.roleButton, selectedRole === 'passenger' && styles.roleButtonActive]}
          onPress={() => setValue('role', 'passenger')}
        >
          <RNText
            style={[
              styles.roleButtonText,
              selectedRole === 'passenger' && styles.roleButtonTextActive,
            ]}
          >
            {ptAO.auth.fields.rolePassenger}
          </RNText>
        </RNPressable>
        <RNPressable
          style={[styles.roleButton, selectedRole === 'driver' && styles.roleButtonActive]}
          onPress={() => setValue('role', 'driver')}
        >
          <RNText
            style={[
              styles.roleButtonText,
              selectedRole === 'driver' && styles.roleButtonTextActive,
            ]}
          >
            {ptAO.auth.fields.roleDriver}
          </RNText>
        </RNPressable>
      </RNView>

      <Controller
        control={control}
        name="fullName"
        render={({ field: { onChange, value } }) => (
          <RNTextInput
            style={styles.input}
            placeholder={ptAO.auth.fields.fullNamePlaceholder}
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      {errors.fullName && <RNText style={styles.error}>{errors.fullName.message}</RNText>}

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, value } }) => (
          <RNTextInput
            style={styles.input}
            placeholder="+244 923 456 789"
            value={value}
            onChangeText={onChange}
            keyboardType="phone-pad"
          />
        )}
      />
      {errors.phone && <RNText style={styles.error}>{errors.phone.message}</RNText>}

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <RNTextInput
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
      {errors.email && <RNText style={styles.error}>{errors.email.message}</RNText>}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <RNTextInput
            style={styles.input}
            placeholder={ptAO.auth.fields.passwordPlaceholder}
            value={value}
            onChangeText={onChange}
            secureTextEntry
          />
        )}
      />
      {errors.password && <RNText style={styles.error}>{errors.password.message}</RNText>}

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, value } }) => (
          <RNTextInput
            style={styles.input}
            placeholder={ptAO.auth.fields.confirmPasswordPlaceholder}
            value={value}
            onChangeText={onChange}
            secureTextEntry
          />
        )}
      />
      {errors.confirmPassword && (
        <RNText style={styles.error}>{errors.confirmPassword.message}</RNText>
      )}

      <Controller
        control={control}
        name="acceptedLegalTerms"
        render={({ field: { onChange, value } }) => (
          <RNPressable style={styles.consentRow} onPress={() => onChange(!value)}>
            <RNText style={styles.consentText}>
              {value ? '[x] ' : '[ ] '}
              {ptAO.auth.consent.termsLabel}
            </RNText>
          </RNPressable>
        )}
      />
      {errors.acceptedLegalTerms && (
        <RNText style={styles.error}>{errors.acceptedLegalTerms.message}</RNText>
      )}

      <RNPressable
        style={styles.button}
        disabled={isSubmitting}
        onPress={() => void handleSubmit(onSubmit)()}
      >
        <RNText style={styles.buttonText}>{ptAO.auth.actions.submitRegister}</RNText>
      </RNPressable>
    </RNScrollView>
  );
}

const styles = RNStyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: KAMBAGO_COLORS.navy },
  subtitle: { fontSize: 14, color: KAMBAGO_COLORS.textSecondary },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: KAMBAGO_COLORS.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: KAMBAGO_COLORS.navy,
    borderColor: KAMBAGO_COLORS.navy,
  },
  roleButtonText: { fontSize: 13, fontWeight: '600', color: KAMBAGO_COLORS.textSecondary },
  roleButtonTextActive: { color: '#FFFFFF' },
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
  consentRow: { paddingVertical: 8 },
  consentText: { color: KAMBAGO_COLORS.textSecondary, fontSize: 13 },
  button: {
    backgroundColor: KAMBAGO_COLORS.teal,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  link: {
    color: KAMBAGO_COLORS.navy,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
});
