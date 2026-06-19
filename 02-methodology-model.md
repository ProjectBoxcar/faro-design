# 02 — Methodology Model (English taxonomy)

The canonical English structure of the Finisterra methodology, as the app models it. This is the
source of truth for `app/data/methodology.json`. Source: the 18 files in `Finisterra_md_files/`
(note: `0__Metodologi_a.md` and `1___Gui_a_de_Proceso.md` are identical — treated as one).

**Resolver legend:** `client` · `designer` · `collab` · `designer→client` (designer proposes, client validates).
**Kind:** `input` (raw capture) · `synthesis` (derived; AI-draftable) · `eval` (scored framework) · `partial` (mix).

---

## Shape

```
Project
└── Phase (Strategic | Planning | Design)
    └── Pillar / Stage
        └── Section   (the unit the UI renders as a form / draft / evaluation)
```

Section ids are stable kebab-case keys used as DB keys and JSON node ids (e.g. `reality.problem`,
`brief.central-pattern`). Each section node carries: `name`, `resolver`, `kind`, `fields[]`,
`triggerQuestions[]`, `reads[]` (upstream section ids it depends on), `helpText`.

---

## PHASE 1 — STRATEGIC

### Pillar: Reality (`reality`) — *client speaks, designer asks* (file 2)

| Section | id | Resolver | Kind |
|---|---|---|---|
| Problem | `reality.problem` | client | input |
| Solution | `reality.solution` | client | input |
| Value Proposition | `reality.value-proposition` | collab | synthesis |
| Differentiator | `reality.differentiator` | collab | synthesis |
| Ideal Client | `reality.ideal-client` | client | input |
| Business Stage | `reality.business-stage` | client | input (enum: launch / growth / consolidation / reinvention) |
| Market Context | `reality.market-context` | collab | partial |
| Operational Quirks | `reality.operational-quirks` | client | input |
| Service | `reality.service` | client | input |
| Service Structure | `reality.service-structure` | client | input (packages + pricing) |
| Brand Architecture (inventory) | `reality.brand-architecture` | collab | partial |
| Acquisition Channels | `reality.acquisition-channels` | client | input |
| Capacity | `reality.capacity` | client | input |
| **Evaluation Criteria** (viability gate) | `reality.evaluation-criteria` | designer (internal) | eval |

### Pillar: Identity (`identity`) — *client opens up, designer interprets* (file 3)

| Section | id | Resolver | Kind |
|---|---|---|---|
| Origin | `identity.origin` | client | input |
| Self-Perception | `identity.self-perception` | client | input |
| Aspiration | `identity.aspiration` | client | input |
| Principle | `identity.principle` | collab | synthesis |
| Beliefs | `identity.beliefs` | client | input |
| Position Toward the Industry | `identity.position` | collab | synthesis |
| Golden Circle (what / how / why) | `identity.golden-circle` | collab | synthesis |

### Pillar: Image (`image`) — *designer works, client only supplies contacts* (file 4)

Discovered, not declared. **Reads Identity** to build the survey; its contrast validates Identity.

| Section | id | Resolver | Kind |
|---|---|---|---|
| Survey Design | `image.survey-design` | designer | synthesis (reads `identity.*`) |
| Respondent Selection | `image.respondents` | collab | input |
| Survey Distribution | `image.distribution` | client | input |
| Results | `image.results` | client provides / designer collects | input |
| Pattern Analysis | `image.pattern-analysis` | designer | synthesis (reads `image.results`) |
| Contrast with Identity | `image.contrast` | designer | synthesis (reads `identity.*`, `image.pattern-analysis`) |
| Key Finding | `image.key-finding` | designer | synthesis |
| Sample Limitation | `image.sample-limitation` | designer | input |

### Pillar: Communication (`communication`) — *designer creates, client validates* (file 5)

Cannot start before Identity↔Image contrast exists.

| Section | id | Resolver | Kind |
|---|---|---|---|
| Purpose | `communication.purpose` | designer→client | synthesis |
| Values | `communication.values` | designer→client | synthesis (ordered by survey) |
| Operating Principles | `communication.operating-principles` | designer→client | synthesis |
| Personality | `communication.personality` | designer / client confirm | synthesis (3–5 traits) |
| Tone of Voice | `communication.tone` | designer / client confirm | synthesis (3–5 traits) |
| Brand Promise | `communication.promise` | designer→client | synthesis |
| Brand Architecture (definition) | `communication.brand-architecture` | designer / client validate | synthesis (reads `reality.brand-architecture`) |
| Deferred Items | `communication.deferred` | designer | input |

---

## STRATEGY CLOSE / HANDOFF (between phases)

