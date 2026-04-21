import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { inArray, isNull, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { activities, type Activity, type Lesson } from '@/db/schema';
import { getLesson, softDeleteLesson } from '@/db/repos/lessons';
import { he } from '@/i18n/he';
import { useBottomInset } from '@/ui/useBottomInset';
import { LessonBlocksView } from '@/ui/LessonBlocksView';

export default function LessonDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lesson, setLesson] = useState<Lesson | null | 'missing'>(null);
  const [activityMap, setActivityMap] = useState<Map<string, string>>(new Map());
  const bottomPad = useBottomInset();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const row = await getLesson(id);
        if (!active) return;
        if (!row) {
          setLesson('missing');
          return;
        }
        const ids = row.blocks_json.flatMap((b) => b.activity_ids);
        let rows: Activity[] = [];
        if (ids.length > 0) {
          rows = await db
            .select()
            .from(activities)
            .where(and(isNull(activities.deleted_at), inArray(activities.id, ids)));
        }
        if (!active) return;
        setActivityMap(new Map(rows.map((a) => [a.id, a.name_he])));
        setLesson(row);
      })();
      return () => {
        active = false;
      };
    }, [id]),
  );

  function confirmDelete() {
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

  return (
    <>
      <Stack.Screen options={{ title: lesson.title_he }} />
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, bottomPad]}>
        <Text style={styles.lessonTitle}>{lesson.title_he}</Text>
        <Text style={styles.lessonMeta}>
          כיתה {lesson.grade_band} · {lesson.duration_min} דק׳ · {lesson.pedagogical_model ?? '—'}
        </Text>
        <Text style={styles.lessonGoal}>{lesson.goal_he}</Text>

        <LessonBlocksView
          blocks={lesson.blocks_json}
          activityIdToName={activityMap}
          safetyNotes={lesson.safety_notes_he ?? []}
          rationale={lesson.pedagogical_rationale_he ?? ''}
        />

        <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
          <Text style={styles.deleteLabel}>{he.lessons.delete}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  missingText: { color: '#a0a0a8', fontSize: 16 },
  lessonTitle: { color: '#f5f5f5', fontSize: 24, fontWeight: '700' },
  lessonMeta: { color: '#a0a0a8', fontSize: 12 },
  lessonGoal: { color: '#e0e0e8', fontSize: 16, lineHeight: 22 },
  deleteBtn: {
    marginTop: 24,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4a1a1a',
    alignItems: 'center',
  },
  deleteLabel: { color: '#ff8a8a', fontSize: 16, fontWeight: '600' },
});
