import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { ulid } from 'ulidx';

// ---------------------------------------------------------------------------
// Common columns
// ---------------------------------------------------------------------------
// Every table carries: id (ULID), created_at, updated_at, deleted_at (soft),
// sync_rev (monotonic), drive_etag (nullable). Factored into a helper so the
// shape stays consistent and future migrations don't drift.

const timestamps = {
  created_at: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updated_at: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  deleted_at: integer('deleted_at', { mode: 'timestamp_ms' }),
  sync_rev: integer('sync_rev').notNull().default(0),
  drive_etag: text('drive_etag'),
};

const idCol = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => ulid());

// ---------------------------------------------------------------------------
// teachers — the device owner. One row in practice. Kept a table for
// consistency, multi-teacher-per-device stays possible.
// ---------------------------------------------------------------------------
export const teachers = sqliteTable('teachers', {
  id: idCol(),
  display_name: text('display_name').notNull(),
  google_sub: text('google_sub').unique(),
  school_name: text('school_name'),
  drive_folder_id: text('drive_folder_id'),
  locale: text('locale').notNull().default('he-IL'),
  // Teacher preferences (editable from the designer and settings screens).
  // Null = use hardcoded defaults; array = explicit catalog/filter.
  equipment_catalog_json: text('equipment_catalog_json', { mode: 'json' }).$type<string[]>(),
  disabled_models_json: text('disabled_models_json', { mode: 'json' }).$type<string[]>(),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// classes — homeroom groups (e.g. "ט'-3")
// ---------------------------------------------------------------------------
export const classes = sqliteTable(
  'classes',
  {
    id: idCol(),
    name: text('name').notNull(),
    grade: integer('grade').notNull(), // 7-12
    year: integer('year').notNull(),   // e.g. 2026
    students_count_cached: integer('students_count_cached').notNull().default(0),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => ({
    grade_year_idx: index('idx_classes_grade_year').on(t.grade, t.year),
  }),
);

// ---------------------------------------------------------------------------
// students — PII-light by default. Initials only unless teacher opts in.
// full_name_enc is encrypted at rest with a teacher-held passphrase; never
// uploaded to Drive plaintext, never sent to LLM.
// ---------------------------------------------------------------------------
export type MedicalFlags = {
  asthma?: boolean;
  injury_note_he?: string;
  exemption_until?: string;
};

export const students = sqliteTable(
  'students',
  {
    id: idCol(),
    class_id: text('class_id')
      .notNull()
      .references(() => classes.id),
    initials: text('initials').notNull(),
    display_label: text('display_label').notNull(),
    full_name_enc: text('full_name_enc'),
    medical_flags_json: text('medical_flags_json', { mode: 'json' }).$type<MedicalFlags>(),
    sort_index: integer('sort_index').notNull().default(0),
    ...timestamps,
  },
  (t) => ({
    class_idx: index('idx_students_class').on(t.class_id, t.sort_index),
  }),
);

// ---------------------------------------------------------------------------
// activities — exercise / game / drill library
// ---------------------------------------------------------------------------
export type ActivityCategory = 'warmup' | 'skill' | 'game' | 'fitness' | 'cooldown';
export type ActivityEnvironment = 'gym' | 'outdoor' | 'studio' | 'any';

export const activities = sqliteTable(
  'activities',
  {
    id: idCol(),
    name_he: text('name_he').notNull(),
    name_en: text('name_en'),
    category: text('category').$type<ActivityCategory>().notNull(),
    environment: text('environment').$type<ActivityEnvironment>().notNull().default('any'),
    equipment_json: text('equipment_json', { mode: 'json' }).$type<string[]>(),
    min_space_m2: integer('min_space_m2'),
    tags_json: text('tags_json', { mode: 'json' }).$type<string[]>(),
    source_ref: text('source_ref'), // e.g. 'free-exercise-db:bench-press'
    video_url_local: text('video_url_local'),
    difficulty: integer('difficulty'), // 1-5
    cues_he: text('cues_he'),
    safety_he: text('safety_he'),
    ...timestamps,
  },
  (t) => ({
    category_idx: index('idx_activities_category').on(t.category),
    source_uniq: uniqueIndex('uniq_activities_source_ref').on(t.source_ref),
  }),
);

// ---------------------------------------------------------------------------
// lessons — templates produced by the designer flow
// ---------------------------------------------------------------------------
export type PedagogicalModel =
  | 'tgfu'
  | 'sport-education'
  | 'tpsr'
  | 'skill-themes'
  | 'cooperative'
  // Mosston's Spectrum — the meta-framework. The LLM is free to return this
  // when a lesson mixes multiple styles; otherwise it should pick one of the
  // specific sub-styles below.
  | 'mosston-spectrum'
  | 'mosston-command'
  | 'mosston-practice'
  | 'mosston-reciprocal'
  | 'mosston-self-check'
  | 'mosston-inclusion'
  | 'mosston-guided-discovery'
  | 'mosston-convergent'
  | 'mosston-divergent'
  | 'mosston-individual'
  | 'mosston-learner-initiated'
  | 'mosston-self-teaching';

export type LessonBlock = {
  id: string;
  phase: 'warmup' | 'main' | 'cooldown';
  sub_phase?: 'raise' | 'activate' | 'mobilize' | 'potentiate'; // RAMP
  name_he: string;
  duration_s: number;
  activity_ids: string[];
  teacher_cues_he?: string;
  notes_he?: string;
};

export type LessonSource = 'llm' | 'manual' | 'seed';

export const lessons = sqliteTable(
  'lessons',
  {
    id: idCol(),
    title_he: text('title_he').notNull(),
    grade_band: text('grade_band').notNull(), // '7-9' | '10-12' | etc.
    duration_min: integer('duration_min').notNull(),
    goal_he: text('goal_he').notNull(),
    equipment_json: text('equipment_json', { mode: 'json' }).$type<string[]>(),
    environment: text('environment').$type<ActivityEnvironment>().notNull().default('gym'),
    pedagogical_model: text('pedagogical_model').$type<PedagogicalModel>(),
    blocks_json: text('blocks_json', { mode: 'json' }).$type<LessonBlock[]>().notNull(),
    safety_notes_he: text('safety_notes_he', { mode: 'json' }).$type<string[]>(),
    pedagogical_rationale_he: text('pedagogical_rationale_he'),
    source: text('source').$type<LessonSource>().notNull(),
    llm_model_used: text('llm_model_used'),
    ...timestamps,
  },
  (t) => ({
    grade_idx: index('idx_lessons_grade').on(t.grade_band),
    model_idx: index('idx_lessons_model').on(t.pedagogical_model),
  }),
);

// ---------------------------------------------------------------------------
// lesson_instances — a specific run of a lesson, attached to a class
// ---------------------------------------------------------------------------
export type ActualBlock = LessonBlock & {
  started_at_ms: number | null;
  ended_at_ms: number | null;
  deviations: Array<{
    at_ms: number;
    kind: 'skipped' | 'extended' | 'substituted' | 'water_break' | 'injury_pause';
    note_he?: string;
    substitute_activity_id?: string;
  }>;
};

export type InstanceStatus = 'planned' | 'running' | 'paused' | 'completed' | 'cancelled';

export const lesson_instances = sqliteTable(
  'lesson_instances',
  {
    id: idCol(),
    lesson_id: text('lesson_id')
      .notNull()
      .references(() => lessons.id),
    class_id: text('class_id')
      .notNull()
      .references(() => classes.id),
    scheduled_at: integer('scheduled_at', { mode: 'timestamp_ms' }),
    started_at: integer('started_at', { mode: 'timestamp_ms' }),
    ended_at: integer('ended_at', { mode: 'timestamp_ms' }),
    status: text('status').$type<InstanceStatus>().notNull().default('planned'),
    planned_blocks_json: text('planned_blocks_json', { mode: 'json' })
      .$type<LessonBlock[]>()
      .notNull(),
    actual_blocks_json: text('actual_blocks_json', { mode: 'json' }).$type<ActualBlock[]>(),
    weather: text('weather'),
    location: text('location'),
    ...timestamps,
  },
  (t) => ({
    class_sched_idx: index('idx_instances_class_sched').on(t.class_id, t.scheduled_at),
    status_idx: index('idx_instances_status').on(t.status),
  }),
);

// ---------------------------------------------------------------------------
// attendance — per-student, per-instance. Fully local (PII).
// ---------------------------------------------------------------------------
export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'injured' | 'uniform_missing';

export const attendance = sqliteTable(
  'attendance',
  {
    id: idCol(),
    lesson_instance_id: text('lesson_instance_id')
      .notNull()
      .references(() => lesson_instances.id),
    student_id: text('student_id')
      .notNull()
      .references(() => students.id),
    status: text('status').$type<AttendanceStatus>().notNull().default('present'),
    note_local: text('note_local'),
    ...timestamps,
  },
  (t) => ({
    instance_student_uniq: uniqueIndex('uniq_attendance_instance_student').on(
      t.lesson_instance_id,
      t.student_id,
    ),
  }),
);

// ---------------------------------------------------------------------------
// post_class_reflections — the 3-slider + 2-prompt reflection
// ---------------------------------------------------------------------------
export const post_class_reflections = sqliteTable('post_class_reflections', {
  id: idCol(),
  lesson_instance_id: text('lesson_instance_id')
    .notNull()
    .references(() => lesson_instances.id)
    .unique(),
  went_well_he: text('went_well_he'),
  would_change_he: text('would_change_he'),
  energy_level: integer('energy_level'),     // 1-5
  teacher_mood: integer('teacher_mood'),     // 1-5
  student_engagement: integer('student_engagement'), // 1-5
  free_text_he: text('free_text_he'),
  audio_note_path: text('audio_note_path'),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// pedagogical_principles_seen — feeds the coaching layer diversity nudge
// ---------------------------------------------------------------------------
export const pedagogical_principles_seen = sqliteTable(
  'pedagogical_principles_seen',
  {
    id: idCol(),
    teacher_id: text('teacher_id')
      .notNull()
      .references(() => teachers.id),
    model_key: text('model_key').$type<PedagogicalModel>().notNull(),
    lesson_instance_id: text('lesson_instance_id')
      .notNull()
      .references(() => lesson_instances.id),
    observed_at: integer('observed_at', { mode: 'timestamp_ms' }).notNull(),
    weight: integer('weight').notNull().default(1),
    ...timestamps,
  },
  (t) => ({
    teacher_observed_idx: index('idx_principles_teacher_observed').on(
      t.teacher_id,
      t.observed_at,
    ),
  }),
);

// ---------------------------------------------------------------------------
// knowledge_snippets — weekly digest + safety/curriculum updates
// ---------------------------------------------------------------------------
export type SnippetKind = 'evidence' | 'pedagogy' | 'safety' | 'curriculum_update';

export const knowledge_snippets = sqliteTable(
  'knowledge_snippets',
  {
    id: idCol(),
    kind: text('kind').$type<SnippetKind>().notNull(),
    title_he: text('title_he').notNull(),
    body_md_he: text('body_md_he').notNull(),
    source_url: text('source_url'),
    published_at: integer('published_at', { mode: 'timestamp_ms' }),
    ingested_at: integer('ingested_at', { mode: 'timestamp_ms' }).notNull(),
    shown_at: integer('shown_at', { mode: 'timestamp_ms' }),
    dismissed: integer('dismissed', { mode: 'boolean' }).notNull().default(false),
    relevance_tags_json: text('relevance_tags_json', { mode: 'json' }).$type<string[]>(),
    ...timestamps,
  },
  (t) => ({
    kind_idx: index('idx_snippets_kind').on(t.kind),
    ingested_idx: index('idx_snippets_ingested').on(t.ingested_at),
  }),
);

// ---------------------------------------------------------------------------
// coaching_events — hard cap on nudges
// ---------------------------------------------------------------------------
export const coaching_events = sqliteTable(
  'coaching_events',
  {
    id: idCol(),
    teacher_id: text('teacher_id')
      .notNull()
      .references(() => teachers.id),
    rule_key: text('rule_key').notNull(),
    fired_at: integer('fired_at', { mode: 'timestamp_ms' }).notNull(),
    shown_at: integer('shown_at', { mode: 'timestamp_ms' }),
    dismissed: integer('dismissed', { mode: 'boolean' }).notNull().default(false),
    acted_on: integer('acted_on', { mode: 'boolean' }).notNull().default(false),
    cooldown_until: integer('cooldown_until', { mode: 'timestamp_ms' }),
    evidence_ids_json: text('evidence_ids_json', { mode: 'json' }).$type<string[]>(),
    ...timestamps,
  },
  (t) => ({
    teacher_cooldown_idx: index('idx_coaching_cooldown').on(t.teacher_id, t.cooldown_until),
  }),
);

// ---------------------------------------------------------------------------
// sync_log — Drive sync attempts (for retry + debugging)
// ---------------------------------------------------------------------------
export type SyncOp = 'upsert' | 'delete';

export const sync_log = sqliteTable(
  'sync_log',
  {
    id: idCol(),
    entity_table: text('entity_table').notNull(),
    entity_id: text('entity_id').notNull(),
    op: text('op').$type<SyncOp>().notNull(),
    attempted_at: integer('attempted_at', { mode: 'timestamp_ms' }).notNull(),
    drive_etag_after: text('drive_etag_after'),
    error: text('error'),
    ...timestamps,
  },
  (t) => ({
    entity_idx: index('idx_sync_log_entity').on(t.entity_table, t.entity_id),
    attempted_idx: index('idx_sync_log_attempted').on(t.attempted_at),
  }),
);

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;
export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type LessonInstance = typeof lesson_instances.$inferSelect;
export type NewLessonInstance = typeof lesson_instances.$inferInsert;
export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;
export type PostClassReflection = typeof post_class_reflections.$inferSelect;
export type NewPostClassReflection = typeof post_class_reflections.$inferInsert;
export type PedagogicalPrinciplesSeen = typeof pedagogical_principles_seen.$inferSelect;
export type KnowledgeSnippet = typeof knowledge_snippets.$inferSelect;
export type NewKnowledgeSnippet = typeof knowledge_snippets.$inferInsert;
export type CoachingEvent = typeof coaching_events.$inferSelect;
export type NewCoachingEvent = typeof coaching_events.$inferInsert;
export type SyncLogRow = typeof sync_log.$inferSelect;
export type NewSyncLogRow = typeof sync_log.$inferInsert;