### Strategic Document (`strategic-document`) — client-facing (files 6, 6.1)
`designer writes / client validates`. Narrative synthesis of the 4 pillars (1st person, no jargon).
Sections: `1. Reality (context)` · `2. Identity` · `3. Image` · `4. Communication` · `5. Direction`.
Kind: **synthesis** (reads all 4 pillars).

### Strategic Brief (`brief`) — designer-internal, 1 page (file 7)
`designer (100%)`. Kind: **synthesis** (reads all 4 pillars). The Brand Concept is later scored
against exactly these 5 fields.

| Field | id | Note |
|---|---|---|
| Central Pattern | `brief.central-pattern` | idea repeating across pillars unforced; reducible to one word |
| Main Tension | `brief.main-tension` | biggest identity↔image gap; classify: ability / visibility / coherence |
| Constraint | `brief.constraint` | limits the principle + beliefs + operational reality impose on design |
| Emotional Territory | `brief.emotional-territory` | sensation the brand should provoke (personality × tone × image) |
| What the Concept Must Resolve | `brief.must-resolve` | the specific question only this brand answers |

---

## PHASE 2 — PLANNING — *designer proposes, client approves*

### Brand Concept (`concept`) — internal filter (file 8)
`designer→client`. Kind: **synthesis** (reads `brief`). Properties any concept must have:
**specific · directional · traceable**. Fields:

```
concept.statement          # the concept phrase
concept.description        # 1 short paragraph
concept.distillation       # the 6-step trace: pattern → produces → client feels → why → analogies → natural phrase
concept.eval-against-brief # the 5 brief fields, each addressed (fail >1 ⇒ reject)
concept.filter-test        # applied to real design/copy/web/logo decisions: [{decision, verdict}]
concept.recognition-test   # founder / team / public each recognize it?
```

### Reusable Insights (`insights`) (file 8)
`designer`. Kind: **synthesis** (byproducts captured during concept distillation; filtered by the
concept). Each: `{title, description, possibleUses[]}`.

### Manifesto (`manifesto`) (file 9)
`designer writes / client validates`. Kind: **synthesis** (reads `concept`, `communication.personality`,
`communication.tone`, `insights`). The client must feel represented; if not, iterate.

### Brand Audit (`audit`) (file 10)
`designer` (client supplies existing assets). Kind: **synthesis**. Per-asset evaluation vs the
concept → action `keep / adjust / create`. **Conditionally skipped** if greenfield (no prior assets);
then the Design Plan sources everything as "create". Each: `{asset, currentState, evalVsConcept, action}`.

### Design Plan (`design-plan`) — the scope handoff (file 11)
`collab`. Kind: **synthesis** (reads `audit`). Priority auto-derives: `create → High`, `adjust → Medium/Low`,
`keep → excluded`.

```
design-plan.scope-levels        # which of: Definition / Identity Systems / Implementation
design-plan.verbal-identity      # [{asset, auditState, action, priority}]  naming, narrative, copy, manifesto
design-plan.visual-identity      # [{component, auditState, action, priority}]  logo → sub-brand logo → palette → type → system elements → photography → iconography → illustration
design-plan.motion-identity      # often "Future"
design-plan.sound-identity       # often "Future"
design-plan.touchpoints          # P1 must exist / P2 must transform / P3 can wait — each {point, state, action}
design-plan.deliverables         # [{deliverable, contains, phase}]
design-plan.execution-order      # ordered, dependency-chained: naming → logo/system → copy → web → channels → templates
```
Every line item shares the schema `{label, auditState, action, priority}` with
`priority ∈ {High, Medium, Low, Future, Done}`.

---

## PHASE 3 — DESIGN — *designer executes, client approves at key moments*

### Naming (`naming`) (file 12)
- `naming.constraints` (collab) · `naming.phonetic-profile` (collab — `{musts[], donts[] (first), references[] → pattern}`)
- `naming.exploration` (designer — candidate directions)
- `naming.evaluation` (designer — **eval**, see §Evaluation Frameworks)
- `naming.technical-verification` (designer — availability checklist)
- `naming.presentation` (designer presents / client chooses — 2–3 candidates)
- `naming.digital-securing` (collab — buy domain + handles immediately)

### Visual Territories (`territory`) (files 13–15)
- `territory.exploration` (designer) — build 2–3 territories. Each:
  `{summaryPhrase ("Brand as…"), argument, atmosphere, typeDirection, colorDirection, photoDirection, textureMateriality, references[]}`. 5–8 curated refs each (max 10).
- `territory.definition` (collab) — choose + argue: `{chosen, whyThis, discardedAndWhy[], resolvesBetter[4 filters], sacrificed[] (+ mitigation), gained[]}`.

