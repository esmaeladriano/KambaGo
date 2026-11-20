import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { ptAO } from '../../locales/pt-AO';
import { otpSchema, type OtpFormValues } from '../../utils/validation';
import { sendPhoneOtp, verifyPhoneOtp } from '../../services/auth/authService';
import { useAuthStore } from '../../store/useAuthStore';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const pendingOtpPhone = useAuthStore((s) => s.pendingOtpPhone);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { control, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { phone: pendingOtpPhone || '+244 ', code: '' },
  });

  const onSubmit = async (values: OtpFormValues) => {
    const res = await verifyPhoneOtp(values);
    setFeedback(res.message);
    if (res.ok && res.data) {
      setProfile(res.data);
      if (res.data.accountStatus === 'ativa') {
        router.replace('/profile');
      }
    }
  };

  const handleResend = async () => {
    const res = await sendPhoneOtp(getValues('phone'));
    setFeedback(res.message);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{ptAO.auth.otpTitle}</Text>
      <Text style={styles.subtitle}>{ptAO.auth.otpSubtitle}</Text>
      {feedback && <Text style={styles.feedback}>{feedback}</Text>}

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} placeholder={ptAO.auth.fields.phonePlaceholder} value={value} onChangeText={onChange} keyboardType="phone-pad" />
        )}
      />
      {errors.phone && <Text style={styles.error}>{errors.phone.message}</Text>}

      <Controller
        control={control}
        name="code"
        render={({ field: { onChange, value } }) => (
          <TextInput style={styles.input} placeholder={ptAO.auth.fields.otpPlaceholder} value={value} onChangeText={onChange} keyboardType="number-pad" maxLength={6} />
        )}
      />
      {errors.code && <Text style={styles.error}>{errors.code.message}</Text>}

      <Pressable style={styles.button} disabled={isSubmitting} onPress={() => void handleSubmit(onSubmit)()}>
        <Text style={styles.buttonText}>{ptAO.auth.actions.submitOtp}</Text>
      </Pressable>
      <Pressable onPress={handleResend}>
        <Text style={styles.link}>{ptAO.auth.actions.resendOtp}</Text>
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
  link: { color: KAMBAGO_COLORS.navy, fontWeight: '600', textAlign: 'center', marginTop: 8 },
});
