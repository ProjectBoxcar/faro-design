CREATE TABLE `publish_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`share_token` text NOT NULL,
	`version` integer NOT NULL,
	`is_current` integer DEFAULT true NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `publish_snapshots_project_idx` ON `publish_snapshots` (`project_id`);
--> statement-breakpoint
CREATE INDEX `publish_snapshots_token_idx` ON `publish_snapshots` (`share_token`);
--> statement-breakpoint
CREATE UNIQUE INDEX `publish_snapshots_project_version_idx` ON `publish_snapshots` (`project_id`,`version`);
