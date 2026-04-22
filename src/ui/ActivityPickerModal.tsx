import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Activity, ActivityCategory } from '@/db/schema';
import { he } from '@/i18n/he';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

type Props = {
  visible: boolean;
  activities: Activity[];
  onClose: () => void;
  onPick: (activity: Activity) => void;
  initialCategory?: ActivityCategory | 'all';
};

const CATEGORIES: Array<{ key: ActivityCategory | 'all'; label: string }> = [
  { key: 'all', label: he.lessons.all },
  { key: 'warmup', label: he.lessons.warmupCat },
  { key: 'skill', label: he.lessons.skillCat },
  { key: 'game', label: he.lessons.gameCat },
  { key: 'fitness', label: he.lessons.fitnessCat },
  { key: 'cooldown', label: he.lessons.cooldownCat },
];

export function ActivityPickerModal({
  visible,
  activities,
  onClose,
  onPick,
  initialCategory = 'all',
}: Props) {
  const [category, setCategory] = useState<ActivityCategory | 'all'>(initialCategory);
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const filtered = useMemo(() => {
    if (category === 'all') return activities;
    return activities.filter((a) => a.category === category);
  }, [activities, category]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{he.lessons.pickActivityTitle}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>×</Text>
          </Pressable>
        </View>

        <View style={styles.categoriesRow}>
          {CATEGORIES.map((c) => {
            const selected = category === c.key;
            return (
              <Text
                key={c.key}
                onPress={() => setCategory(c.key)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                {c.label}
              </Text>
            );
          })}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{he.lessons.pickActivityEmpty}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(a) => a.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => {
                  onPick(item);
                  onClose();
                }}
              >
                <Text style={styles.rowName}>{item.name_he}</Text>
                <Text style={styles.rowMeta}>
                  {CATEGORIES.find((c) => c.key === item.category)?.label ?? item.category}
                  {item.equipment_json && item.equipment_json.length > 0
                    ? ` · ${item.equipment_json.join(', ')}`
                    : ''}
                </Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </Modal>
  );
}

const createStyles = (theme: ThemeTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg.modal, paddingTop: 24 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.subtle,
    },
    title: { color: theme.text.primary, fontSize: 20, fontWeight: '700' },
    close: { color: theme.text.muted, fontSize: 32, lineHeight: 32 },
    categoriesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      padding: 16,
    },
    chip: {
      backgroundColor: theme.bg.input,
      color: theme.text.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      overflow: 'hidden',
      fontSize: 14,
    },
    chipSelected: { backgroundColor: theme.accent.primary, color: theme.accent.primaryText },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyText: { color: theme.text.muted, fontSize: 14 },
    listContent: { padding: 16, paddingBottom: 48 },
    row: { backgroundColor: theme.bg.card, padding: 14, borderRadius: 10, gap: 4 },
    rowName: { color: theme.text.primary, fontSize: 16, fontWeight: '500' },
    rowMeta: { color: theme.text.muted, fontSize: 12 },
    separator: { height: 8 },
  });
