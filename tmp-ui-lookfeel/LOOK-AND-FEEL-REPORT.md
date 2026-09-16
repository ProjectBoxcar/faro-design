# Faro Design — Look & Feel Review

**Branch:** `feature/interactive-guide-character`  
**Date:** 2026-09-16  
**Agents:** UI design review (code) + live screenshot pass  
**Git:** nothing pushed for this review  

**Overall grade: B**

Screenshots: `F:\Faro Design\tmp-ui-lookfeel\*.png`

---

## Executive summary

Faro’s **brand system is strong**: cream paper, teal primary, coral accent, EB Garamond display, lighthouse persona. Global density work is real (`html` ~14px, denser `@theme` spacing/type) — the leftover “big” feeling is mostly **illustration mass and nested chrome**, not base type size.

**Best surface:** Faro Call (clear hierarchy, branded dark mode, Continue-first).  
**Weakest surface:** Design Studio (stacked banners + rails + coach) and Express wait (empty cream void).  
**Biggest leak:** Marketing-scale heroes/titles still show up on **in-product** hub and studios.

---

## Scorecard

| Surface / dimension | Grade | Note |
|---------------------|-------|------|
| Visual identity | A− | Tokens coherent; teal/cream/coral + serif |
| Global density tokens | B+ | Rem/`@theme` landed; chrome/art still heavy |
| Marketing home | B | Strong theatre; step cards illustration-led |
| Project hub | A− / B−* | Structure good; live pass: banner/title still dominate |
| Express / strategy | B+ / C+* | Review OK; wait state underdesigned live |
| Name / Logo workshop | A− | Calm workshop pattern |
| Design Studio | C+ | Highest overwhelm — nested chrome |
| Handover / share | B+ | Editorial OK; art can stay larger on share |
| Faro Call | A− | North star for hierarchy + controls |
| Living coach | B | Better than a mascot; still competes |
| Sidebar / mobile chrome | B+ / B− | Sidebar `w-52` good; mobile dual bands |
| Color / type | A− | Roles clear; coral underused for primaries |
| Call vs rest of app | A− | Intentional mode; entry/exit still a jump |

\*Live screenshots were harsher on hub/express than code-only review.

---

## What feels right (keep)

- Brand tokens as SSOT (`brand/tokens.css`)
- Global density contract in `globals.css`
- Stage page pattern (`StagePageBanner` xs, tool-sized H1s on many workshops)
- Faro persona as editorial guide (not photo mascot)
- Call meeting chrome (`--call-*`) + coach hidden on `/call`
- Call’s Continue / Mute / Ask / Leave control discipline

---

## Ranked improvements

### P0 — do soon

1. **Shrink in-product illustration / banner mass** (hub, handover) so Next up + stages win first glance  
2. **Cap product title scale** — hub/studio/express tool-sized; big type for marketing home only  
3. **Flatten Design Studio chrome** — one status region; reduce rail + sticky + banner stacking; reclaim canvas  
4. **Redesign Express waiting** — progress / steps / brand loader; kill empty cream vacuum  
5. **Unify primary button radius** — prefer `radius-md` for primary actions; pills for chips only  

### P1

6. Use **coral/signal** more for primary CTAs app-wide (match Call Continue energy)  
7. **Compact coach** — smaller face; auto-minimize on Design/Express dense routes  
8. **Mobile chrome budget** — collapse stage chips into Stages sheet on deep work routes  
9. Soften Design generation window orbs / height when selecting  
10. Tighten hub card padding so more stages appear above the fold  

### P2

11. Home step cards: keep photos, don’t grow hero further; stronger primary CTA weight  
12. Bridge Call ↔ cream app (shared accent/control shapes so dark stage feels like a mode)  
13. Fewer tiny pill chips in Design Studio — group into one checklist  
14. Package viewer can stay large on share — keep that scale out of working pages  

---

## Cross-cutting themes

1. Brand ahead of layout calm  
2. Density tokens landed; chrome contracts incomplete  
3. Two button dialects (home `radius-md` vs journey pills)  
4. Guide vs workstation modes — workstation wears too much guide chrome  
5. Illustration as decoration still beats tasks on hub/home  
6. Call is the consistency north star  

---

## Quick wins vs bigger bets

**Quick wins**  
Single Design Studio status slot · CTA radius align · Express halo shrink · handover art → banner scale · coach minimized on design/express  

**Bigger bets**  
Design Studio IA (pipeline + canvas + one status strip) · mobile journey chrome redesign · illustration size rules (marketing vs product) · optional Focus mode (hide coach, collapse rails)  

---

## Principles for next pass

1. Strategy-first calm — one primary, one status, one focus  
2. Tokens first, then chrome (never rem-only)  
3. Marketing may breathe; product must tool  
4. Same Faro, different modes  
5. Guide present, not loud  
6. One shape language  

---

## Suggested next step

Say which slice to implement (e.g. **P0 Design Studio + Express wait + hub banners**, or **quick wins only**).  
Nothing from this review was committed or pushed.
