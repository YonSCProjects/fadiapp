import { and, eq } from 'drizzle-orm';
import { db } from '../client';
import { class_scores, type ClassScore, type NewClassScore } from '../schema';

export type ScoreInput = {
  class_id: string;
  student_id: string;
  date: string; // YYYY-MM-DD
  period: number;
  entry: number;
  attendance: number;
  execution: number;
  atmosphere: number;
  personal_goal: number;
  bonus: number;
};

// Upsert by (class_id, student_id, date, period). If a row already exists for
// that session + student (teacher re-entered scores), overwrite.
export async function saveSessionScores(rows: ScoreInput[]): Promise<void> {
  if (rows.length === 0) return;
  await db.transaction(async (tx) => {
    for (const row of rows) {
      const existing = await tx
        .select()
        .from(class_scores)
        .where(
          and(
            eq(class_scores.class_id, row.class_id),
            eq(class_scores.student_id, row.student_id),
            eq(class_scores.date, row.date),
            eq(class_scores.period, row.period),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        await tx
          .update(class_scores)
          .set({
            entry: row.entry,
            attendance: row.attendance,
            execution: row.execution,
            atmosphere: row.atmosphere,
            personal_goal: row.personal_goal,
            bonus: row.bonus,
            updated_at: new Date(),
          })
          .where(eq(class_scores.id, existing[0]!.id));
      } else {
        await tx.insert(class_scores).values(row as NewClassScore);
      }
    }
  });
}

export function totalForRow(row: ScoreInput | ClassScore): number {
  return (
    row.entry +
    row.attendance +
    row.execution +
    row.atmosphere +
    row.personal_goal +
    row.bonus
  );
}
