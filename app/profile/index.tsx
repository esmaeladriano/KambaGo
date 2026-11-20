import { ScrollView, View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { ptAO } from '../../locales/pt-AO';
import { useAuthStore } from '../../store/useAuthStore';
import { getIntegrationReadiness } from '../../services/supabase/client';
import { getNotificationCapabilityState } from '../../services/notifications/notificationsService';

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
          <Text style={styles.body}>{profile.phone}</Text>
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
        <Text style={styles.label}>{ptAO.profile.smsNotifications.title}</Text>
        <Text style={styles.body}>{notifications.reason}</Text>
      </View>

      <Pressable style={styles.linkButton} onPress={() => router.push('/profile/privacy-legal')}>
        <Text style={styles.linkText}>{ptAO.profile.legalLink}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 22, fontWeight: '700', color: KAMBAGO_COLORS.navy },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: KAMBAGO_COLORS.border, borderRadius: 16, padding: 16, gap: 8 },
  badge: { fontSize: 12, fontWeight: '700', color: KAMBAGO_COLORS.amberText },
  label: { fontSize: 16, fontWeight: '700', color: KAMBAGO_COLORS.navy },
  body: { fontSize: 14, color: KAMBAGO_COLORS.textSecondary, lineHeight: 20 },
  linkButton: { paddingVertical: 14 },
  linkText: { color: KAMBAGO_COLORS.tealDark, fontWeight: '600', fontSize: 15 },
});
