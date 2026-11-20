import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    const res = await loginUser(values);
    setFeedback(res.message);
    if (res.ok && res.data) {
      setProfile(res.data);
      router.replace('/profile');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{ptAO.auth.loginTitle}</Text>
      {feedback && <Text style={styles.feedback}>{feedback}</Text>}

      <Controller
        control={control}
        name="identifier"
        render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} placeholder={ptAO.auth.fields.phonePlaceholder} value={value} onChangeText={onChange} />
        )}
      />
      {errors.identifier && <Text style={styles.error}>{errors.identifier.message}</Text>}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} placeholder={ptAO.auth.fields.passwordPlaceholder} value={value} onChangeText={onChange} secureTextEntry />
        )}
      />
      {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

      <Pressable style={styles.button} disabled={isSubmitting} onPress={() => void handleSubmit(onSubmit)()}>
        <Text style={styles.buttonText}>{ptAO.auth.actions.submitLogin}</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
        <Text style={styles.link}>{ptAO.auth.actions.forgotLink}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: KAMBAGO_COLORS.navy },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KAMBAGO_COLORS.border, borderRadius: 12, padding: 14 },
  error: { color: KAMBAGO_COLORS.danger, fontSize: 13 },
  feedback: { backgroundColor: KAMBAGO_COLORS.amberSurface, color: KAMBAGO_COLORS.amberText, padding: 12, borderRadius: 10 },
  button: { backgroundColor: KAMBAGO_COLORS.teal, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  link: { color: KAMBAGO_COLORS.navy, fontWeight: '600', textAlign: 'center', marginTop: 8 },
});
