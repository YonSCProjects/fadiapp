CREATE TABLE `design_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`text_he` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	`sync_rev` integer DEFAULT 0 NOT NULL,
	`drive_etag` text,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_design_feedback_class` ON `design_feedback` (`class_id`);--> statement-breakpoint
ALTER TABLE `classes` ADD `design_profile_he` text;