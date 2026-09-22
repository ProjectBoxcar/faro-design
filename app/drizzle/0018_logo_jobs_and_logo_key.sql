ALTER TABLE settings ADD COLUMN logo_api_key text;
--> statement-breakpoint
UPDATE settings
SET logo_api_key = design_api_key
WHERE (logo_api_key IS NULL OR logo_api_key = '')
  AND design_api_key IS NOT NULL
  AND design_api_key NOT LIKE 'sk-ant%';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS logo_jobs (
  id text PRIMARY KEY NOT NULL,
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  action text NOT NULL,
  source_asset_id text,
  feedback text,
  status text DEFAULT 'queued' NOT NULL,
  error text,
  discarded integer DEFAULT 0 NOT NULL,
  created_at integer DEFAULT (unixepoch()) NOT NULL,
  updated_at integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS logo_jobs_project_idx ON logo_jobs (project_id);
