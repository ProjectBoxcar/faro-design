# Faro Design — Full product audit

**Date:** 2026-08-20  
**Pilot (local only):** Harbor & Hive — boutique coastal apiary / specialty honey  
**Project id:** `lstP8hNcDGyVNy94H0BuS`  
**Hub:** http://localhost:3100/projects/lstP8hNcDGyVNy94H0BuS  

Lenses: stack · UI · UX · marketing · ops · branding · content.

---

## Executive summary

Faro’s **promise is clear** (strategy first, owner approves, then assets). The **six-stage journey and Express pipeline work**. The product still fails Harbor & Hive–type owners in six places:

1. Security fails open off-localhost without a password.  
2. “Approve strategy” secretly publishes a share link.  
3. Design Studio doesn’t warn when the design helper (OD) is down until generate fails.  
4. Express review uses strategist jargon without the guide blurbs.  
5. Photoreal site art + SVG robot face + leftover portrait JPGs = three Faros.  
6. Large chunks of journey chrome are still English-only when locale is ES.

Fix those before polishing photography or Content Studio.

---

## P0 — Fix now

### 1. Auth fails open without `APP_PASSWORD` (Stack / Ops)
**Where:** `app/proxy.ts` — if password unset → `NextResponse.next()` for everyone.  
**Problem:** Tailscale/Funnel without a password exposes Settings keys, projects, and media.  
**Change:** Require `APP_PASSWORD` when host ≠ localhost/127.0.0.1. Block boot or show a hard banner. Fix unlock cookie (HMAC with `AUTH_SECRET`, rate-limit `/api/unlock`). Correct QUICKSTART funnel port to **3100**.

### 2. Approve strategy = silent publish (UX / Marketing)
**Where:** `app/api/projects/[id]/express/route.ts` — `approve` calls `publishProject` + snapshot. UI CTA: “Approve strategy · continue to brand name.”  
**Problem:** Harbor owner expects unlock naming, not a client link with strategy-only brief.  
**Change:** Split **Approve & continue** (no share) vs **Share strategy brief**. Or keep auto-publish but show an immediate banner: “Strategy brief link created — not the full brand package” + copy link.

### 3. Design Studio missing OD pre-flight (UX / Ops)
**Where:** `DesignStudio.tsx` checks `apiKeyConfigured`, not daemon up. Home has `SetupReadinessBanner`; Design does not.  
**Problem:** After strategy + name + logo, identity generate fails with “daemon/helper” jargon. Highest drop-off.  
**Change:** Pass `daemonUp` into Design page. Block Generate with plain copy (“Design helper isn’t running — restart with start.bat”) + Retry. Match Express resume panel for failed jobs.

### 4. Express cards hide owner explanations (Content / UX)
**Where:** `ExpressJourney.tsx` shows methodology names (“Emotional Territory”, “Central Pattern”) without `guide.json` takeaways. Guides exist but only on full map / section pages.  
**Problem:** Harbor can’t judge “does this sound like us?”  
**Change:** Under each card title, one line from `sectionGuide` (`takeaway` / `whatItIs`). Optional owner aliases for brief titles.

### 5. Mixed EN/ES on core journey (UX / Content / Branding)
**Where:** Hard-coded English in `NameWorkshop`, Express `PIPELINE_STAGES` / Edit / Rewrite, Design sticky steps, Handover actions, sidebar Locked/Next/Done.  
**Problem:** ES locale feels broken mid-voyage.  
**Change:** Move all journey chrome into `catalog.ts` en/es.

### 6. Three Faro faces (UI / Branding)
**Where:** Photoreal `public/brand/illustrations/*`, SVG `FaroPersona.tsx`, unused `faro-persona-*.jpg` still mapped in `faro-persona.ts`.  
**Problem:** Taste looks undecided; robot reads as “AI buddy,” home reads atelier.  
**Change:** Pick **one** agent face (upgrade SVG to match brand **or** use portraits consistently). Delete or quarantine unused portrait paths so they can’t regress.

### 7. Always migrate + OD ensure timeout (Ops)
**Where:** `start.ps1` / `start.bat` migrate only if DB missing; `open-design-ensure.ts` kills child at 120s while script can retry to ~240s.  
**Change:** Always `npm run db:migrate` on start. Parent timeout ≥ child budget (`WAIT_MS * 2 + buffer`). Don’t ignore ensure stderr on failure.

