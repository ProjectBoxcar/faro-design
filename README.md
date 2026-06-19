# Brand App — Finisterra Methodology Workspace

A project-based web app that encodes the **Finisterra brand-design methodology** to:

1. Guide creation of brand concepts (Strategy → Planning → Design), and
2. Produce **handover briefs** for a professional graphic designer via a shareable read-only link.

It is a **designer's cockpit**: you (the designer) run it and own the synthesis; clients can fill the
intake-only sections. The app does the structured capture, runs the methodology's evaluation
frameworks, and uses Claude to draft the synthesis sections (which you review and edit).

## Status

Early build. Design docs in this folder (`01`–`09`) are the source of truth for scope and data model.

## Quick start

```powershell
cd "F:\Brand App\app"
npm install
npm run db:migrate     # create the SQLite schema
npm run dev            # http://localhost:3000
```

`ANTHROPIC_API_KEY` goes in `F:\Brand App\app\.env.local` (gitignored). Without it, capture and
evaluation work; AI-draft buttons are disabled.

## Where the methodology lives

- Original source: `F:\Brand App\Finisterra_md_files\` (18 Spanish `.md` files — **read-only reference, never edited**).
- In-app, translated to English and structured as data: `app/data/methodology.json`.

## Docs

| File | What |
|---|---|
| `01-mvp-scope.md` | What's in / out for v1 |
| `02-methodology-model.md` | The Finisterra methodology as an English data taxonomy |
| `03-user-flows.md` | How a project moves through the app |
| `04-data-model.md` | Drizzle / SQLite schema |
| `05-ai-architecture.md` | Synthesis prompts, model choice, hybrid AI |
| `06-tech-stack.md` | Stack and why |
| `07-roadmap.md` | Build order |
| `08-handover-spec.md` | The shareable brief output |
| `09-open-questions.md` | Decisions still pending |
