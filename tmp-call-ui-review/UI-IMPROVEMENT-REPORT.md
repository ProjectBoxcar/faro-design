# Faro Call — UI Improvement Report

**Branch:** `feature/interactive-guide-character`  
**Date:** 2026-09-10  
**Agents:** UI design review + live visual pass (Playwright screenshots)  
**Git:** nothing pushed for this review

**Overall UI grade: B−**

Screenshots (local): `F:\Faro Design\tmp-call-ui-review\*.png`

---

## Executive summary

Faro Call already **feels like a meeting**: dark full-screen overlay, LIVE status, Sharing stage, Faro PiP, red Leave, white Continue. Captions-first voice and Ask as a slide-over/sheet are solid.

The gaps are mostly **visual composition**, not the concept:

1. **Empty stages** — text/welcome beats leave a large dark void; the eye doesn’t know where to land  
2. **Mobile footer crowding** — caption + Previous + Replay + Continue fight for space  
3. **Mute / speaking feedback is too quiet** — icon-only mute, tiny “Speaking” label  
4. **Call greens feel off-brand** — hardcoded forest dark vs Faro teal / cream / coral  
5. **Ask panel empty state is oversized** — tall drawer/sheet for two hint chips  

---

## Scorecard

| Dimension | Grade | Note |
|-----------|-------|------|
| Meeting metaphor | A− | Reads as a real walkthrough call |
| Motion / feedback | B+ | Stage enter, speaking scale, reduced-motion OK |
| Controls affordance | B | Continue clear; mute/Leave weaker |
| Ask panel | B | Hints good; empty state too tall |
| Agenda | B | Clear states; scroll + tiny meta |
| Captions & stage | B− / C+ | Captions OK; stages often sparse |
| Brand coherence | C+ | Serif helps; call skin feels separate |
| Mobile layout | C+ | Usable but cramped |
| Visual hierarchy | C+ | Void stages undercut focus |
| A11y (visual) | C+ | Labels exist; micro-type + icon-only Leave |

---

## What already works (keep)

- Full-screen call over project chrome (`inert` on sidebar/mobile bar)  
- No double Faro (JourneyCoach hidden on `/call`)  
- LIVE · Sharing · PiP · Continue / Leave metaphor  
- Agenda locked / done / active pills from real journey  
- Captions as source of truth + `aria-live`  
- Ask hint chips, Escape close, focus restore  
- Logo stage cream + navy boards (best brand moment)  
- Join entry: sidebar, mobile phone + Stages sheet, UpNext  

---

## Ranked improvements

### P0 — do soon

1. **Fill sparse stages**  
   Text/welcome/checklist beats need a real focal card (centered checklist, stronger title block, optional journey schematic). Stop large empty `#111814` voids.

2. **Mobile control bar**  
   Continue full-width primary; demote Previous/Replay (icons or overflow); keep Leave readable (not icon-only only).

3. **Mute / speaking at a glance**  
   Pressed mute fill / coral tint; stronger speaking ring or “Live · speaking” next to captions.

4. **Warm chrome to Faro tokens**  
   Derive call surfaces from brand teal/ink; use coral for LIVE/speaking accents; cream only inside shared assets.

### P1

5. Couple agenda active pill with Sharing title / progress on mobile  
6. Soft “Ask anytime” near Continue on first beat  
7. Caption meta larger (`11px` / `white/70`); Show more instead of mystery scroll  
8. True PiP safe zone (less blanket `pb-20`)  
9. Chat bubbles `text-sm`; localize “You” / “Faro”  
10. Stronger locked-agenda contrast  

### P2 / polish

- CSS vars `--call-bg`, `--call-panel`  
- Soft-welcome as tip banner (not fake spoken script)  
- HTML preview frame shadow  
- Focus-visible rings on dark buttons  
- Leave → `var(--danger)`  
- Dim/hide Continue while Ask is open (one mode)  

---

## Live pass — top themes

From screenshots (`desktop-idle`, `desktop-chat-open`, `desktop-after-continue`, `mobile-idle`, `mobile-chat`):

1. Stage underuse on early beats  
2. Caption-heavy footer docks  
3. Ask drawer/sheet hides the stage while empty  
4. Flat low-contrast meta labels  
5. Desktop PiP vs captions separation is good; mobile chip competes with stage header  

---

## Quick wins (&lt; 30 min each)

- Caption meta contrast bump  
- Leave label on more breakpoints  
- Mute pressed style  
- Localize chat role labels  
- Mobile `1 / N` progress  
- Checklist as centered card  
- Leave color → danger token  

## Bigger bets

- Call design tokens + light-in-dark asset frames  
- Stage layouts by `media.kind` (logo / html / checklist / text)  
- Unified “talk bar” (caption + Faro + Continue)  
- Optional speaking waveform / caption highlight  

---

## Principles for the next UI pass

1. **Stage first, chrome second** — every beat has a clear focal card in one glance  
2. **One primary** — Continue/End is the only solid white action  
3. **Faro in the dark, cream in the share** — brand teal chrome; paper only in assets  
4. **Captions are the script** — readable meta; deliberate expand  
5. **Same Faro, different room** — meeting metaphor without a third product skin  

---

## Suggested next step

Say which slice to implement first (e.g. **P0 stage fill + mobile dock**, or **quick wins only**). Nothing from this review was committed or pushed.
