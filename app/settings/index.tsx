import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import { he } from '@/i18n/he';
import { useTheme, useThemeSwitcher } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';
import { useBottomInset } from '@/ui/useBottomInset';

export default function Settings() {
  const theme = useTheme();
  const { themeName, setTheme, available } = useThemeSwitcher();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const bottomPad = useBottomInset();

  const version = Constants.expoConfig?.version ?? '—';
  const runtimeVersion =
    typeof Constants.expoConfig?.runtimeVersion === 'string'
      ? Constants.expoConfig.runtimeVersion
      : null;

  return (
    <>
      <Stack.Screen options={{ title: he.settings.title }} />
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, bottomPad]}>
        <Text style={styles.sectionLabel}>{he.settings.themeLabel}</Text>
        <Text style={styles.sectionSubtitle}>{he.settings.themeSubtitle}</Text>

        <View style={styles.themeList}>
          {available.map((t) => {
            const selected = t.name === themeName;
            return (
              <Pressable
                key={t.name}
                onPress={() => setTheme(t.name)}
                style={[
                  styles.themeCard,
                  { borderColor: selected ? theme.accent.primary : theme.border.default },
                ]}
              >
                <View style={styles.themeHeader}>
                  <Text style={styles.themeName}>{t.nameHe}</Text>
                  {selected && <Text style={styles.themeSelectedBadge}>✓</Text>}
                </View>
                {/* Swatch strip — visual preview of the palette. */}
                <View style={styles.swatches}>
                  <Swatch color={t.bg.app} />
                  <Swatch color={t.bg.card} />
                  <Swatch color={t.bg.input} />
                  <Swatch color={t.accent.primary} />
                  <Swatch color={t.text.primary} />
                </View>
                <Text
                  style={[
                    styles.themePreviewText,
                    { color: t.text.primary, backgroundColor: t.bg.card },
                  ]}
                >
                  שיעור לדוגמה · כיתה ט׳ · 45 דקות
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, styles.aboutHeader]}>{he.settings.aboutLabel}</Text>
        <View style={styles.aboutCard}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutKey}>{he.settings.versionLabel}</Text>
            <Text style={styles.aboutValue}>{version}</Text>
          </View>
          {runtimeVersion && (
            <View style={styles.aboutRow}>
              <Text style={styles.aboutKey}>runtime</Text>
              <Text style={styles.aboutValue}>{runtimeVersion}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

function Swatch({ color }: { color: string }) {
  return <View style={[swatchStyle, { backgroundColor: color }]} />;
}

const swatchStyle = {
  width: 36,
  height: 36,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.08)',
} as const;

const createStyles = (theme: ThemeTokens) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, gap: 8 },
    sectionLabel: {
      color: theme.text.muted,
      fontSize: 14,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    sectionSubtitle: { color: theme.text.muted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
    themeList: { gap: 12 },
    themeCard: {
      backgroundColor: theme.bg.card,
      padding: 14,
      borderRadius: 12,
      borderWidth: 2,
      gap: 10,
    },
    themeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    themeName: { color: theme.text.primary, fontSize: 18, fontWeight: '700' },
    themeSelectedBadge: {
      color: theme.accent.primary,
      fontSize: 20,
      fontWeight: '700',
    },
    swatches: { flexDirection: 'row', gap: 6 },
    themePreviewText: {
      fontSize: 13,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 6,
    },
    aboutHeader: { marginTop: 24 },
    aboutCard: {
      backgroundColor: theme.bg.card,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border.default,
      gap: 6,
      marginTop: 8,
    },
    aboutRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    aboutKey: { color: theme.text.muted, fontSize: 14 },
    aboutValue: {
      color: theme.text.secondary,
      fontSize: 14,
      fontVariant: ['tabular-nums'],
    },
  });
