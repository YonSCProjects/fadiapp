import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../client';
import { design_feedback, type DesignFeedback } from '../schema';

export async function addFeedback(
  classId: string,
  textHe: string,
): Promise<DesignFeedback> {
  const [row] = await db
    .insert(design_feedback)
    .values({ class_id: classId, text_he: textHe })
    .returning();
  return row!;
}

// Newest first — the consolidator weights recent feedback higher, and the
// class-detail UI shows the latest entries on top.
export async function listFeedbackForClass(
  classId: string,
): Promise<DesignFeedback[]> {
  return db
    .select()
    .from(design_feedback)
    .where(
      and(eq(design_feedback.class_id, classId), isNull(design_feedback.deleted_at)),
    )
    .orderBy(desc(design_feedback.created_at));
}

export async function softDeleteFeedback(id: string): Promise<void> {
  const now = new Date();
  await db
    .update(design_feedback)
    .set({ deleted_at: now, updated_at: now })
    .where(eq(design_feedback.id, id));
}
