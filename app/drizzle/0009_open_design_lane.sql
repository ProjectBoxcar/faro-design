ALTER TABLE `settings` ADD `design_api_key` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `design_ai_provider` text DEFAULT 'openai-compatible' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `design_ai_base_url` text;--> statement-breakpoint
ALTER TABLE `settings` ADD `design_ai_model` text;
