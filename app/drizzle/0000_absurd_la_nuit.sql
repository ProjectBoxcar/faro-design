CREATE TABLE `ai_generations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`section_key` text NOT NULL,
	`model` text NOT NULL,
	`reads` text DEFAULT '[]',
	`output` text,
	`accepted` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_generations_project_idx` ON `ai_generations` (`project_id`);--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`type` text NOT NULL,
	`subject` text,
	`scores` text DEFAULT '[]',
	`verdict` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `evaluations_project_idx` ON `evaluations` (`project_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`client_name` text,
	`status` text DEFAULT 'active' NOT NULL,
	`viability` text DEFAULT 'pending' NOT NULL,
	`greenfield` integer DEFAULT false NOT NULL,
	`current_phase` text DEFAULT 'strategic' NOT NULL,
	`share_token` text,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_share_token_unique` ON `projects` (`share_token`);--> statement-breakpoint
CREATE TABLE `sections` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`section_key` text NOT NULL,
	`value` text,
	`status` text DEFAULT 'empty' NOT NULL,
	`ai_generated` integer DEFAULT false NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sections_project_key_idx` ON `sections` (`project_id`,`section_key`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`designer_name` text,
	`default_model` text DEFAULT 'claude-opus-4-8' NOT NULL,
	`debug_mode` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
