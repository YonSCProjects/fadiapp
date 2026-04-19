import { eq, isNull, and, sql } from 'drizzle-orm';
import { db } from '../client';
import { teachers, type NewTeacher, type Teacher } from '../schema';

export async function getCurrentTeacher(): Promise<Teacher | null> {
  const rows = await db.select().from(teachers).where(isNull(teachers.deleted_at)).limit(1);
  return rows[0] ?? null;
}

export async function getTeacherByGoogleSub(sub: string): Promise<Teacher | null> {
  const rows = await db
    .select()
    .from(teachers)
    .where(and(eq(teachers.google_sub, sub), isNull(teachers.deleted_at)))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertTeacherByGoogleSub(input: NewTeacher): Promise<Teacher> {
  if (!input.google_sub) throw new Error('upsertTeacherByGoogleSub: google_sub required');
  const existing = await getTeacherByGoogleSub(input.google_sub);
  if (existing) {
    const [updated] = await db
      .update(teachers)
      .set({ ...input, updated_at: new Date(), sync_rev: sql`${teachers.sync_rev} + 1` })
      .where(eq(teachers.id, existing.id))
      .returning();
    return updated!;
  }
  const [created] = await db.insert(teachers).values(input).returning();
  return created!;
}

export async function setDriveFolderId(teacherId: string, folderId: string): Promise<void> {
  await db
    .update(teachers)
    .set({
      drive_folder_id: folderId,
      updated_at: new Date(),
      sync_rev: sql`${teachers.sync_rev} + 1`,
    })
    .where(eq(teachers.id, teacherId));
}
