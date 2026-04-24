import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../client';
import { students, type Student } from '../schema';

export async function listStudentsInClass(classId: string): Promise<Student[]> {
  return db
    .select()
    .from(students)
    .where(and(eq(students.class_id, classId), isNull(students.deleted_at)))
    .orderBy(students.sort_index, students.display_label);
}

export async function createStudent(input: {
  class_id: string;
  display_label: string;
  initials?: string;
}): Promise<Student> {
  const initials = input.initials ?? deriveInitials(input.display_label);
  const [row] = await db
    .insert(students)
    .values({
      class_id: input.class_id,
      display_label: input.display_label,
      initials,
    })
    .returning();
  return row!;
}

export async function updateStudent(
  id: string,
  patch: { display_label?: string; initials?: string; sort_index?: number },
): Promise<void> {
  await db
    .update(students)
    .set({ ...patch, updated_at: new Date() })
    .where(eq(students.id, id));
}

export async function softDeleteStudent(id: string): Promise<void> {
  const now = new Date();
  await db
    .update(students)
    .set({ deleted_at: now, updated_at: now })
    .where(eq(students.id, id));
}

// Takes "דני כהן" → "ד.כ."; "Danny" → "D.". Best-effort; teacher can override.
function deriveInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => `${p[0]}.`)
    .join('');
}
