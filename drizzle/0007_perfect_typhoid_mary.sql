CREATE TABLE `design_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_id` text NOT NULL,
	`text_he` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`sync_rev` integer DEFAULT 0 NOT NULL,
	`drive_etag` text,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_design_feedback_lesson` ON `design_feedback` (`lesson_id`);