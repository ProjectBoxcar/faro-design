CREATE TABLE `studio_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`direction` text,
	`payload` text,
	`status` text DEFAULT 'candidate' NOT NULL,
	`approved_at` integer,
	`audit_status` text,
	`audit_note` text,
	`evaluation_id` text,
	`model` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`evaluation_id`) REFERENCES `evaluations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `studio_assets_project_kind_idx` ON `studio_assets` (`project_id`,`kind`);