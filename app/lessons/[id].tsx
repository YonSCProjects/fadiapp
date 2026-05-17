import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { inArray, isNull, and } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  activities,
  type Activity,
  type Class,
  type DesignFeedback,
  type Lesson,
  type LessonBlock,
} from '@/db/schema';
import { getLesson, softDeleteLesson, updateLesson } from '@/db/repos/lessons';
import { listClasses } from '@/db/repos/classes';
import { createInstance } from '@/db/repos/lessonInstances';
import {
  addFeedback,
  listFeedbackForLesson,
  softDeleteFeedback,
} from '@/db/repos/designFeedback';
import { consolidateProfile } from '@/llm/profileConsolidator';
import { he } from '@/i18n/he';
import { useBottomInset } from '@/ui/useBottomInset';
import { BlockEditModal } from '@/ui/BlockEditModal';
import { AddBlockModal } from '@/ui/AddBlockModal';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';

export default function LessonDetail() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lesson, setLesson] = useState<Lesson | null | 'missing'>(null);
  const [whitelist, setWhitelist] = useState<Activity[]>([]);
  const [editingBlock, setEditingBlock] = useState<LessonBlock | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  // Improvement-thoughts (the learning loop) state.
  const [feedback, setFeedback] = useState<DesignFeedback[]>([]);
  const [newFeedback, setNewFeedback] = useState('');
  const [consolidating, setConsolidating] = useState(false);
  const bottomPad = useBottomInset();

  const loadAll = useCallback(
    async (active: () => boolean) => {
      const row = await getLesson(id);
      if (!active()) return;
      if (!row) {
        setLesson('missing');
        return;
      }
      const rows = await db
        .select()
        .from(activities)
        .where(
          and(
            isNull(activities.deleted_at),
            inArray(activities.environment, [row.environment, 'any']),
          ),
        );
      const fb = await listFeedbackForLesson(id);
      if (!active()) return;
      setWhitelist(rows);
      setLesson(row);
      setFeedback(fb);
    },
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      let live = true;
      loadAll(() => live);
      return () => {
        live = false;
      };
    }, [loadAll]),
  );

  async function onStart() {
    if (lesson === null || lesson === 'missing') return;
    const rows = await listClasses();
    if (rows.length === 0) {
      Alert.alert(he.classes.title, he.classes.noneYet);
      return;
    }
    setAvailableClasses(rows);
    setClassPickerOpen(true);
  }

  async function onPickClass(cls: Class) {
    if (lesson === null || lesson === 'missing') return;
    setClassPickerOpen(false);
    const instance = await createInstance({
      lesson_id: lesson.id,
      class_id: cls.id,
      planned_blocks_json: lesson.blocks_json,
    });
    router.push(`/runner/${instance.id}` as never);
  }

  function confirmDeleteLesson() {
    Alert.alert(he.lessons.deleteConfirm, '', [
      { text: he.lessons.cancel, style: 'cancel' },
      {
        text: he.lessons.delete,
        style: 'destructive',
        onPress: async () => {
          await softDeleteLesson(id);
          router.back();
        },
      },
    ]);
  }

  async function persistBlocks(nextBlocks: LessonBlock[]) {
    if (lesson === null || lesson === 'missing') return;
    await updateLesson(lesson.id, { blocks_json: nextBlocks });
    setLesson({ ...lesson, blocks_json: nextBlocks });
  }

  // After feedback changes, re-distill the teacher's global design profile in
  // the background. Feedback is already persisted; a failure here only means
  // "profile not updated yet" — the next feedback retries over everything.
  async function reconsolidate() {
    setConsolidating(true);
    try {
      await consolidateProfile();
    } catch {
      Alert.alert(he.lessons.improveLabel, he.lessons.improveConsolidateFailed);
    } finally {
      setConsolidating(false);
    }
  }

  async function onAddFeedback() {
    const text = newFeedback.trim();
    if (text.length === 0) return;
    await addFeedback(id, text);
    setNewFeedback('');
    setFeedback(await listFeedbackForLesson(id));
    await reconsolidate();
  }

  async function onRemoveFeedback(feedbackId: string) {
    await softDeleteFeedback(feedbackId);
    setFeedback(await listFeedbackForLesson(id));
    await reconsolidate();
  }

  function onSaveBlock(next: LessonBlock) {
    if (lesson === null || lesson === 'missing') return;
    const idx = lesson.blocks_json.findIndex((b) => b.id === next.id);
    if (idx < 0) return;
    const copy = lesson.blocks_json.slice();
    copy[idx] = next;
    persistBlocks(copy);
  }

  function onDeleteBlock() {
    if (!editingBlock || lesson === null || lesson === 'missing') return;
    const remaining = lesson.blocks_json.filter((b) => b.id !== editingBlock.id);
    persistBlocks(remaining);
  }

  function onAddBlock(block: LessonBlock) {
    if (lesson === null || lesson === 'missing') return;
    // Insert the new block after the last existing block of the same phase,
    // or at the end if no blocks of that phase exist yet.
    const existing = lesson.blocks_json;
    let insertAt = existing.length;
    for (let i = existing.length - 1; i >= 0; i--) {
      if (existing[i]!.phase === block.phase) {
        insertAt = i + 1;
        break;
      }
    }
    const next = [...existing.slice(0, insertAt), block, ...existing.slice(insertAt)];
    persistBlocks(next);
  }

  if (lesson === null) {
    return <Stack.Screen options={{ title: he.lessons.detailTitle }} />;
  }
  if (lesson === 'missing') {
    return (
      <>
        <Stack.Screen options={{ title: he.lessons.detailTitle }} />
        <View style={styles.missing}>
          <Text style={styles.missingText}>השיעור לא נמצא.</Text>
        </View>
      </>
    );
  }

  const idToName = new Map(whitelist.map((a) => [a.id, a.name_he]));
  const warmup = lesson.blocks_json.filter((b) => b.phase === 'warmup');
  const main = lesson.blocks_json.filter((b) => b.phase === 'main');
  const cooldown = lesson.blocks_json.filter((b) => b.phase === 'cooldown');

  return (
    <>
      <Stack.Screen options={{ title: lesson.title_he }} />
      <View style={styles.root}>
        <ScrollView style={styles.container} contentContainerStyle={[styles.content, bottomPad]}>
          <Text style={styles.lessonTitle}>{lesson.title_he}</Text>
          <Text style={styles.lessonMeta}>
            כיתה {lesson.grade_band} · {lesson.duration_min} דק׳ ·{' '}
            {lesson.pedagogical_model ?? '—'}
          </Text>
          <Text style={styles.lessonGoal}>{lesson.goal_he}</Text>

          {lesson.pedagogical_rationale_he && lesson.pedagogical_rationale_he.length > 0 && (
            <Section label={he.designer.rationale} styles={styles}>
              <Text style={styles.bodyText}>{lesson.pedagogical_rationale_he}</Text>
            </Section>
          )}

          {warmup.length > 0 && (
            <Section label={he.designer.warmup} styles={styles}>
              {warmup.map((b) => (
                <BlockCard
                  key={b.id}
                  block={b}
                  idToName={idToName}
                  onPress={() => setEditingBlock(b)}
                  styles={styles}
                />
              ))}
            </Section>
          )}
          {main.length > 0 && (
            <Section label={he.designer.main} styles={styles}>
              {main.map((b) => (
                <BlockCard
                  key={b.id}
                  block={b}
                  idToName={idToName}
                  onPress={() => setEditingBlock(b)}
                  styles={styles}
                />
              ))}
            </Section>
          )}
          {cooldown.length > 0 && (
            <Section label={he.designer.cooldown} styles={styles}>
              {cooldown.map((b) => (
                <BlockCard
                  key={b.id}
                  block={b}
                  idToName={idToName}
                  onPress={() => setEditingBlock(b)}
                  styles={styles}
                />
              ))}
            </Section>
          )}

          {lesson.safety_notes_he && lesson.safety_notes_he.length > 0 && (
            <Section label={he.designer.safetyNotes} styles={styles}>
              {lesson.safety_notes_he.map((note, i) => (
                <Text key={i} style={styles.safetyNote}>
                  • {note}
                </Text>
              ))}
            </Section>
          )}

          {/* ---- Improvement thoughts (the learning loop) ---- */}
          <View style={styles.improveHeader}>
            <Text style={styles.sectionLabel}>{he.lessons.improveLabel}</Text>
            {consolidating && (
              <View style={styles.improveConsolidating}>
                <ActivityIndicator size="small" color={theme.accent.link} />
                <Text style={styles.improveConsolidatingText}>
                  {he.lessons.improveConsolidating}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.improveSubtitle}>{he.lessons.improveSubtitle}</Text>

          <View style={styles.improveRow}>
            <TextInput
              value={newFeedback}
              onChangeText={setNewFeedback}
              style={styles.improveInput}
              textAlign="right"
              placeholder={he.lessons.improvePlaceholder}
              placeholderTextColor={theme.text.faint}
              onSubmitEditing={onAddFeedback}
            />
            <Pressable style={styles.improveAddBtn} onPress={onAddFeedback}>
              <Text style={styles.improveAddLabel}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.improvePiiHint}>{he.lessons.improvePiiHint}</Text>

          {feedback.length > 0 && (
            <View style={styles.improveList}>
              {feedback.map((f) => (
                <View key={f.id} style={styles.improveItem}>
                  <Text style={styles.improveItemText}>{f.text_he}</Text>
                  <Pressable
                    onPress={() => onRemoveFeedback(f.id)}
                    hitSlop={12}
                    style={styles.improveRemoveBtn}
                  >
                    <Text style={styles.improveRemoveLabel}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <Pressable style={styles.startBtn} onPress={onStart}>
            <Text style={styles.startLabel}>{he.runner.startLesson}</Text>
          </Pressable>

          <Pressable style={styles.deleteBtn} onPress={confirmDeleteLesson}>
            <Text style={styles.deleteLabel}>{he.lessons.delete}</Text>
          </Pressable>
        </ScrollView>

        <Pressable style={styles.fab} onPress={() => setAddOpen(true)}>
          <Text style={styles.fabLabel}>+</Text>
        </Pressable>
      </View>

      <BlockEditModal
        visible={editingBlock !== null}
        block={editingBlock}
        whitelist={whitelist}
        onClose={() => setEditingBlock(null)}
        onSave={onSaveBlock}
        onDelete={onDeleteBlock}
      />

      <AddBlockModal
        visible={addOpen}
        whitelist={whitelist}
        onClose={() => setAddOpen(false)}
        onAdd={onAddBlock}
      />

      <Modal
        visible={classPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setClassPickerOpen(false)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setClassPickerOpen(false)}>
          <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.pickerTitle}>{he.classes.pickForLesson}</Text>
            {availableClasses.map((c) => (
              <Pressable
                key={c.id}
                style={styles.pickerRow}
                onPress={() => onPickClass(c)}
              >
                <Text style={styles.pickerRowLabel}>{c.name}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.pickerCancel}
              onPress={() => setClassPickerOpen(false)}
            >
              <Text style={styles.pickerCancelLabel}>{he.lessons.cancel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type S = ReturnType<typeof createStyles>;

function BlockCard({
  block,
  idToName,
  onPress,
  styles,
}: {
  block: LessonBlock;
  idToName: Map<string, string>;
  onPress: () => void;
  styles: S;
}) {
  const minutes = Math.round(block.duration_s / 60);
  return (
    <Pressable style={styles.block} onPress={onPress}>
      <View style={styles.blockHeader}>
        <Text style={styles.blockName}>{block.name_he}</Text>
        <Text style={styles.blockDuration}>{minutes} דק׳</Text>
      </View>
      {block.activity_ids.length > 0 && (
        <Text style={styles.blockActivities}>
          {he.designer.activities}:{' '}
          {block.activity_ids.map((id) => idToName.get(id) ?? id).join(', ')}
        </Text>
      )}
      {block.teacher_cues_he && <Text style={styles.blockCues}>💡 {block.teacher_cues_he}</Text>}
      {block.notes_he && <Text style={styles.blockNotes}>{block.notes_he}</Text>}
    </Pressable>
  );
}

function Section({
  label,
  children,
  styles,
}: {
  label: string;
  children: React.ReactNode;
  styles: S;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

const createStyles = (theme: ThemeTokens) =>
  StyleSheet.create({
    root: { flex: 1 },
    container: { flex: 1 },
    content: { padding: 20, gap: 12 },
    missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    missingText: { color: theme.text.muted, fontSize: 16 },
    lessonTitle: { color: theme.text.primary, fontSize: 24, fontWeight: '700' },
    lessonMeta: { color: theme.text.muted, fontSize: 12 },
    lessonGoal: { color: theme.text.secondary, fontSize: 16, lineHeight: 22 },
    section: { gap: 8, marginTop: 12 },
    sectionLabel: {
      color: theme.text.muted,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    block: {
      backgroundColor: theme.bg.card,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border.default,
      gap: 6,
    },
    blockHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    blockName: { color: theme.text.primary, fontSize: 16, fontWeight: '600' },
    blockDuration: { color: theme.text.muted, fontSize: 14 },
    blockActivities: { color: theme.text.secondary, fontSize: 14 },
    blockCues: { color: theme.status.success, fontSize: 13, fontStyle: 'italic' },
    blockNotes: { color: theme.text.muted, fontSize: 13 },
    safetyNote: { color: theme.status.warning, fontSize: 14, lineHeight: 20 },
    bodyText: { color: theme.text.secondary, fontSize: 14, lineHeight: 20 },
    startBtn: {
      marginTop: 24,
      padding: 16,
      borderRadius: 10,
      backgroundColor: theme.status.successStrong,
      alignItems: 'center',
    },
    startLabel: { color: theme.text.onAccent, fontSize: 18, fontWeight: '700' },
    deleteBtn: {
      marginTop: 12,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.status.dangerBorder,
      alignItems: 'center',
    },
    deleteLabel: { color: theme.status.danger, fontSize: 16, fontWeight: '600' },
    improveHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 24,
    },
    improveConsolidating: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    improveConsolidatingText: { color: theme.accent.link, fontSize: 12 },
    improveSubtitle: {
      color: theme.text.muted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 6,
    },
    improveRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    improveInput: {
      flex: 1,
      backgroundColor: theme.bg.input,
      color: theme.text.primary,
      padding: 12,
      borderRadius: 8,
      fontSize: 16,
    },
    improveAddBtn: {
      width: 48,
      height: 48,
      borderRadius: 8,
      backgroundColor: theme.accent.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    improveAddLabel: {
      color: theme.accent.primaryText,
      fontSize: 24,
      lineHeight: 26,
    },
    improvePiiHint: { color: theme.text.faint, fontSize: 12, marginTop: 6 },
    improveList: { gap: 8, marginTop: 10 },
    improveItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.bg.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border.subtle,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    improveItemText: {
      flex: 1,
      color: theme.text.secondary,
      fontSize: 14,
      lineHeight: 20,
      paddingVertical: 6,
    },
    improveRemoveBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    improveRemoveLabel: { color: theme.status.danger, fontSize: 22, lineHeight: 24 },
    fab: {
      position: 'absolute',
      bottom: 32,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.accent.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    fabLabel: {
      color: theme.accent.primaryText,
      fontSize: 32,
      lineHeight: 34,
      fontWeight: '300',
    },
    pickerBackdrop: {
      flex: 1,
      backgroundColor: theme.bg.overlay,
      justifyContent: 'flex-end',
    },
    pickerSheet: {
      backgroundColor: theme.bg.subtle,
      padding: 20,
      gap: 8,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    pickerTitle: {
      color: theme.text.primary,
      fontSize: 17,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 6,
    },
    pickerRow: {
      backgroundColor: theme.bg.card,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    pickerRowLabel: { color: theme.text.primary, fontSize: 17, fontWeight: '600' },
    pickerCancel: { padding: 12, alignItems: 'center', marginTop: 4 },
    pickerCancelLabel: { color: theme.text.muted, fontSize: 14 },
  });
