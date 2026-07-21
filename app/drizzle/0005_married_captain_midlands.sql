ALTER TABLE `settings` ADD `ai_provider` text DEFAULT 'anthropic' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `ai_base_url` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `ai_model` text;