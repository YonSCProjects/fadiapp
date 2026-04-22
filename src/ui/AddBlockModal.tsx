import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ulid } from 'ulidx';
import type { Activity, LessonBlock } from '@/db/schema';
import { he } from '@/i18n/he';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';
import { ActivityPickerModal } from './ActivityPickerModal';

type Props = {
  visible: boolean;
  whitelist: Activity[];
  onClose: () => void;
  onAdd: (block: LessonBlock) => void;
};

const PHASES: Array<{ key: 'warmup' | 'main' | 'cooldown'; label: string }> = [
  { key: 'warmup', label: he.lessons.phaseWarmup },
  { key: 'main', label: he.lessons.phaseMain },
  { key: 'cooldown', label: he.lessons.phaseCooldown },
];

export function AddBlockModal({ visible, whitelist, onClose, onAdd }: Props) {
  const [phase, setPhase] = useState<'warmup' | 'main' | 'cooldown'>('main');
  const [activity, setActivity] = useState<Activity | null>(null);
  const [durationMin, setDurationMin] = useState('5');
  const [pickerOpen, setPickerOpen] = useState(false);
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  function reset() {
    setPhase('main');
    setActivity(null);
    setDurationMin('5');
  }

  function handleAdd() {
    const minutes = Math.max(1, parseInt(durationMin, 10) || 1);
    const block: LessonBlock = {
      id: ulid(),
      phase,
      name_he: activity?.name_he ?? `שלב ${phase}`,
      duration_s: minutes * 60,
      activity_ids: activity ? [activity.id] : [],
    };
    onAdd(block);
    reset();
    onClose();
  }

  const canAdd = activity !== null && parseInt(durationMin, 10) > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{he.lessons.addBlockTitle}</Text>
          <Pressable
            onPress={() => {
              reset();
              onClose();
            }}
            hitSlop={12}
          >
            <Text style={styles.close}>×</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field styles={styles} label={he.lessons.blockPhase}>
            <View style={styles.chipsRow}>
              {PHASES.map((p) => {
                const selected = phase === p.key;
                return (
                  <Text
                    key={p.key}
                    onPress={() => setPhase(p.key)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    {p.label}
                  </Text>
                );
              })}
            </View>
          </Field>

          <Field styles={styles} label={he.lessons.blockActivities}>
            {activity ? (
              <View style={styles.activityRow}>
                <Text style={styles.activityName}>{activity.name_he}</Text>
                <Pressable onPress={() => setPickerOpen(true)}>
                  <Text style={styles.activityAction}>{he.lessons.replaceActivity}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.addActivityBtn} onPress={() => setPickerOpen(true)}>
                <Text style={styles.addActivityLabel}>+ {he.lessons.addActivity}</Text>
              </Pressable>
            )}
          </Field>

          <Field styles={styles} label={he.lessons.blockDuration}>
            <View style={styles.durationRow}>
              <Pressable
                style={styles.stepBtn}
                onPress={() =>
                  setDurationMin(String(Math.max(1, (parseInt(durationMin, 10) || 1) - 1)))
                }
              >
                <Text style={styles.stepBtnLabel}>−</Text>
              </Pressable>
              <TextInput
                value={durationMin}
                onChangeText={setDurationMin}
                keyboardType="number-pad"
                style={[styles.input, styles.durationInput]}
              />
              <Pressable
                style={styles.stepBtn}
                onPress={() =>
                  setDurationMin(String((parseInt(durationMin, 10) || 0) + 1))
                }
              >
                <Text style={styles.stepBtnLabel}>+</Text>
              </Pressable>
            </View>
          </Field>

          <Pressable
            style={[styles.primaryBtn, !canAdd && styles.primaryBtnDisabled]}
            onPress={handleAdd}
            disabled={!canAdd}
          >
            <Text style={styles.primaryBtnLabel}>{he.lessons.addBlock}</Text>
          </Pressable>
        </ScrollView>

        <ActivityPickerModal
          visible={pickerOpen}
          activities={whitelist}
          initialCategory={
            phase === 'warmup' ? 'warmup' : phase === 'cooldown' ? 'cooldown' : 'all'
          }
          onClose={() => setPickerOpen(false)}
          onPick={setActivity}
        />
      </View>
    </Modal>
  );
}

type S = ReturnType<typeof createStyles>;

function Field({
  label,
  children,
  styles,
}: {
  label: string;
  children: React.ReactNode;
  styles: S;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const createStyles = (theme: ThemeTokens) => StyleSheet.create({
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
  content: { padding: 20, gap: 14, paddingBottom: 60 },
  field: { gap: 8 },
  fieldLabel: { color: theme.text.muted, fontSize: 14 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  input: {
    backgroundColor: theme.bg.input,
    color: theme.text.primary,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  durationRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  durationInput: { flex: 1, textAlign: 'center', fontSize: 20 },
  stepBtn: {
    backgroundColor: theme.bg.input,
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnLabel: { color: theme.text.primary, fontSize: 24, fontWeight: '500' },
  activityRow: {
    backgroundColor: theme.bg.card,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityName: { color: theme.text.primary, fontSize: 16, flex: 1 },
  activityAction: { color: theme.accent.link, fontSize: 13 },
  addActivityBtn: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.accent.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addActivityLabel: { color: theme.accent.link, fontSize: 14 },
  primaryBtn: {
    backgroundColor: theme.accent.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnLabel: { color: theme.accent.primaryText, fontSize: 16, fontWeight: '600' },
});
