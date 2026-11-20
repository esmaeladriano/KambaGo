import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { KAMBAGO_COLORS } from '../../constants/theme';
import { ptAO } from '../../locales/pt-AO';

export default function PrivacyLegalScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.draftNotice}>{ptAO.legal.draftNotice}</Text>
      <Text style={styles.title}>{ptAO.legal.title}</Text>
      {ptAO.legal.sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionBody}>{section.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: KAMBAGO_COLORS.background },
  content: { padding: 20, gap: 16 },
  draftNotice: { backgroundColor: KAMBAGO_COLORS.amberSurface, color: KAMBAGO_COLORS.amberText, padding: 12, borderRadius: 12, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700', color: KAMBAGO_COLORS.navy },
  section: { gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: KAMBAGO_COLORS.navy },
  sectionBody: { fontSize: 14, color: KAMBAGO_COLORS.textSecondary, lineHeight: 21 },
});
