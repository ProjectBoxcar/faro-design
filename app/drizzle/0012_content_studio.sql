CREATE TABLE `content_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`source` text NOT NULL,
	`brand_name` text NOT NULL,
	`locked` integer DEFAULT true NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `content_profiles_project_idx` ON `content_profiles` (`project_id`);
--> statement-breakpoint
CREATE TABLE `content_raw_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`kind` text DEFAULT 'unknown' NOT NULL,
	`storage_path` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `content_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `content_raw_assets_profile_idx` ON `content_raw_assets` (`profile_id`);
--> statement-breakpoint
CREATE TABLE `content_calendars` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `content_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `content_calendars_profile_idx` ON `content_calendars` (`profile_id`);
--> statement-breakpoint
CREATE TABLE `content_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`calendar_id` text NOT NULL,
	`day_index` integer NOT NULL,
	`date_iso` text NOT NULL,
	`platforms` text DEFAULT '[]',
	`caption` text DEFAULT '' NOT NULL,
	`hashtags` text DEFAULT '[]',
	`variants` text DEFAULT '[]',
	`source_asset_ids` text DEFAULT '[]',
	`status` text DEFAULT 'draft' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`calendar_id`) REFERENCES `content_calendars`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `content_posts_calendar_idx` ON `content_posts` (`calendar_id`);
