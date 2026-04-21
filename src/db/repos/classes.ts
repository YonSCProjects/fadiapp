import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../client';
import { classes, teachers, type Class, type NewClass, type Teacher } from '../schema';

export async function listClasses(): Promise<Class[]> {
  return db.select().from(classes).where(isNull(classes.deleted_at)).orderBy(classes.grade);
}

export async function getClass(id: string): Promise<Class | null> {
  const rows = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createClass(input: NewClass): Promise<Class> {
  const [row] = await db.insert(classes).values(input).returning();
  return row!;
}

// Singleton defaults — the app is usable before the teacher has set up a real
// class. Ensure a placeholder teacher + class exist so lesson_instances can
// FK cleanly. Idempotent.
export async function ensureDefaultTeacherAndClass(): Promise<{
  teacher: Teacher;
  class: Class;
}> {
  const [existingTeacher] = await db
    .select()
    .from(teachers)
    .where(isNull(teachers.deleted_at))
    .limit(1);

  const teacher =
    existingTeacher ??
    (await db
      .insert(teachers)
      .values({ display_name: 'אני', locale: 'he-IL' })
      .returning())[0]!;

  const [existingClass] = await db
    .select()
    .from(classes)
    .where(and(isNull(classes.deleted_at)))
    .limit(1);

  const thisClass =
    existingClass ??
    (await db
      .insert(classes)
      .values({
        name: 'כיתה ברירת מחדל',
        grade: 9,
        year: new Date().getFullYear(),
      })
      .returning())[0]!;

  return { teacher, class: thisClass };
}
