import { useMemo } from 'react';
import { Link, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { he } from '@/i18n/he';
import { useBottomInset } from '@/ui/useBottomInset';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

export default function Home() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const bottomPad = useBottomInset();
  return (
    <>
      <Stack.Screen options={{ title: he.appName }} />
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, bottomPad]}>
        <Text style={styles.title}>{he.home.title}</Text>
        <Text style={styles.subtitle}>{he.home.subtitle}</Text>

        <View style={styles.section}>
          <Card href="/(designer)" label={he.home.designerCta} theme={theme} />
          <Card href="/lessons" label={he.home.lessonsCta} theme={theme} />
          <Card href="/lessons" label={he.home.runnerCta} theme={theme} />
          <Card href="/(docs)" label={he.home.docsCta} theme={theme} disabled />
        </View>

        <View style={styles.section}>
          <Card href="/settings" label={he.home.settingsCta} theme={theme} />
        </View>

        <Text style={styles.sectionHeader}>{he.home.spikesHeader}</Text>
        <View style={styles.section}>
          <Card href="/spike/rtl" label={he.home.rtlSpike} theme={theme} />
          <Card href="/spike/timer" label={he.home.timerSpike} theme={theme} />
          <Card href="/spike/drive" label={he.home.driveSpike} theme={theme} />
        </View>
      </ScrollView>
    </>
  );
}

function Card({
  href,
  label,
  disabled,
  theme,
}: {
  href: string;
  label: string;
  disabled?: boolean;
  theme: ThemeTokens;
}) {
  const styles = useMemo(() => createStyles(theme), [theme]);
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

const createStyles = (theme: ThemeTokens) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, gap: 12 },
    title: { color: theme.text.primary, fontSize: 28, fontWeight: '700' },
    subtitle: { color: theme.text.muted, fontSize: 16, marginBottom: 8 },
    sectionHeader: {
      color: theme.text.muted,
      fontSize: 14,
      marginTop: 16,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    section: { gap: 8 },
    card: {
      backgroundColor: theme.bg.input,
      padding: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardDisabled: { opacity: 0.5 },
    cardLabel: { color: theme.text.primary, fontSize: 18, fontWeight: '600' },
    cardSoon: { color: theme.text.muted, fontSize: 12 },
  });
