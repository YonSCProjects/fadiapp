import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../client';
import { design_feedback, type DesignFeedback } from '../schema';

export async function addFeedback(
  lessonId: string,
  textHe: string,
): Promise<DesignFeedback> {
  const [row] = await db
    .insert(design_feedback)
    .values({ lesson_id: lessonId, text_he: textHe })
    .returning();
  return row!;
}

// Feedback entered on one specific lesson — shown on that lesson's screen.
export async function listFeedbackForLesson(
  lessonId: string,
): Promise<DesignFeedback[]> {
  return db
    .select()
    .from(design_feedback)
    .where(
      and(
        eq(design_feedback.lesson_id, lessonId),
        isNull(design_feedback.deleted_at),
      ),
    )
    .orderBy(desc(design_feedback.created_at));
}

// Every feedback row across all lessons — the input to the global
// profile consolidation. Newest first; the consolidator weights recent
// feedback higher.
export async function listAllFeedback(): Promise<DesignFeedback[]> {
  return db
    .select()
    .from(design_feedback)
    .where(isNull(design_feedback.deleted_at))
    .orderBy(desc(design_feedback.created_at));
}

export async function softDeleteFeedback(id: string): Promise<void> {
  const now = new Date();
  await db
    .update(design_feedback)
    .set({ deleted_at: now, updated_at: now })
    .where(eq(design_feedback.id, id));
}
