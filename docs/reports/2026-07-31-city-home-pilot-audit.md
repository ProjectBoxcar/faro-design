# CITY HOME pilot + stage audit

**Date:** 2026-07-31  
**Project:** CITY HOME (`SwbVv4XBiNlaIUoUd6aiY`)  
**Client label:** City Home Co. — all-things home / small-apartment furniture & decor  
**Dev:** `http://localhost:3100`  
**Share token:** `5Ldy3m-WZ0u1Wz0o_N2Ti`  
**Branch context:** `feature/owner-journey-hardening` (PR #10)

---

## 1. What we ran (live pilot)

| Stage | Result |
|-------|--------|
| **Start / intake** | Project created; greenfield commercial; 6Q + taste; viability **caveat** |
| **Express strategy** | **27/27** done, engine `strategy-direct` (Claude) |
| **Concept** | **“Made to fit.”** · central pattern **Fit** |
| **Approve** | Publish snapshot v1 (~52KB strategy brief); share link issued |
| **Name workshop** | Candidates proposed (Fits Right, Hallway Turn, Fit & Frame, Seven Hundred, Made Room) — **never confirmed** (CITY HOME not treated as generic → workshop skippable) |
| **Logo workshop** | **9 candidates**, all `candidate`; mixed judge fail/caveat; wordmarks use **CITY HOME** |
| **Design Studio** | Locked (no approved logo); `design_jobs` empty; OD not exercised this pilot |
| **Handover package** | Snapshot `package.ready === false` (strategy-only freeze) |

**Open in app**

- Express: `/projects/SwbVv4XBiNlaIUoUd6aiY/express`
- Logos: `/projects/SwbVv4XBiNlaIUoUd6aiY/studio/logo`
- Name: `/projects/SwbVv4XBiNlaIUoUd6aiY/name` (redirects to studio for non-generic names)
- Design: `/projects/SwbVv4XBiNlaIUoUd6aiY/design`
- Share: `/share/5Ldy3m-WZ0u1Wz0o_N2Ti`

---

## 2. What worked well

1. **Three AI lanes stayed clean** — strategy = Anthropic/settings; logos = OpenAI → Gemini; design = Open Design only (not reached this run).
2. **Express full strategy chain** — Reality → Identity → Communication → Brief → Concept → Manifesto → Design plan → strategic document.
3. **Concept quality** — “Made to fit.” is on-brief for a small-space home brand (hallway turn, &lt;700 sq ft, coordinated systems).
4. **Greenfield viability soft path** — missing recurring sales → **caveat**, not hard fail; studio not blocked.
5. **Logo variety improved** — mixed structures (wordmark / mark+word / badge); judge scores visible; fails still shown as choices.
6. **Design correctly gated** on approved logo.
7. **Strategy publish freeze** — share brief uses snapshot; incomplete package does not leak live design.
8. **Sidebar journey** — locked / todo / current / done model largely coherent after logo lock fix.
9. **Progress monotonicity** (mid-session) for Express drafting.

---

## 3. Stage-by-stage issues (fix later)

Severity: **P0** trust/data/journey wrong · **P1** broken UX/gates · **P2** polish.

### Stage A — Start + Intake

| ID | Sev | Issue | Fix direction |
|----|-----|--------|---------------|
| A-P0-1 | **P0** | **5/6 Quick Start answers never stored** — only `intake.taste`. No `reality.intake` / `intake.answers`. | Persist full answers **before** AI expand; use on regenerate/audit. |
| A-P0-2 | **P0** | Missing API key path creates project **before** any answer save. | Save answers first; skip expand with clear UX. |
| A-P0-3 | **P0** | Expand failure returns 200 + `projectId`; UI still routes to Express. | Surface error; don’t pretend success when `filled === 0`. |
| A-P1-1 | P1 | Viability readiness treats empty **input** reads as ready. | Require non-empty for gate inputs. |
| A-P1-2 | P1 | First viability often no-ops (needs `reality.differentiator` from Express). | Seed provisional differentiator or document timing. |
| A-P1-3 | P1 | `ownerLed` only from empty `client_name`, ignores `personal`. | `ownerLed = personal \|\| !client_name`. |
| A-P2 | P2 | Docs/pilot say “11 questions”; UI is **6 + details**. Align copy. |

### Stage B — Express strategy

| ID | Sev | Issue | Fix direction |
|----|-----|--------|---------------|
| B-P1-1 | **P1** | **`current_phase` never leaves `strategic`** on approve/logo. Only set to `finished` later. | Write phase at strategy done / logo approved / design; or derive from journey. |
| B-P1-2 | P1 | Cancel/run state is **in-memory only**; restart auto-starts idle incomplete. | Persist run/cancel; don’t auto-start cancelled. |
| B-P1-3 | P1 | Pipeline **auto-completes** all sections before owner Approve (contradicts “drafts until approve”). | Defer `complete` until Approve. |
| B-P1-4 | P1 | Hub **UpNext** after Express: “hand to designer” — no CTA to name/logo/approve. | Point to name/studio/approve. |
| B-P1-5 | P1 | Fidelity risk: synthesis elaborates without raw 6Q. | Same as A-P0-1 + tighter synthesis grounding. |
| B-P2 | P2 | Peak % session-only; weak resume error handling; no Express e2e tests. | Persist peak; tests. |

### Stage C — Name workshop

| ID | Sev | Issue | Fix direction |
|----|-----|--------|---------------|
| C-P0-1 | **P0** | Non-generic titles (**CITY HOME**) **skip workshop**; `/name` redirects; candidates exist but **no confirm UI**. | Always offer confirm/keep-name after strategy; sidebar stays todo until confirm. |
| C-P0-2 | **P0** | `evaluations.type = "naming"` conflates **workshop confirm** and **availability check**. | Split types or score fields. |
| C-P1-1 | P1 | Server does **not** require confirm before logo generate (`clearedName` → project.name). | Optional hard gate + UI “using unconfirmed name”. |
| C-P1-2 | P1 | Sidebar marks name **done** without confirmation when not generic. | `done` only on confirm. |
| C-P1-3 | P1 | `suggestedCandidates` reads wrong section shapes (exploration vs presentation). | Read `naming.exploration.candidates`. |
| C-P2 | P2 | Availability check orphaned from Express name path. | Wire into workshop or drop. |

### Stage D — Logo workshop

| ID | Sev | Issue | Fix direction |
|----|-----|--------|---------------|
| D-P1-1 | **P1** | Asset `model` always stores requested `gpt-4o` even when **Gemini** ran. | Persist `result.model` + `engine`. |
| D-P1-2 | P1 | Logos can ship under unconfirmed working title. | See C-P0/P1. |
| D-P2-1 | P2 | No post-gen structure diversity validation (prompt-only). | Soft check 3 structures. |
| D-P2-2 | P2 | Fail candidates clutter (by design). | Optional auto-sort / “hide fails”. |
| D-P2-3 | P2 | `ai_generations.accepted` always 0 for logos. | Accept on insert or logo approve. |

### Stage E — Design Studio

| ID | Sev | Issue | Fix direction |
|----|-----|--------|---------------|
| E-P0-1 | **P0** | Restart of **running** job without `resume` **deletes partial assets** and regenerates. | Always resume orphaned running jobs; never wipe landed assets. |
| E-P1-1 | P1 | Page always 200 when blocked — easy to think studio is open. | Stronger locked empty-state. |
| E-P2 | P2 | OD down copy better on API than Design Studio banner; orphan `running` status after process death. | Align copy; boot sweeper. |

*(CITY HOME did not reach generation — design gates correct.)*

### Stage F — Publish / Handover

| ID | Sev | Issue | Fix direction |
|----|-----|--------|---------------|
| F-P0-1 | **P0** | Express approve **auto-publishes** + freezes **strategy-only** snapshot; **no re-freeze UX** when design finishes later. Share package can stay “not ready when published” forever. | Split “strategy brief ready” vs “publish package”; re-snapshot on package complete; “Update published package” CTA. |
| F-P1-1 | P1 | UX blurs strategy published vs final package published. | Copy + CTAs. |
| F-P1-2 | P1 | Home list: `designJourneyDone = published_at && logoApproved` — **too early**. | Match sidebar (identity + landing + deck selected). |
| F-P2 | P2 | `packageReady` from API unused in owner UI. | Show incomplete package hint. |

### Cross-cutting

| ID | Sev | Issue | Fix direction |
|----|-----|--------|---------------|
| X-P0 | **P0** | Lifecycle semantics: phase dead letter + mid-journey publish + home progress lie. | Fix pack: F-P0-1 + B-P1-1 + F-P1-2. |
| X-P1 | P1 | Thin tests: no sidebar-journey matrix, express approve side effects, home progress. | Add pure tests. |
| X-P2 | P2 | Docs data-model lag; dual graphics key field; JourneyProgress vs 5-stage sidebar. | Doc + settings clarity. |

---

## 4. Prioritized fix-later backlog (recommended order)

### Pack 1 — lifecycle honesty — **IMPLEMENTED 2026-07-31**

Shipped in code:

1. **`lib/project-lifecycle.ts` + pure helpers** — derive phase, auto re-freeze share when design package completes after early strategy publish.
2. **Home design progress** — uses `finalDeliverableIssue` / `isDesignJourneyDone` (not `published_at && logo`).
3. **Phase writers** — express approve → planning; logo approve → design; package + share → finished via `syncProjectLifecycle`.
4. **Copy** — PublishPanel / BrandHandoverActions / UpNext: strategy brief vs brand package; Update package freeze CTA.
5. **Tests** — `lib/__tests__/project-lifecycle.test.ts` (10 cases).

### Pack 2 — data provenance — **IMPLEMENTED 2026-07-31**

1. **`intake.answers`** — all six Quick Start answers saved before AI; taste still mirrored to `intake.taste`.
2. **Honest fail** — missing key / expand failure keeps answers; Start UI uses `aiSkipped` / `intakeError`.
3. **Name confirm always** — `needsNameWorkshop = !hasConfirmedBrandName`; Express → `/name`; sidebar not auto-done for non-generic titles.
4. **Eval split** — `naming_confirm` vs `naming_availability` (legacy `naming` + score `source` still counts as confirm).
5. **Logo provenance** — actual `result.model` + `engine` on assets and `ai_generations`.
6. **Server gate** — first logo generate requires name confirm (legacy projects with logo work stay open).
7. **Tests** — `intake-answers.test.ts`, `naming-confirm.test.ts`.

### Pack 3 — durability & gates — **IMPLEMENTED 2026-07-31**

1. **Design job resume** — `shouldResumeDesignJob`; orphaned queued/running jobs keep landed assets; page/API always pass `resume: true`.
2. **Durable Express cancel** — persisted on `express.pipeline`; cancelled survives server restart (no idle auto-start).
3. **Drafts until Approve** — pipeline no longer auto-completes sections; `completeSectionsWithContent` only on Express approve.
4. **Tests** — `design-job-resume.test.ts`, `express-run-state.test.ts`.

### Pack 4 — polish — **IMPLEMENTED 2026-07-31**

1. Design Studio OD downtime copy (port 7456, `od:ensure`, lane note).
2. Soft logo structure diversity retry (`logo-diversity-pure`).
3. Docs: `11-ai-lanes` journey lifecycle notes; `08-handover` strategy vs package share.
4. Tests for diversity helper.

---

## 5. Pilot data snapshot (inspect)

```
project: CITY HOME / City Home Co. / greenfield / viability=caveat / phase=strategic
sections: ~40 complete strategy keys; intake.taste only for raw; naming.exploration draft
studio_assets: 9 logo candidates (no approve)
design_jobs: []
publish_snapshots: 1 (strategy freeze)
evaluations: viability caveat + logo judges (mixed)
ai_generations: strategy claude-opus-4-8 accepted; studio.logo gpt-4o accepted=0
```

Inspect scripts (local, untracked ok):

- `app/scripts/inspect-city-home.mjs`
- `app/scripts/inspect-city-home-2.mjs`

---

## 6. Agents used

| Agent | Stage |
|-------|--------|
| Start + intake | Raw answers, viability greenfield |
| Express strategy | Pipeline, progress, approve, phase |
| Name + logo | Workshop gates, clearedName, lanes |
| Design + publish | Jobs, freeze, re-publish, OD |
| Cross-cutting | Lanes, phase, home progress, tests |

---

## 7. Out of scope this pilot

- Approving a logo and running full Design Studio (OD identity / landing / deck) — blocked by owner choice + no approved logo.  
- Implementing P0 fixes (awaiting go-ahead).  
- Cleaning pilot project from DB.

---

*Generated from live DB + five read-only stage audits. Implementation not included.*
