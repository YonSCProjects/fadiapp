import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { createClass, listClasses } from '@/db/repos/classes';
import type { Class } from '@/db/schema';
import { he } from '@/i18n/he';
import { ClassEditModal } from '@/ui/ClassEditModal';
import { useBottomInset } from '@/ui/useBottomInset';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

export default function ClassesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const bottomPad = useBottomInset();

  const load = useCallback(async (active: () => boolean) => {
    const rows = await listClasses();
    if (active()) setClasses(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      load(() => live);
      return () => {
        live = false;
      };
    }, [load]),
  );

  async function onAdd(name: string) {
    await createClass({ name });
    const rows = await listClasses();
    setClasses(rows);
  }

  return (
    <>
      <Stack.Screen options={{ title: he.classes.title }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, bottomPad]}
      >
        <Text style={styles.subtitle}>{he.classes.subtitle}</Text>

        <View style={styles.list}>
          {classes.length === 0 ? (
            <Text style={styles.empty}>{he.classes.empty}</Text>
          ) : (
            classes.map((c) => (
              <Pressable
                key={c.id}
                style={styles.card}
                onPress={() => router.push(`/classes/${c.id}` as never)}
              >
                <View style={styles.cardMain}>
                  <Text style={styles.cardName}>{c.name}</Text>
                  {c.educator_email && (
                    <Text style={styles.cardEmail} numberOfLines={1}>
                      {c.educator_email}
                    </Text>
                  )}
                </View>
                <Text style={styles.cardAction}>{he.classes.edit}</Text>
              </Pressable>
            ))
          )}
        </View>

        <Pressable style={styles.addBtn} onPress={() => setAddOpen(true)}>
          <Text style={styles.addBtnLabel}>+ {he.classes.addCta}</Text>
        </Pressable>
      </ScrollView>

      <ClassEditModal
        visible={addOpen}
        cls={null}
        onClose={() => setAddOpen(false)}
        onSave={onAdd}
      />
    </>
  );
}

const createStyles = (theme: ThemeTokens) =>
  StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, gap: 12 },
    subtitle: { color: theme.text.muted, fontSize: 14, lineHeight: 20, marginBottom: 8 },
    list: { gap: 8 },
    empty: {
      color: theme.text.muted,
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 24,
    },
    card: {
      backgroundColor: theme.bg.card,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border.subtle,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    cardMain: { flex: 1, gap: 2 },
    cardName: { color: theme.text.primary, fontSize: 17, fontWeight: '600' },
    cardEmail: { color: theme.text.muted, fontSize: 13 },
    cardAction: { color: theme.accent.link, fontSize: 14 },
    addBtn: {
      marginTop: 12,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.accent.primary,
      borderStyle: 'dashed',
      alignItems: 'center',
    },
    addBtnLabel: { color: theme.accent.link, fontSize: 15, fontWeight: '600' },
  });
