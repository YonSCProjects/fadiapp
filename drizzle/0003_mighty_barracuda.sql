CREATE TABLE `class_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`student_id` text NOT NULL,
	`date` text NOT NULL,
	`period` integer NOT NULL,
	`entry` integer DEFAULT 0 NOT NULL,
	`attendance` integer DEFAULT 0 NOT NULL,
	`execution` integer DEFAULT 0 NOT NULL,
	`atmosphere` integer DEFAULT 0 NOT NULL,
	`personal_goal` integer DEFAULT 0 NOT NULL,
	`bonus` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`sync_rev` integer DEFAULT 0 NOT NULL,
	`drive_etag` text,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_scores_session` ON `class_scores` (`class_id`,`date`,`period`);--> statement-breakpoint
CREATE INDEX `idx_scores_student` ON `class_scores` (`student_id`,`date`);--> statement-breakpoint
ALTER TABLE `classes` ADD `educator_email` text;