### Brand System (`system`)
- `system.logo-exploration` (designer — min 3 directions)
- `system.logo-evaluation` (designer — **eval**, 14 parameters, see below)
- `system.logo-definition` (collab)
- `system.color` (designer→client — each color has a reason)
- `system.typography` (designer — families with roles, by fit not trend)
- `system.visual-elements` (designer — patterns, containers, textures, dividers)
- `system.photography` (designer→client)

### Closure (`closure`)
- `closure.approval` (collab) · `closure.application` (designer) · `closure.brand-manual` (designer)

---

## Evaluation Frameworks (scored)

### Viability Gate — `reality.evaluation-criteria` (file 2)
12 Yes/No items in 3 buckets, each with an `implication`.
- **Non-negotiable (1–4):** recurring sales · differentiator in one sentence · budget assigned · clear decision-maker.
  Rule: a `No` on #1 or #3 ⇒ **do not proceed** (block). `No` on #2 ⇒ business-model issue. `No` on #4 ⇒ iteration risk.
- **Warning signs (5–8):** asks for "just a logo" · willingness to engage · knows their audience · changed designer >2×.
- **Positive signals (9–12):** image "got too small" · tried alone and failed · in growth/transition · curious about the process.

Model per item: `{criterion, type: non-negotiable|warning|positive, answer: yes|no, implication}`.
Engine: any non-negotiable failure flags the project (block downstream or mark "at risk").

### Three Core Tests (reused by concept / naming / territory)
1. **Filter Test** — apply to real decisions; must feel natural and be directional (not binary).
2. **Evaluation Against the Brief** — cross vs the 5 Strategic Brief fields; fail >1 ⇒ reject.
3. **Recognition Test** — founder / team / public recognize it as theirs.

### Naming Evaluation — adds 3 to the core 3 (file 12)
4. **Bilingual Phonetic Test** — say aloud per language; a negative-sounding homonym ⇒ discard.
5. **Real Connotations** — table `{audience, association, type: positive|neutral|negative}` across
   "knows the reference / knows the language / knows nothing".
6. **Technical Verification & Availability** — checklist: same-sector homonym · `.com` domain ·
   social handles (incl. prefix/dot/suffix variants) · descriptor needed? · legal registry homonyms ·
   adjacent-category collisions. Critical fail ⇒ discard before attachment; minor ⇒ case-by-case.

### Logo Evaluation — 14 parameters, 2 levels (file 16)
Founding principle: *the logo identifies, it does not communicate; the name differentiates; the
brand is the whole system.* Each parameter result ∈ **Pass / Pass with caveat / Fail**.
Both levels must pass (strategic pass + technical fail ⇒ reject, and vice versa).

- **Strategic (4):** Against Concept · Against Name · Against Personality · Against Visual Territory.
- **Technical (10):** Style · Typological Classification (logotype/isotype/imagotype/isologo) ·
  Semantic Compatibility · Legibility · Graphic Quality · Distinctiveness · Versatility ·
  Timelessness · Reproducibility · Memorability.

Model per parameter: `{parameter, level: strategic|technical, questions[], result: pass|caveat|fail, notes}`.

### Visual Territory — 4 filters (files 13–15)
`Against Concept` · `Against Name` (feels like arriving at the name) · `Against Personality`
(no trait contradicted) · `Against the Gap` (process visible alongside result). Each = Pass / Fail.

---

## Dependencies (output → input edges)

```
Reality ───────────────► Identity
Identity ──────────────► Image.survey-design
Image.results ─────────► Image.pattern-analysis ─► Image.contrast
Identity + Image ──────► Image.contrast               (the central gap exercise)
Image.contrast ────────► Communication                (survey orders Values)
Reality.brand-architecture(inventory) ─► Communication.brand-architecture(definition)
4 pillars ─────────────► Strategic Document
4 pillars ─────────────► Strategic Brief
Strategic Brief ───────► Brand Concept                (from the brief, NOT the full document)
Concept distillation ──► Reusable Insights
Concept + personality + tone + insights ─► Manifesto
Concept (filter) + client assets ─► Brand Audit
Brand Audit ───────────► Design Plan                  (create→High, adjust→Medium, keep→excluded)
Concept ───────────────► Naming
Concept + Name + Brief ─► Visual Territories           (incl. "Against the Name" filter)
Chosen Territory ──────► Brand System / Logo
```

**Foreign-key-worthy linkages:** the 5 Brief fields are referenced by Concept eval, Naming eval, and
Territory filters; Personality + Tone feed Brief emotional territory, Manifesto, and every Territory
and Logo filter; the Viability Gate is a project-level gate; Brand Audit is conditionally skipped
when greenfield.

**Template vs example:** file 13 is the blank territory template; file 14 is a worked, iterative
example of the same schema (useful as seeded example data, not as a form).
