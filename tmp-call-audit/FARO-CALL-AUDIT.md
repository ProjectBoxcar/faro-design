# Faro Call — Owner Audit Report

**Branch:** `feature/interactive-guide-character` (`40cc571`)  
**Date:** 2026-09-02  
**Scope:** New Faro Call feature only (`/projects/[id]/call`)  
**Agents:** UX · Engineering · AI/Q&A · A11y/i18n · Live smoke  
**Git:** nothing pushed for this audit

---

## Executive summary

Faro Call **works as a meeting-style walkthrough** of real project assets. Live smoke **PASSED** (Continue, Ask, mute, agenda jump, Leave, mobile layout, no double Faro dock).

The core metaphor and asset pipeline are solid. The biggest problems for you to improve next are:

1. **Mobile: hard to find “Join call”** (sidebar is desktop-only)
2. **Spanish locale is broken in practice** (English scripts + English FAQ + Spanish TTS voice)
3. **Ask can desync from the shared stage** / race if you jump agenda mid-answer
4. **No-key / bad AI responses pretend to answer** with a generic call tip
5. **SVG on the stage is not re-sanitized** (XSS risk if bad SVG ever lands in DB)
6. **Stage CTAs eject you from the call** with no “back to call”

---

## Live smoke verdict

| Check | Result |
|-------|--------|
| Shell loads (live · agenda · stage · Continue) | **Pass** |
| Continue advances captions / progress | **Pass** |
| Ask + hint “Do we have a logo?” | **Pass** |
| Mute / unmute | **Pass** |
| Agenda jump | **Pass** |
| Leave → project hub | **Pass** |
| JourneyCoach hidden on `/call` | **Pass** |
| Mobile 390×844 usable | **Pass** |
| TTS audio | **Not verified** (headless) |
| Hydration warning (`captions only`) | **Fail / flaky** (console; UI still works) |

Screenshots: `F:\Faro Design\tmp-call-audit\*.png` (local only — do not commit)

---

## What works

- **Meeting UI** — dark full-screen call, agenda pills, Sharing stage, Faro PiP/chip, caption + Continue dock, Ask slide-over / bottom sheet
- **Asset-grounded beats** — real logo SVG, identity/landing/deck HTML, channel checklist, honest “not ready” CTAs (`beats.ts` + `load-call-context.ts`)
- **Captions-first voice** — TTS is progressive enhancement; mute / no speech → captions continue
- **Instant FAQ** for logo / what’s left / package-style asks (`call-answers.ts`) — offline-friendly for the two hint chips
- **Call-mode coach prompt** — dedicated spoken rules; journey context block is solid when API key works
- **No double Faro** — JourneyCoach suppressed on `/call`
- **Desktop entry** — Sidebar + UpNext “Join call with Faro”
- **Tests** — 6/6 `faro-call-*` unit tests pass
- **Reduced motion** honored for stage-enter animation
- **iframe sandbox** for HTML previews (`allow-scripts`, no same-origin)

---

## What doesn’t (by severity)

### P0 — fix first

| # | Problem | Why it hurts | Where |
|---|---------|--------------|--------|
| 1 | **No mobile Join call entry** | Sidebar hidden on small screens; only hub UpNext — easy to miss | `ProjectSidebar`, `ProjectMobileBar` |
| 2 | **ES locale mismatch** | UI + beat scripts + FAQ English; TTS may use `es-ES` voice on English text | Shell, `beats.ts`, `call-answers.ts` |
| 3 | **No `aria-live` on captions** | Screen readers don’t hear Faro when muted / captions-only | `FaroCallShell` |
| 4 | **SVG via `dangerouslySetInnerHTML` without re-sanitize** | Stored XSS if bad SVG in DB | `FaroCallStage` |
| 5 | **No-key / bad JSON AI → generic tip as “answer”** | Owner thinks Faro answered the question | `journey-coach-ai` + Shell |

### P1 — high value next

| # | Problem | Notes |
|---|---------|--------|
| 6 | **Mid-journey skip of welcome** | `startBeatIndex` jumps past “ask me in chat” orientation |
| 7 | **Stage CTAs leave the call** | No return / resume beat |
| 8 | **Q&A doesn’t jump the shared stage** | “Do we have a logo?” answers in chat but screen may stay elsewhere |
| 9 | **Ask vs agenda race** | Jump during in-flight Ask can apply late answer to wrong beat |
| 10 | **No Previous beat** | Only Continue + agenda jump |
| 11 | **Chat not a real dialog** | No Escape, focus trap, or focus restore |
| 12 | **Leave icon-only on mobile lacks `aria-label`** | |
| 13 | **Hydration mismatch** on `captions only` | SSR `!canSpeak()` vs client |
| 14 | **Layout under call still focusable** | Project chrome under `z-[80]` not `inert` |

### P2 — polish

- Replay while muted is a silent no-op  
- Network error caption not spoken (`playLine` skipped)  
- Hint chips fill input but don’t one-tap send  
- Captions `line-clamp-3` with no expand  
- Close beat highlights Handover wrongly  
- `shareHref` loaded but unused  
- Content-ready beat has no calendar preview  
- Shell strings not in i18n catalog  
- Meta labels low contrast (`white/30–45`)  
- Chrome TTS long-utterance pause not handled  
- Large HTML payloads shipped in RSC props  

---

## Cross-agent agreement (P0 themes)

Agreed by **≥2 agents**:

1. **i18n / locale honesty** (UX + A11y + AI)  
2. **Ask failure / no-key honesty** (Eng + AI)  
3. **Mobile discovery** (UX)  
4. **Caption accessibility / live region** (A11y + UX)  
5. **Sanitize SVG on Call stage** (Eng)  
6. **Q&A ↔ stage sync + ask races** (UX + Eng + AI)

---

## Recommended improvement order

1. Mobile “Join call” in `ProjectMobileBar` / Stages sheet  
2. Honest no-key + soft-fail call answers (never play generic tip as the answer)  
3. Sanitize SVG on render in `FaroCallStage`; reconsider `allow-scripts` for Call  
4. `aria-live` on caption dock + Leave `aria-label`  
5. Abort/ignore stale Ask when beat jumps; optionally jump stage on FAQ hits  
6. Locale plan: localize beats **or** force EN speech until scripts exist; skip EN FAQ on `es`  
7. Soft welcome when skipping orientation; Previous beat; keep-call CTAs (`target=_blank` or resume)  
8. Chat dialog a11y (Escape, trap, restore focus)  
9. Fix captions-only hydration (`useEffect` probe)  
10. Tests: call scene path, missing assets, ask/jump race, sanitizer  

---

## Keep as-is (don’t “fix” away)

- Present-only parallel mode (not a journey replacement)  
- Captions as source of truth; TTS optional  
- Agenda from real journey statuses  
- Reusing `/api/journey-coach` with `mode: "call"`  
- Meeting chrome / PiP / slide-over Ask layout  
- Instant FAQ for the promoted hint questions  

---

## Agent scorecards (short)

| Agent | Overall take |
|-------|----------------|
| **UX** | Metaphor strong; mobile entry + CTA eject + Q&A/stage desync are the product risks |
| **Engineering** | Clean layering; XSS/HTML sandbox + ask races + hydration are the eng risks |
| **AI/Q&A** | FAQ + call prompt good when key works; no-key/parse fallback is the trust bug |
| **A11y/i18n** | Keyboard basics OK; SR captions + ES parity largely missing |
| **Live smoke** | **PASS** with hydration caveat; TTS unverified headless |

---

## How to use this

Pick items from **Recommended improvement order** and say which to implement.  
Nothing from this audit was committed or pushed.
