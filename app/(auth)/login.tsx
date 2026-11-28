import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Image, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { ptAO } from '../../locales/pt-AO';
import { loginSchema, type LoginFormValues } from '../../utils/validation';
import { loginUser } from '../../services/auth/authService';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginScreen() {
  const router = useRouter();
  const setProfile = useAuthStore((s) => s.setProfile);
  const setPendingVerificationEmail = useAuthStore((s) => s.setPendingVerificationEmail);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    const res = await loginUser(values);
    if (res.requiresEmailVerification) {
      setFeedback('Ainda precisas de confirmar o teu e-mail.');
      setPendingVerificationEmail(values.email.trim().toLowerCase());
      router.push({
        pathname: '/(auth)/verify-email',
        params: { email: values.email.trim().toLowerCase() },
      });
    } else if (/network|fetch/i.test(res.message)) {
      setFeedback('Sem ligação à internet. Verifica a tua conexão.');
    } else if (res.status === 'error') {
      setFeedback('Não foi possível iniciar sessão. Verifica os teus dados.');
    } else {
      setFeedback(res.message);
    }
    if (res.ok && res.data) {
      setProfile(res.data);
      router.replace(res.data.role === 'driver' ? '/(driver)' : '/(passenger)');
    } else if (res.requiresEmailVerification && res.data) {
      // Email não confirmado: redireciona para verificação com o e-mail da conta
      const emailParam = res.data.email ? `?email=${encodeURIComponent(res.data.email)}` : '';
      router.push(`/auth/verify-email${emailParam}`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image
        source={require('../../assets/images/kambago-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>{ptAO.auth.loginTitle}</Text>
      <Text style={styles.subtitle}>{ptAO.auth.loginSubtitle}</Text>
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
        name="password"
        render={({ field: { onChange, value } }) => (
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={ptAO.auth.fields.passwordPlaceholder}
              value={value}
              onChangeText={onChange}
              secureTextEntry={!showPassword}
            />
            <Pressable
              accessibilityRole="button"
              style={styles.passwordToggle}
              onPress={() => setShowPassword((visible) => !visible)}
            >
              <Text style={styles.passwordToggleText}>
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </Text>
            </Pressable>
          </View>
        )}
      />
      {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

      <Pressable
        style={styles.button}
        disabled={isSubmitting}
        onPress={() => void handleSubmit(onSubmit)()}
      >
        <Text style={styles.buttonText}>{ptAO.auth.actions.submitLogin}</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
        <Text style={styles.link}>{ptAO.auth.actions.forgotLink}</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/register')}>
        <Text style={styles.link}>Ainda não tens conta? Criar conta</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 24, gap: 12, alignItems: 'stretch' },
  logo: { width: 120, height: 120, alignSelf: 'center', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: KAMBAGO_COLORS.textPrimary },
  subtitle: { fontSize: 15, color: KAMBAGO_COLORS.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: KAMBAGO_COLORS.border,
    borderRadius: 12,
    padding: 14,
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 82 },
  passwordToggle: { position: 'absolute', right: 14, top: 14 },
  passwordToggleText: { color: KAMBAGO_COLORS.primaryDark, fontWeight: '700', fontSize: 13 },
  error: { color: KAMBAGO_COLORS.danger, fontSize: 13 },
  feedback: {
    backgroundColor: KAMBAGO_COLORS.warningSurface,
    color: KAMBAGO_COLORS.warning,
    padding: 12,
    borderRadius: 10,
  },
  button: {
    backgroundColor: KAMBAGO_COLORS.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  link: { color: KAMBAGO_COLORS.textPrimary, fontWeight: '600', textAlign: 'center', marginTop: 8 },
});
