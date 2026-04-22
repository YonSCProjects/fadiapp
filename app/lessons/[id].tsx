import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { inArray, isNull, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { activities, type Activity, type Lesson, type LessonBlock } from '@/db/schema';
import { getLesson, softDeleteLesson, updateLesson } from '@/db/repos/lessons';
import { ensureDefaultTeacherAndClass } from '@/db/repos/classes';
import { createInstance } from '@/db/repos/lessonInstances';
import { blocksFromLesson } from '@/runner/fromLesson';
import { he } from '@/i18n/he';
import { useBottomInset } from '@/ui/useBottomInset';
import { BlockEditModal } from '@/ui/BlockEditModal';
import { AddBlockModal } from '@/ui/AddBlockModal';

export default function LessonDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lesson, setLesson] = useState<Lesson | null | 'missing'>(null);
  const [whitelist, setWhitelist] = useState<Activity[]>([]);
  const [editingBlock, setEditingBlock] = useState<LessonBlock | null>(null);
  const [addOpen, setAddOpen] = useState(false);
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
      if (!active()) return;
      setWhitelist(rows);
      setLesson(row);
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
    const { class: defaultClass } = await ensureDefaultTeacherAndClass();
    const instance = await createInstance({
      lesson_id: lesson.id,
      class_id: defaultClass.id,
      planned_blocks_json: blocksFromLesson(lesson.blocks_json),
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
            <Section label={he.designer.rationale}>
              <Text style={styles.bodyText}>{lesson.pedagogical_rationale_he}</Text>
            </Section>
          )}

          {warmup.length > 0 && (
            <Section label={he.designer.warmup}>
              {warmup.map((b) => (
                <BlockCard
                  key={b.id}
                  block={b}
                  idToName={idToName}
                  onPress={() => setEditingBlock(b)}
                />
              ))}
            </Section>
          )}
          {main.length > 0 && (
            <Section label={he.designer.main}>
              {main.map((b) => (
                <BlockCard
                  key={b.id}
                  block={b}
                  idToName={idToName}
                  onPress={() => setEditingBlock(b)}
                />
              ))}
            </Section>
          )}
          {cooldown.length > 0 && (
            <Section label={he.designer.cooldown}>
              {cooldown.map((b) => (
                <BlockCard
                  key={b.id}
                  block={b}
                  idToName={idToName}
                  onPress={() => setEditingBlock(b)}
                />
              ))}
            </Section>
          )}

          {lesson.safety_notes_he && lesson.safety_notes_he.length > 0 && (
            <Section label={he.designer.safetyNotes}>
              {lesson.safety_notes_he.map((note, i) => (
                <Text key={i} style={styles.safetyNote}>
                  • {note}
                </Text>
              ))}
            </Section>
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
    </>
  );
}

function BlockCard({
  block,
  idToName,
  onPress,
}: {
  block: LessonBlock;
  idToName: Map<string, string>;
  onPress: () => void;
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

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 20, gap: 12 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  missingText: { color: '#a0a0a8', fontSize: 16 },
  lessonTitle: { color: '#f5f5f5', fontSize: 24, fontWeight: '700' },
  lessonMeta: { color: '#a0a0a8', fontSize: 12 },
  lessonGoal: { color: '#e0e0e8', fontSize: 16, lineHeight: 22 },
  section: { gap: 8, marginTop: 12 },
  sectionLabel: { color: '#a0a0a8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  block: {
    backgroundColor: '#1a1a20',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a32',
    gap: 6,
  },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  blockName: { color: '#f5f5f5', fontSize: 16, fontWeight: '600' },
  blockDuration: { color: '#a0a0a8', fontSize: 14 },
  blockActivities: { color: '#c0c0c8', fontSize: 14 },
  blockCues: { color: '#86efac', fontSize: 13, fontStyle: 'italic' },
  blockNotes: { color: '#a0a0a8', fontSize: 13 },
  safetyNote: { color: '#fbbf24', fontSize: 14, lineHeight: 20 },
  bodyText: { color: '#e0e0e8', fontSize: 14, lineHeight: 20 },
  startBtn: {
    marginTop: 24,
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#16a34a',
    alignItems: 'center',
  },
  startLabel: { color: '#fff', fontSize: 18, fontWeight: '700' },
  deleteBtn: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4a1a1a',
    alignItems: 'center',
  },
  deleteLabel: { color: '#ff8a8a', fontSize: 16, fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabLabel: { color: '#fff', fontSize: 32, lineHeight: 34, fontWeight: '300' },
});
