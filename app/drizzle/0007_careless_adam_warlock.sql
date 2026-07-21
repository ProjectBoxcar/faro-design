CREATE TABLE `design_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`kind` text NOT NULL,
	`count` integer DEFAULT 3 NOT NULL,
	`design_system_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`asset_ids` text DEFAULT '[]',
	`error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `design_jobs_project_kind_idx` ON `design_jobs` (`project_id`,`kind`);