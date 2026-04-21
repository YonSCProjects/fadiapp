import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Activity, LessonBlock } from '@/db/schema';
import { he } from '@/i18n/he';
import { ActivityPickerModal } from './ActivityPickerModal';

type Props = {
  visible: boolean;
  block: LessonBlock | null;
  whitelist: Activity[];
  onClose: () => void;
  onSave: (next: LessonBlock) => void;
  onDelete: () => void;
};

export function BlockEditModal({
  visible,
  block,
  whitelist,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [name, setName] = useState('');
  const [durationMin, setDurationMin] = useState('5');
  const [activityIds, setActivityIds] = useState<string[]>([]);
  const [cues, setCues] = useState('');
  const [notes, setNotes] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null); // null = add

  useEffect(() => {
    if (block) {
      setName(block.name_he);
      setDurationMin(String(Math.max(1, Math.round(block.duration_s / 60))));
      setActivityIds([...block.activity_ids]);
      setCues(block.teacher_cues_he ?? '');
      setNotes(block.notes_he ?? '');
    }
  }, [block]);

  if (!block) return null;

  const idToName = new Map(whitelist.map((a) => [a.id, a.name_he]));

  function handleSave() {
    const minutes = Math.max(1, parseInt(durationMin, 10) || 1);
    onSave({
      ...block!,
      name_he: name.trim() || block!.name_he,
      duration_s: minutes * 60,
      activity_ids: activityIds,
      teacher_cues_he: cues.trim() || undefined,
      notes_he: notes.trim() || undefined,
    });
    onClose();
  }

  function handleDelete() {
    Alert.alert(he.lessons.deleteBlockConfirm, '', [
      { text: he.lessons.cancel, style: 'cancel' },
      {
        text: he.lessons.delete,
        style: 'destructive',
        onPress: () => {
          onDelete();
          onClose();
        },
      },
    ]);
  }

  function onPickerSelect(activity: Activity) {
    if (replaceIndex === null) {
      setActivityIds((prev) => [...prev, activity.id]);
    } else {
      setActivityIds((prev) => {
        const next = [...prev];
        next[replaceIndex] = activity.id;
        return next;
      });
    }
    setReplaceIndex(null);
  }

  function removeActivity(idx: number) {
    setActivityIds((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{he.lessons.editBlockTitle}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>×</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field label={he.lessons.blockName}>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.input}
              textAlign="right"
            />
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

          <Field label={he.lessons.blockActivities}>
            <View style={styles.activitiesList}>
              {activityIds.map((id, idx) => (
                <View key={`${id}-${idx}`} style={styles.activityRow}>
                  <Text style={styles.activityName}>{idToName.get(id) ?? id}</Text>
                  <View style={styles.activityActions}>
                    <Pressable
                      onPress={() => {
                        setReplaceIndex(idx);
                        setPickerOpen(true);
                      }}
                    >
                      <Text style={styles.activityAction}>{he.lessons.replaceActivity}</Text>
                    </Pressable>
                    <Pressable onPress={() => removeActivity(idx)}>
                      <Text style={[styles.activityAction, styles.activityActionRemove]}>
                        {he.lessons.removeActivity}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
              <Pressable
                style={styles.addActivityBtn}
                onPress={() => {
                  setReplaceIndex(null);
                  setPickerOpen(true);
                }}
              >
                <Text style={styles.addActivityLabel}>+ {he.lessons.addActivity}</Text>
              </Pressable>
            </View>
          </Field>

          <Field label={he.lessons.blockCues}>
            <TextInput
              value={cues}
              onChangeText={setCues}
              style={[styles.input, styles.textarea]}
              multiline
              textAlign="right"
            />
          </Field>

          <Field label={he.lessons.blockNotes}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              style={[styles.input, styles.textarea]}
              multiline
              textAlign="right"
            />
          </Field>

          <Pressable style={styles.primaryBtn} onPress={handleSave}>
            <Text style={styles.primaryBtnLabel}>{he.lessons.saveBlock}</Text>
          </Pressable>

          <Pressable style={styles.dangerBtn} onPress={handleDelete}>
            <Text style={styles.dangerBtnLabel}>{he.lessons.deleteBlock}</Text>
          </Pressable>
        </ScrollView>

        <ActivityPickerModal
          visible={pickerOpen}
          activities={whitelist}
          onClose={() => setPickerOpen(false)}
          onPick={onPickerSelect}
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
  input: {
    backgroundColor: '#23232a',
    color: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
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
  activitiesList: { gap: 8 },
  activityRow: {
    backgroundColor: '#1a1a20',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  activityName: { color: '#f5f5f5', fontSize: 16 },
  activityActions: { flexDirection: 'row', gap: 16 },
  activityAction: { color: '#3b82f6', fontSize: 13 },
  activityActionRemove: { color: '#ff8a8a' },
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
  primaryBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dangerBtn: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4a1a1a',
    alignItems: 'center',
  },
  dangerBtnLabel: { color: '#ff8a8a', fontSize: 16, fontWeight: '600' },
});
