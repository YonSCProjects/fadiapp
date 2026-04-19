import { Link, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { he } from '@/i18n/he';

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ title: he.appName }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{he.home.title}</Text>
        <Text style={styles.subtitle}>{he.home.subtitle}</Text>

        <View style={styles.section}>
          <Card href="/(designer)" label={he.home.designerCta} disabled />
          <Card href="/(runner)" label={he.home.runnerCta} disabled />
          <Card href="/(docs)" label={he.home.docsCta} disabled />
        </View>

        <Text style={styles.sectionHeader}>{he.home.spikesHeader}</Text>
        <View style={styles.section}>
          <Card href="/spike/rtl" label={he.home.rtlSpike} />
          <Card href="/spike/timer" label={he.home.timerSpike} />
          <Card href="/spike/drive" label={he.home.driveSpike} />
        </View>
      </ScrollView>
    </>
  );
}

function Card({ href, label, disabled }: { href: string; label: string; disabled?: boolean }) {
  if (disabled) {
    return (
      <View style={[styles.card, styles.cardDisabled]}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardSoon}>בקרוב</Text>
      </View>
    );
  }
  return (
    <Link href={href as never} asChild>
      <Pressable style={styles.card}>
        <Text style={styles.cardLabel}>{label}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12 },
  title: { color: '#f5f5f5', fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#a0a0a8', fontSize: 16, marginBottom: 8 },
  sectionHeader: {
    color: '#a0a0a8',
    fontSize: 14,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: { gap: 8 },
  card: {
    backgroundColor: '#23232a',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardDisabled: { opacity: 0.5 },
  cardLabel: { color: '#f5f5f5', fontSize: 18, fontWeight: '600' },
  cardSoon: { color: '#a0a0a8', fontSize: 12 },
});
