import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { he } from '@/i18n/he';
import { listLessons } from '@/db/repos/lessons';
import type { Lesson } from '@/db/schema';
import { useBottomInset } from '@/ui/useBottomInset';
import { formatDateHe } from '@/ui/formatDateHe';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

export default function LessonsList() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const bottomPad = useBottomInset();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listLessons({ limit: 100 }).then((rows) => {
        if (active) setLessons(rows);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  if (lessons === null) {
    return (
      <>
        <Stack.Screen options={{ title: he.lessons.title }} />
        <View style={styles.empty} />
      </>
    );
  }

  if (lessons.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: he.lessons.title }} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{he.lessons.empty}</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: he.lessons.title }} />
      <FlatList
        data={lessons}
        keyExtractor={(l) => l.id}
        contentContainerStyle={[styles.listContent, bottomPad]}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/lessons/${item.id}` as never)}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.title_he}
              </Text>
              <Text style={styles.rowDate}>{formatDateHe(item.created_at)}</Text>
            </View>
            <Text style={styles.rowMeta}>
              כיתה {item.grade_band} · {item.duration_min} דק׳ · {item.pedagogical_model ?? '—'}
            </Text>
            <Text style={styles.rowGoal} numberOfLines={1}>
              {item.goal_he}
            </Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </>
  );
}

const createStyles = (theme: ThemeTokens) =>
  StyleSheet.create({
    listContent: { padding: 16, gap: 0 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyText: { color: theme.text.muted, fontSize: 16, lineHeight: 24, textAlign: 'center' },
    row: { backgroundColor: theme.bg.card, padding: 14, borderRadius: 10, gap: 4 },
    rowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    rowTitle: { color: theme.text.primary, fontSize: 17, fontWeight: '600', flex: 1 },
    rowDate: { color: theme.text.faint, fontSize: 12 },
    rowMeta: { color: theme.text.muted, fontSize: 12 },
    rowGoal: { color: theme.text.secondary, fontSize: 13, marginTop: 2 },
    separator: { height: 10 },
  });
