# Daily status report — template

Use one file per day: `YYYY-MM-DD.md`. Keep **Today** short and concrete. Update **Product / Stack / Achievements** only when something durable changes (new major feature, stack change, milestone).

---

## 1. Header

| Field | Value |
|-------|--------|
| **Date** | YYYY-MM-DD |
| **Author** | |
| **Product** | Faro Design |
| **Repo / branch** | `ProjectBoxcar/faro-design` · `main` |
| **Status** | On track / At risk / Blocked |

---

## 2. Product context *(stable — edit rarely)*

**What it is**  
One short paragraph: who it’s for and what outcome it produces.

**How the journey works**  
Bullet the owner path (e.g. intake → strategy → logo → design → handover).

**Current product posture**  
One line: MVP / pilot-ready / production, and the main bet this week.

---

## 3. Stack *(stable — edit when stack changes)*

| Layer | Choice |
|-------|--------|
| App | |
| UI | |
| Data | |
| AI / graphics | |
| Local run | |
| Quality | |

---

## 4. Achievements to date *(cumulative highlights — not a changelog)*

Short bullets of **shipped outcomes** that matter to leadership (not every commit). Add only when a milestone lands; remove or rewrite when superseded.

-

---

## 5. Today *(required every report — concrete only)*

Format each line as: **Done:** verb + deliverable + where it lives (or “on `main`”).

- **Done:** …
- **Done:** …

Optional, only if needed:

- **In progress:** …
- **Blocked:** … *(reason)*
- **Next:** … *(1–3 items max)*

---

## 6. Notes for leadership *(optional, 2–3 lines max)*

Risks, decisions needed, or demo pointers. Skip if nothing to say.

---

### Rules of thumb

1. **Context / stack / achievements** = background for someone who doesn’t open the repo.
2. **Today** = what changed since yesterday; scannable in under a minute.
3. Prefer outcomes (“owners can download X”) over internals (“refactored Y”).
4. Name commits or PRs only if useful for traceability.
5. No padding: if a section has nothing new, keep the stable text and only rewrite **Today**.
