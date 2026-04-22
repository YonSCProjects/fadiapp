import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../client';
import { lessons, type Lesson, type NewLesson, type PedagogicalModel } from '../schema';

export async function createLesson(input: NewLesson): Promise<Lesson> {
  const [row] = await db.insert(lessons).values(input).returning();
  return row!;
}

export async function getLesson(id: string): Promise<Lesson | null> {
  const rows = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listLessons(opts: { limit?: number; gradeBand?: string } = {}): Promise<Lesson[]> {
  const { limit = 50, gradeBand } = opts;
  const whereClause = gradeBand
    ? and(isNull(lessons.deleted_at), eq(lessons.grade_band, gradeBand))
    : isNull(lessons.deleted_at);
  return db
    .select()
    .from(lessons)
    .where(whereClause)
    .orderBy(desc(lessons.updated_at))
    .limit(limit);
}

export async function updateLesson(
  id: string,
  patch: Partial<Omit<NewLesson, 'id'>>,
): Promise<Lesson | null> {
  const [row] = await db
    .update(lessons)
    .set({ ...patch, updated_at: new Date(), sync_rev: sql`${lessons.sync_rev} + 1` })
    .where(eq(lessons.id, id))
    .returning();
  return row ?? null;
}

export async function softDeleteLesson(id: string): Promise<void> {
  await db
    .update(lessons)
    .set({
      deleted_at: new Date(),
      updated_at: new Date(),
      sync_rev: sql`${lessons.sync_rev} + 1`,
    })
    .where(eq(lessons.id, id));
}

export async function getRecentDistinctGoals(limit = 8): Promise<string[]> {
  const rows = await db
    .select({ goal_he: lessons.goal_he, updated_at: lessons.updated_at })
    .from(lessons)
    .where(isNull(lessons.deleted_at))
    .orderBy(desc(lessons.updated_at));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const g = (r.goal_he ?? '').trim();
    if (!g || seen.has(g)) continue;
    seen.add(g);
    out.push(g);
    if (out.length >= limit) break;
  }
  return out;
}

export async function countLessonsByModel(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      model: lessons.pedagogical_model,
      count: sql<number>`count(*)`,
    })
    .from(lessons)
    .where(isNull(lessons.deleted_at))
    .groupBy(lessons.pedagogical_model);
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (r.model) out[r.model as PedagogicalModel] = Number(r.count);
  }
  return out;
}
