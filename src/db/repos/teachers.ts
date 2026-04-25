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

export async function setScoresSheetId(teacherId: string, sheetId: string): Promise<void> {
  await db
    .update(teachers)
    .set({
      scores_sheet_id: sheetId,
      updated_at: new Date(),
      sync_rev: sql`${teachers.sync_rev} + 1`,
    })
    .where(eq(teachers.id, teacherId));
}

// Default equipment catalog seeded on first read. Teachers edit freely from there.
export const DEFAULT_EQUIPMENT_CATALOG_HE: string[] = [
  'כדורסל',
  'כדורגל',
  'כדורעף',
  'כדוריד',
  'חבלי קפיצה',
  'קונוסים',
  'מחצלות',
  'שער',
  'פריסבי',
  'כדורי קצף',
];

export async function getEquipmentCatalog(): Promise<string[]> {
  const t = await getCurrentTeacher();
  return t?.equipment_catalog_json ?? DEFAULT_EQUIPMENT_CATALOG_HE;
}

export async function setEquipmentCatalog(teacherId: string, items: string[]): Promise<void> {
  const normalized = Array.from(
    new Set(items.map((s) => s.trim()).filter((s) => s.length > 0)),
  );
  await db
    .update(teachers)
    .set({
      equipment_catalog_json: normalized,
      updated_at: new Date(),
      sync_rev: sql`${teachers.sync_rev} + 1`,
    })
    .where(eq(teachers.id, teacherId));
}

export async function getDisabledModels(): Promise<string[]> {
  const t = await getCurrentTeacher();
  return t?.disabled_models_json ?? [];
}

export async function setDisabledModels(teacherId: string, models: string[]): Promise<void> {
  const normalized = Array.from(new Set(models));
  await db
    .update(teachers)
    .set({
      disabled_models_json: normalized,
      updated_at: new Date(),
      sync_rev: sql`${teachers.sync_rev} + 1`,
    })
    .where(eq(teachers.id, teacherId));
}
