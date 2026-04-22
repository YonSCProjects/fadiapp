import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../client';
import {
  lesson_instances,
  type InstanceStatus,
  type LessonBlock,
  type LessonInstance,
  type NewLessonInstance,
} from '../schema';
import type { RunnerState } from '@/runner/wallClock';

// The runner's persisted state lives in lesson_instances.actual_blocks_json.
// Shape defined below; we keep it here rather than in schema.ts so the wall-
// clock model stays independent of the DB layer.
export type RunnerDeviationKind =
  | 'skipped'
  | 'extended'
  | 'substituted'
  | 'water_break'
  | 'injury_pause';

export type RunnerDeviation = {
  at_ms: number;
  block_id: string;
  kind: RunnerDeviationKind;
  note_he?: string;
  substitute_activity_id?: string;
};

export type ActualBlocksRecord = {
  version: 1;
  state: RunnerState;
  deviations: RunnerDeviation[];
};

export function isActualBlocksRecord(x: unknown): x is ActualBlocksRecord {
  return (
    typeof x === 'object' &&
    x !== null &&
    (x as ActualBlocksRecord).version === 1 &&
    Array.isArray((x as ActualBlocksRecord).deviations)
  );
}

// -- creation ---------------------------------------------------------------

export async function createInstance(input: {
  lesson_id: string;
  class_id: string;
  planned_blocks_json: LessonBlock[];
  scheduled_at?: Date;
}): Promise<LessonInstance> {
  const [row] = await db
    .insert(lesson_instances)
    .values({
      lesson_id: input.lesson_id,
      class_id: input.class_id,
      planned_blocks_json: input.planned_blocks_json as unknown as NewLessonInstance['planned_blocks_json'],
      scheduled_at: input.scheduled_at ?? new Date(),
      status: 'planned',
    })
    .returning();
  return row!;
}

// -- queries ---------------------------------------------------------------

export async function getInstance(id: string): Promise<LessonInstance | null> {
  const rows = await db
    .select()
    .from(lesson_instances)
    .where(eq(lesson_instances.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listRunningInstances(): Promise<LessonInstance[]> {
  return db
    .select()
    .from(lesson_instances)
    .where(
      and(
        isNull(lesson_instances.deleted_at),
        inArray(lesson_instances.status, ['running', 'paused'] as InstanceStatus[]),
      ),
    )
    .orderBy(desc(lesson_instances.updated_at));
}

// -- mutations -------------------------------------------------------------

export async function saveRunnerState(
  instanceId: string,
  record: ActualBlocksRecord,
  patch: Partial<Pick<LessonInstance, 'status' | 'started_at' | 'ended_at'>> = {},
): Promise<void> {
  await db
    .update(lesson_instances)
    .set({
      actual_blocks_json: record as unknown as NewLessonInstance['actual_blocks_json'],
      ...patch,
      updated_at: new Date(),
      sync_rev: sql`${lesson_instances.sync_rev} + 1`,
    })
    .where(eq(lesson_instances.id, instanceId));
}

export async function markStarted(instanceId: string, now: Date): Promise<void> {
  await db
    .update(lesson_instances)
    .set({
      status: 'running',
      started_at: now,
      updated_at: now,
      sync_rev: sql`${lesson_instances.sync_rev} + 1`,
    })
    .where(eq(lesson_instances.id, instanceId));
}

export async function markCompleted(instanceId: string, now: Date): Promise<void> {
  await db
    .update(lesson_instances)
    .set({
      status: 'completed',
      ended_at: now,
      updated_at: now,
      sync_rev: sql`${lesson_instances.sync_rev} + 1`,
    })
    .where(eq(lesson_instances.id, instanceId));
}

export async function markCancelled(instanceId: string, now: Date): Promise<void> {
  await db
    .update(lesson_instances)
    .set({
      status: 'cancelled',
      ended_at: now,
      updated_at: now,
      sync_rev: sql`${lesson_instances.sync_rev} + 1`,
    })
    .where(eq(lesson_instances.id, instanceId));
}
