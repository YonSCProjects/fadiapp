import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ulid } from 'ulidx';
import type { Activity, LessonBlock } from '@/db/schema';
import { he } from '@/i18n/he';
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
          <Field label={he.lessons.blockPhase}>
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

          <Field label={he.lessons.blockActivities}>
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

          <Field label={he.lessons.blockDuration}>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f10', paddingTop: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a20',
  },
  title: { color: '#f5f5f5', fontSize: 20, fontWeight: '700' },
  close: { color: '#a0a0a8', fontSize: 32, lineHeight: 32 },
  content: { padding: 20, gap: 14, paddingBottom: 60 },
  field: { gap: 8 },
  fieldLabel: { color: '#a0a0a8', fontSize: 14 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#23232a',
    color: '#f5f5f5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    fontSize: 14,
  },
  chipSelected: { backgroundColor: '#3b82f6', color: '#ffffff' },
  input: {
    backgroundColor: '#23232a',
    color: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  durationRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  durationInput: { flex: 1, textAlign: 'center', fontSize: 20 },
  stepBtn: {
    backgroundColor: '#23232a',
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnLabel: { color: '#f5f5f5', fontSize: 24, fontWeight: '500' },
  activityRow: {
    backgroundColor: '#1a1a20',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityName: { color: '#f5f5f5', fontSize: 16, flex: 1 },
  activityAction: { color: '#3b82f6', fontSize: 13 },
  addActivityBtn: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addActivityLabel: { color: '#3b82f6', fontSize: 14 },
  primaryBtn: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
