import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Linking } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'expo-router';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { ptAO } from '../../locales/pt-AO';
import { getSupabaseClient } from '../../services/supabase/client';

const resetPasswordSchema = z.object({
  password: z.string().min(8, ptAO.validation.passwordMin),
  confirmPassword: z.string().min(1, ptAO.validation.required),
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: ptAO.validation.passwordsMismatch,
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!supabase) {
        setFeedback('Supabase não configurado.');
        return;
      }
      const url = await Linking.getInitialURL();
      if (url && url.includes('kambago://reset-password')) {
        const fragment = url.split('#')[1] || '';
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error) {
            setHasRecoverySession(true);
          } else {
            setFeedback('Link inválido ou expirado.');
          }
        } else {
          setFeedback('Link inválido ou expirado.');
        }
      } else {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setHasRecoverySession(true);
        }
      }
    };
    void init();
    if (!supabase) return;

    const { data: subData } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && mounted)) {
        setHasRecoverySession(!!session);
      }
    });
    return () => {
      mounted = false;
      subData?.subscription?.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    const subscription = Linking.addEventListener('url', ({ url }) => {
      void (async () => {
        if (!url.includes('kambago://reset-password')) return;
        const fragment = url.split('#')[1] || '';
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error) {
            setHasRecoverySession(true);
            setFeedback(null);
          } else {
            setFeedback('Link inválido ou expirado.');
          }
        }
      })();
    });
    return () => {
      subscription.remove();
    };
  }, [supabase]);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!supabase || !hasRecoverySession) {
      setFeedback('Link inválido ou expirado.');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setIsLoading(false);
    if (error) {
      setFeedback(error.message);
      return;
    }
    setFeedback('Palavra-passe atualizada com sucesso.');
    setTimeout(() => router.replace('/(auth)/login'), 1200);
  };

  if (!hasRecoverySession) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{ptAO.auth.forgotTitle}</Text>
        <Text style={styles.error}>Link inválido ou expirado.</Text>
        <Pressable style={styles.button} onPress={() => router.push('/(auth)/forgot-password')}>
          <Text style={styles.buttonText}>Pedir novo link de recuperação</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nova palavra-passe</Text>
      <Text style={styles.subtitle}>Cria uma nova palavra-passe para a tua conta.</Text>
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
          />
        )}
      />
      {errors.confirmPassword && <Text style={styles.error}>{errors.confirmPassword.message}</Text>}
      <Pressable style={styles.button} disabled={isLoading} onPress={() => void handleSubmit(onSubmit)()}>
        <Text style={styles.buttonText}>{isLoading ? 'A guardar...' : 'Guardar palavra-passe'}</Text>
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
