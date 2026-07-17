ALTER TABLE `assets` ADD `variant` text;--> statement-breakpoint
ALTER TABLE `assets` ADD `selected` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `assets` ADD `design_system_id` text;