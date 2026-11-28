import { ScrollView, View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { ptAO } from '../../locales/pt-AO';
import { useAuthStore } from '../../store/useAuthStore';
import { getIntegrationReadiness } from '../../services/supabase/client';
import { getNotificationCapabilityState } from '../../services/notifications/notificationsService';
import { signOutUser } from '../../services/auth/authService';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, dataSaverEnabled, setDataSaverEnabled } = useAuthStore();
  const readiness = getIntegrationReadiness();
  const notifications = getNotificationCapabilityState();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{ptAO.profile.title}</Text>

      {!readiness.supabaseConfigured && (
        <View style={styles.card}>
          <Text style={styles.badge}>{ptAO.common.pendingSetupBadge}</Text>
          <Text style={styles.body}>{ptAO.setupStatus.supabaseMissing}</Text>
        </View>
      )}

      {profile && (
        <View style={styles.card}>
          <Text style={styles.label}>{profile.fullName}</Text>
          {profile.email ? <Text style={styles.body}>{profile.email}</Text> : null}
          {profile.phone ? <Text style={styles.body}>{profile.phone}</Text> : null}
          <Text style={styles.body}>
            {ptAO.profile.accountStatusLabel}: {ptAO.profile.statuses[profile.accountStatus].label}
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>{ptAO.profile.dataSaver.title}</Text>
        <Text style={styles.body}>{ptAO.profile.dataSaver.description}</Text>
        <Switch value={dataSaverEnabled} onValueChange={setDataSaverEnabled} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{ptAO.profile.pushNotifications.title}</Text>
        <Text style={styles.body}>{notifications.reason}</Text>
      </View>

      <Pressable style={styles.linkButton} onPress={() => router.push('/profile/privacy-legal')}>
        <Text style={styles.linkText}>{ptAO.profile.legalLink}</Text>
      </Pressable>

      {profile?.role === 'admin' && (
        <Pressable style={styles.linkButton} onPress={() => router.push('/admin')}>
          <Text style={styles.linkText}>Área administrativa</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.logoutButton}
        onPress={async () => {
          await signOutUser();
          await SecureStore.deleteItemAsync('kambago_pending_verification_email');
          useAuthStore.getState().setProfile(null);
          router.replace('/(auth)/welcome');
        }}
      >
        <Text style={styles.logoutText}>Terminar sessão</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 22, fontWeight: '700', color: KAMBAGO_COLORS.textPrimary },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KAMBAGO_COLORS.border, borderRadius: 16, padding: 16, gap: 8 },
  badge: { fontSize: 12, fontWeight: '700', color: KAMBAGO_COLORS.warning },
  label: { fontSize: 16, fontWeight: '700', color: KAMBAGO_COLORS.textPrimary },
  body: { fontSize: 14, color: KAMBAGO_COLORS.textSecondary, lineHeight: 20 },
  linkButton: { paddingVertical: 14 },
  linkText: { color: KAMBAGO_COLORS.primaryDark, fontWeight: '600', fontSize: 15 },
  logoutButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: KAMBAGO_COLORS.danger,
  },
  logoutText: {
    color: KAMBAGO_COLORS.danger,
    fontWeight: '700',
    textAlign: 'center',
  },
});
