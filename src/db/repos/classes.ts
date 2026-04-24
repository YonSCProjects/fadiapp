import { eq, isNull } from 'drizzle-orm';
import { db } from '../client';
import { classes, teachers, type Class, type Teacher } from '../schema';

export async function listClasses(): Promise<Class[]> {
  return db
    .select()
    .from(classes)
    .where(isNull(classes.deleted_at))
    .orderBy(classes.name);
}

export async function getClass(id: string): Promise<Class | null> {
  const rows = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createClass(input: {
  name: string;
  grade?: number;
  year?: number;
  notes?: string | null;
}): Promise<Class> {
  const [row] = await db
    .insert(classes)
    .values({
      name: input.name,
      grade: input.grade ?? 9,
      year: input.year ?? new Date().getFullYear(),
      notes: input.notes ?? null,
    })
    .returning();
  return row!;
}

export async function updateClass(
  id: string,
  patch: {
    name?: string;
    grade?: number;
    year?: number;
    notes?: string | null;
    educator_email?: string | null;
  },
): Promise<void> {
  await db
    .update(classes)
    .set({ ...patch, updated_at: new Date() })
    .where(eq(classes.id, id));
}

export async function softDeleteClass(id: string): Promise<void> {
  const now = new Date();
  await db
    .update(classes)
    .set({ deleted_at: now, updated_at: now })
    .where(eq(classes.id, id));
}

export async function ensureDefaultTeacher(): Promise<Teacher> {
  const [existing] = await db
    .select()
    .from(teachers)
    .where(isNull(teachers.deleted_at))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(teachers)
    .values({ display_name: 'אני', locale: 'he-IL' })
    .returning();
  return created!;
}

// Default educator-named classes at the user's school. Seeded on first boot,
// idempotent by name. Also retires the legacy placeholder if still present.
const EDUCATOR_CLASSES = [
  'מירי ואופיר',
  'מירית',
  'נטלי',
  'תאיר',
  'לירז',
  'תובל',
  'אופיר',
] as const;

export async function seedEducatorClasses(): Promise<void> {
  const existing = await db
    .select()
    .from(classes)
    .where(isNull(classes.deleted_at));
  const existingNames = new Set(existing.map((c) => c.name));

  const placeholder = existing.find((c) => c.name === 'כיתה ברירת מחדל');
  if (placeholder) {
    await softDeleteClass(placeholder.id);
  }

  const year = new Date().getFullYear();
  for (const name of EDUCATOR_CLASSES) {
    if (!existingNames.has(name)) {
      await db.insert(classes).values({ name, grade: 9, year });
    }
  }
}
