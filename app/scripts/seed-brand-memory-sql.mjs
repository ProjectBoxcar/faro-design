import Database from "better-sqlite3";
import { nanoid } from "nanoid";

const db = new Database("data/brand.db");
db.exec(`
CREATE TABLE IF NOT EXISTS brand_memory (
  id text PRIMARY KEY NOT NULL,
  project_id text,
  project_name text,
  engine text DEFAULT 'all' NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  meta text DEFAULT '{}',
  weight integer DEFAULT 1 NOT NULL,
  created_at integer DEFAULT (unixepoch()) NOT NULL
);
`);

function sectionVal(projectId, key) {
  const row = db
    .prepare("SELECT value FROM sections WHERE project_id = ? AND section_key = ?")
    .get(projectId, key);
  if (!row?.value) return "";
  let v = row.value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return String(v).slice(0, 280);
    }
  }
  if (typeof v !== "object" || !v) return "";
  for (const k of ["statement", "text", "summary", "concept", "pattern", "taste", "description"]) {
    if (typeof v[k] === "string" && v[k].trim()) return v[k].trim().slice(0, 280);
  }
  return JSON.stringify(v).slice(0, 280);
}

function upsert(projectId, projectName, engine, kind, title, body, weight = 3) {
  if (!body.trim()) return;
  db.prepare(
    "DELETE FROM brand_memory WHERE project_id = ? AND kind = ? AND engine = ?"
  ).run(projectId, kind, engine);
  db.prepare(
    `INSERT INTO brand_memory (id, project_id, project_name, engine, kind, title, body, meta, weight, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, '{}', ?, unixepoch())`
  ).run(nanoid(), projectId, projectName, engine, kind, title, body.slice(0, 4000), weight);
}

const projects = db
  .prepare(
    "SELECT id, name FROM projects WHERE share_token IS NOT NULL OR current_phase = 'finished'"
  )
  .all();

for (const p of projects) {
  const concept = sectionVal(p.id, "concept");
  const pattern = sectionVal(p.id, "brief.central-pattern");
  const territory = sectionVal(p.id, "brief.emotional-territory");
  const strategyBody = [
    concept && `Concept: ${concept}`,
    pattern && `Central pattern: ${pattern}`,
    territory && `Emotional territory: ${territory}`,
  ]
    .filter(Boolean)
    .join("\n");
  if (strategyBody) {
    upsert(p.id, p.name, "strategy", "strategy_outcome", `${p.name} — strategy that shipped`, strategyBody, 3);
  }

  const logo = db
    .prepare(
      "SELECT label, direction FROM studio_assets WHERE project_id = ? AND status = 'approved' LIMIT 1"
    )
    .get(p.id);
  if (logo) {
    upsert(
      p.id,
      p.name,
      "logo",
      "logo_preference",
      `${p.name} — approved logo “${logo.label}”`,
      `Approved logo for ${p.name}: “${logo.label}”.${logo.direction ? ` Direction: ${logo.direction}` : ""} Prefer marks in this spirit for similar businesses.`,
      4
    );
  }

  const identity = db
    .prepare(
      "SELECT variant FROM assets WHERE project_id = ? AND kind = 'design_system' AND selected = 1 LIMIT 1"
    )
    .get(p.id);
  if (identity) {
    upsert(
      p.id,
      p.name,
      "design",
      "design_preference",
      `${p.name} — selected design system ${identity.variant ?? ""}`.trim(),
      `Owner selected design system proposal ${identity.variant ?? "final"} for ${p.name}. Prefer similar system clarity and brief fidelity.`,
      4
    );
  }

  upsert(
    p.id,
    p.name,
    "all",
    "package",
    `${p.name} — finished brand package`,
    `Finished brand package for ${p.name}. ${concept ? `Strategy spine: ${concept}` : ""} ${logo ? `Logo: “${logo.label}”.` : ""} Treat as a successful end-to-end reference.`,
    5
  );
  console.log("seeded", p.name);
}

const n = db.prepare("SELECT count(*) as c FROM brand_memory").get();
console.log("total learnings", n.c);
db.close();