---

## P1 — High leverage next

| # | Area | Finding | Change |
|---|------|---------|--------|
| 8 | UX | Handover unlocks with Design Studio (`handoverUnlocked = designUnlocked`), not when package ready | Lock rail to finals **or** detail “Opens when identity + mockups chosen” |
| 9 | UX | Faro bubble open by default, 120ms hover, docks on Approve — distracts on Express/Design | Auto-minimize on strategy/design; dwell 300–400ms; don’t cover sticky CTA |
| 10 | UX | Content Studio needs full package (logo + all design finals) | Soft unlock after logo + selected identity for owner-ops; badge “full package” for deck |
| 11 | UX | Design job resume weaker than Express in UI | Same paused/interrupted + Continue pattern |
| 12 | Stack | Logo Workshop = long sync POST, no durable job | Persist logo jobs like design jobs |
| 13 | Stack | Dual “graphics” key (prefix decides logo vs OD) | Three explicit key fields |
| 14 | Marketing | Home under-sells “strategy before logo” vs Looka | Sharper lede; step 2 = Approve strategy |
| 15 | Marketing | Share: “Prepared for the design team.” | Stakeholder framing for Harbor-style owners |
| 16 | Ops | Backup docs wrong; only `brand.db`; no restore | Fix docs; backup content-studio; add restore |
| 17 | Ops | `npm start` never ensures OD | `start:full` or document `od:ensure` |
| 18 | UI | Home = sharp `--radius-md`; tools = `rounded-full` pills | One button system in tokens |
| 19 | UI | No global `:focus-visible` | Global accent outline; stop bare `outline-none` |
| 20 | Content | Content Studio mostly hard-coded; silent design-post failures | Wire `content.*`; show “N posts need retry” |
| 21 | Content | `guide.json` still “designer creates artwork” | Faro drafts; owner approves; designer optional |
| 22 | Branding | Coach tips say Claude / OpenAI / `start.bat` | Plain “what this unlocks”; put vendor names only in Settings |

---

## P2 — Polish

- Photoreal images need a shared paper-mat grade (border + soft wash) so they sit in Faro chrome.  
- StagePageBanner photos: smaller or hide below `lg`.  
- Intake placeholders are studio-skewed — add specialty-food examples for Harbor-like brands.  
- Split or scaffold double-barreled intake Q3/Q4.  
- Suppress weak hover generics when knowledge isn’t deep.  
- Fix mojibake in `FARO_BRAND_PERSONALITY` source comments.  
- Redact old share tokens from committed pilot docs.  
- `ops:doctor` npm script (DB migrate status, OD ping, last daemon log lines).

---

## What to keep

- Six-stage SSOT (`sidebar-journey`) and Express-first strategy CTA.  
- Express + Design durable resume after server restart.  
- AI lane separation (strategy ≠ logo ≠ Open Design).  
- Deep product knowledge on anchored controls.  
- Home tokens / typography / “strategy first” spine.  
- Photoreal editorial photography set (grade it; don’t scrap it).  
- Name confirm before first logos.  
- Handover honesty when strategy was shared before design finals.

---

## Harbor & Hive journey (expected pain if unchanged)

| Stage | What happens | Pain |
|-------|----------------|------|
| Start | Working name Harbor & Hive | Fine |
| Strategy | Draft + Approve | Silent share surprise |
| Name | Confirm Harbor & Hive | EN-only workshop if UI is ES |
| Logo | Gate OK after confirm | Fine if keys set |
| Design | Identity / mockups | OD down → abandon |
| Handover | Rail open early | Export blocked until finals — confusing |
| Content | Locked until full package | Wants seasonal posts sooner |

---

## Recommended implementation order

1. Auth for non-localhost + cookie hardening  
2. Design OD pre-flight + Express-parity resume UI  
3. Approve vs Share (or clear disclosure)  
4. Express card guides + journey chrome i18n  
5. One Faro face + scrub coach jargon  
6. Always migrate + OD timeout + backup/restore  
7. Home marketing wedge + share audience copy  
8. Handover rail accuracy + softer Content unlock  
9. Split keys + logo job resume  
10. UI radius / focus / photo paper grade  

---

*Pilot data stays local. Do not commit `data/brand.db`.*
