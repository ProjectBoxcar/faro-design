---
name: evidence-led-intervention
description: Run every Brand App intervention through context, subagent research, evidence, implementation, and end-to-end review
argument-hint: "[task description]"
triggers:
  - user
  - model
---

Use this workflow for every non-trivial Brand App change, bug fix, audit, or feature.

## 1. Rebuild context before acting

1. Read `CLAUDE.md` and the relevant design docs in `docs/`, especially `02-methodology-model.md` for taxonomy and dependencies.
2. Check current git status and open changes. Never overwrite unrelated work.
3. Search the codebase before asking questions. Trace frontend, API, persistence, tests, and user journey together.
4. Recall relevant prior findings and user preferences from the conversation and project memories. Verify them against current code instead of assuming they remain true.
5. For configuration work, consult the `devin-cli` skill first and write new project configuration only under `.devin/`.

## 2. Plan visibly and protect data

1. Create a todo list for work with three or more steps and keep exactly one item in progress.
2. Treat `app/data/brand.db` as irreplaceable. Before migrations or broad live-data testing, run `npm run backup` from `app/`.
3. Use `npm run db:migrate` for additive schema changes. Never use `db:push`.
4. Keep synthetic tests isolated by a clearly labeled project id/name. Never inspect unrelated project content.
5. Do not edit or delete `reference/finisterra/`.

## 3. Use independent evidence streams

Launch appropriate subagents in parallel whenever the intervention is not trivial:

- Architecture/data-flow auditor: trace routes, components, persistence, dependencies, and failure states.
- UX/research auditor: use authoritative primary sources and map recommendations to the actual product journey.
- Security/test auditor: inspect secrets, project scoping, destructive behavior, accessibility, and regression coverage.
- Methodology/content auditor when Finisterra behavior or generated quality is involved.

Subagents are evidence providers, not decision-makers. Reconcile their output against project rules and source-of-truth docs. Reject recommendations that conflict with local scope, methodology fidelity, security, or real code behavior.

## 4. Reproduce before fixing

1. Establish a deterministic baseline with the smallest safe reproduction.
2. Record observable evidence without exposing secrets or real client content.
3. Identify root cause across the complete path, not only the visible symptom.
4. Rank findings: critical, high, medium, low.
5. For bugs, add a failing focused test when feasible before changing implementation.

## 5. Implement minimally and reversibly

1. Fix highest severity first.
2. Preserve existing conventions and reuse current abstractions.
3. Keep methodology dependencies explicit and enforce critical gates in both UI and API.
4. Never claim progress, completion, security, or AI quality that the backend cannot verify.
5. Prefer additive schema changes and state machines for long-running work; prevent partial writes and concurrent duplicates.
6. Do not add dependencies unless existing tools cannot solve the requirement safely.

## 6. Verify in layers

Run the smallest relevant checks first, then all applicable project checks:

1. Focused unit/regression tests.
2. `npm test`.
3. `npm run lint`.
4. TypeScript with `tsc --noEmit`.
5. `npm run build`.
6. `git diff --check` and a full diff review.
7. A final read-only subagent audit of the implemented path.

For journey changes, create or reuse one synthetic project and test the real flow from owner inputs through methodology, brief, publish, Design Studio, final selection, and Faro delivery. Verify DB invariants and public-content exclusions at each checkpoint.

## 7. Close with evidence

1. Report what passed and what remains imperfect.
2. Separate verified facts from recommendations.
3. Include synthetic project identifiers when useful so the user can inspect the result.
4. Leave test data in place unless the user explicitly approves deletion.
5. Never commit or push unless the user explicitly authorizes that action. Treat commit and push as separate approvals when wording is ambiguous.
6. Save durable project learnings in the existing rules file when they are broadly reusable.
