CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`name_he` text NOT NULL,
	`name_en` text,
	`category` text NOT NULL,
	`environment` text DEFAULT 'any' NOT NULL,
	`equipment_json` text,
	`min_space_m2` integer,
	`tags_json` text,
	`source_ref` text,
	`video_url_local` text,
	`difficulty` integer,
	`cues_he` text,
	`safety_he` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`sync_rev` integer DEFAULT 0 NOT NULL,
	`drive_etag` text
);
--> statement-breakpoint
CREATE INDEX `idx_activities_category` ON `activities` (`category`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_activities_source_ref` ON `activities` (`source_ref`);--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_instance_id` text NOT NULL,
	`student_id` text NOT NULL,
	`status` text DEFAULT 'present' NOT NULL,
	`note_local` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`sync_rev` integer DEFAULT 0 NOT NULL,
	`drive_etag` text,
	FOREIGN KEY (`lesson_instance_id`) REFERENCES `lesson_instances`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_attendance_instance_student` ON `attendance` (`lesson_instance_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`grade` integer NOT NULL,
	`year` integer NOT NULL,
	`students_count_cached` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`sync_rev` integer DEFAULT 0 NOT NULL,
	`drive_etag` text
);
--> statement-breakpoint
CREATE INDEX `idx_classes_grade_year` ON `classes` (`grade`,`year`);--> statement-breakpoint
CREATE TABLE `coaching_events` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`rule_key` text NOT NULL,
	`fired_at` integer NOT NULL,
	`shown_at` integer,
	`dismissed` integer DEFAULT false NOT NULL,
	`acted_on` integer DEFAULT false NOT NULL,
	`cooldown_until` integer,
	`evidence_ids_json` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`sync_rev` integer DEFAULT 0 NOT NULL,
	`drive_etag` text,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_coaching_cooldown` ON `coaching_events` (`teacher_id`,`cooldown_until`);--> statement-breakpoint
CREATE TABLE `knowledge_snippets` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title_he` text NOT NULL,
	`body_md_he` text NOT NULL,
	`source_url` text,
	`published_at` integer,
	`ingested_at` integer NOT NULL,
	`shown_at` integer,
	`dismissed` integer DEFAULT false NOT NULL,
	`relevance_tags_json` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`sync_rev` integer DEFAULT 0 NOT NULL,
	`drive_etag` text
);
--> statement-breakpoint
CREATE INDEX `idx_snippets_kind` ON `knowledge_snippets` (`kind`);--> statement-breakpoint
CREATE INDEX `idx_snippets_ingested` ON `knowledge_snippets` (`ingested_at`);--> statement-breakpoint
CREATE TABLE `lesson_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_id` text NOT NULL,
	`class_id` text NOT NULL,
	`scheduled_at` integer,
	`started_at` integer,
	`ended_at` integer,
	`status` text DEFAULT 'planned' NOT NULL,
	`planned_blocks_json` text NOT NULL,
	`actual_blocks_json` text,
	`weather` text,
	`location` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`sync_rev` integer DEFAULT 0 NOT NULL,
	`drive_etag` text,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_instances_class_sched` ON `lesson_instances` (`class_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `idx_instances_status` ON `lesson_instances` (`status`);--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`title_he` text NOT NULL,
	`grade_band` text NOT NULL,
	`duration_min` integer NOT NULL,
	`goal_he` text NOT NULL,
	`equipment_json` text,
	`environment` text DEFAULT 'gym' NOT NULL,
	`pedagogical_model` text,
	`blocks_json` text NOT NULL,
	`safety_notes_he` text,
	`pedagogical_rationale_he` text,
	`source` text NOT NULL,
	`llm_model_used` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`sync_rev` integer DEFAULT 0 NOT NULL,
	`drive_etag` text
);
--> statement-breakpoint
CREATE INDEX `idx_lessons_grade` ON `lessons` (`grade_band`);--> statement-breakpoint
CREATE INDEX `idx_lessons_model` ON `lessons` (`pedagogical_model`);--> statement-breakpoint
CREATE TABLE `pedagogical_principles_seen` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`model_key` text NOT NULL,
	`lesson_instance_id` text NOT NULL,
	`observed_at` integer NOT NULL,
	`weight` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`sync_rev` integer DEFAULT 0 NOT NULL,
	`drive_etag` text,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lesson_instance_id`) REFERENCES `lesson_instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_principles_teacher_observed` ON `pedagogical_principles_seen` (`teacher_id`,`observed_at`);--> statement-breakpoint
CREATE TABLE `post_class_reflections` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_instance_id` text NOT NULL,
	`went_well_he` text,
	`would_change_he` text,
	`energy_level` integer,
	`teacher_mood` integer,
	`student_engagement` integer,
	`free_text_he` text,
	`audio_note_path` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`sync_rev` integer DEFAULT 0 NOT NULL,
	`drive_etag` text,
	FOREIGN KEY (`lesson_instance_id`) REFERENCES `lesson_instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_class_reflections_lesson_instance_id_unique` ON `post_class_reflections` (`lesson_instance_id`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`initials` text NOT NULL,
	`display_label` text NOT NULL,
	`full_name_enc` text,
	`medical_flags_json` text,
	`sort_index` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`sync_rev` integer DEFAULT 0 NOT NULL,
	`drive_etag` text,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_students_class` ON `students` (`class_id`,`sort_index`);--> statement-breakpoint
CREATE TABLE `sync_log` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_table` text NOT NULL,
	`entity_id` text NOT NULL,
	`op` text NOT NULL,
	`attempted_at` integer NOT NULL,
	`drive_etag_after` text,
	`error` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`sync_rev` integer DEFAULT 0 NOT NULL,
	`drive_etag` text
);
--> statement-breakpoint
CREATE INDEX `idx_sync_log_entity` ON `sync_log` (`entity_table`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_sync_log_attempted` ON `sync_log` (`attempted_at`);--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`google_sub` text,
	`school_name` text,
	`drive_folder_id` text,
	`locale` text DEFAULT 'he-IL' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`sync_rev` integer DEFAULT 0 NOT NULL,
	`drive_etag` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teachers_google_sub_unique` ON `teachers` (`google_sub`);