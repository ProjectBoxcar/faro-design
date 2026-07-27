CREATE TABLE `brand_memory` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`project_name` text,
	`engine` text DEFAULT 'all' NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`meta` text DEFAULT '{}',
	`weight` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `brand_memory_engine_idx` ON `brand_memory` (`engine`);
--> statement-breakpoint
CREATE INDEX `brand_memory_project_idx` ON `brand_memory` (`project_id`);
