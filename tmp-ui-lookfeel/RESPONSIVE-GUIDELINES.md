# Faro Design — Responsive & Density Guidelines

**Date:** 2026-09-16  
**Scope:** Diagnosis + implementer contract after the 13.5px / 0.185 / width-cap pass  
**Repo:** `F:\Faro Design\app`  
**Live:** `http://127.0.0.1:3100` (hub / home / design / call checked)  
**Rule:** Tokens + shells first. Do not rem-whack individual pages.

Evidence sources: `app/globals.css`, `app/brand/tokens.css`, `app/projects/[id]/layout.tsx`, `ProjectSidebar`, `DesignStudio`, `HomeChrome`, `FaroCallShell`, prior look-feel shots in this folder.

---

## 1. Diagnosis — what the last pass broke

The density pass stacked **four compressions** at once. Alone, any one was reasonable; together they broke proportion vs screen size.

| Lever | Before (approx) | Current (broken) | Effective result |
|-------|-----------------|------------------|------------------|
| `html` rem | ~14–15px | **13.5px** | All rem lengths shrink |
| `--spacing` | ~0.20 | **0.185rem** | Every `p-*` / `w-*` / `gap-*` shrinks again |
| Type `@theme` | milder | **xs 0.68 / sm 0.78 / base 0.85** | Compound with rem → micro type |
| Shells | 7xl / w-52 / pipeline ~240 | **6xl→7xl / w-48 / 200px** | Narrow work column + squeezed rails |

### Effective pixels today (13.5 × 0.185)

| Token / class | Computed | Readable / usable target |
|---------------|----------|---------------------------|
| `text-xs` | **~9.2px** | ≥ 11px |
| `text-sm` (also `body`) | **~10.5px** | ≥ 13px body |
| `text-base` | **~11.5px** | ≥ 14px |
| `p-4` | **~10px** | ~14–16px |
| `w-48` sidebar | **~120px** | ~180–200px journey rail |
| `max-w-6xl` shell | **~972px** | ~1200–1350px product |
| `max-w-7xl` @ xl | **~1080px** | same |
| Pipeline `200px` | 200px fixed | 220–260px |
| Home / tool CTA `py-1.5` | ~7.5px pad → **~25px** control | **36–40px** min height |

### What feels wrong on screen

1. **Legibility failure** — Body is `font-size: var(--text-sm)` ≈ 10.5px. Kickers at 10px / `text-[9px]`–`text-[11px]` fall below “tool UI” and into “fine print.”
2. **Touch / hit targets** — Primary CTAs with `py-1.5` + compressed type land ~24–28px tall (home Start / Continue patterns). Call is healthier (`min-h-11` Continue) — the rest of the app is not.
3. **Aspect / proportion paradox** — On a 1440–1920 desktop, `max-w-6xl` (~972px) leaves **huge cream side gutters**, while the *inner* column is cramped: ~120px sidebar + dense type + Design Studio’s 200px pipeline fighting the canvas. Feels both empty *and* squeezed.
4. **Fixed-px vs scaled-rem mismatch** — Pipeline `200px`, coach faces `32–36`, `.faro-kicker { 10px }` do not move with rem; spacing utilities do. Rails and type no longer share one rhythm.
5. **Surfaces** — Home still reads marketing-theatre (OK). Hub / Design Studio feel undersized and busy. Faro Call remains the hierarchy north star (branded dark stage, Continue-first, adequate controls).

**Root cause (one line):** Global scale was cut below readable floors *and* product max-widths were capped, so the app got smaller type in a narrower column floating in unused viewport.

---

## 2. Viewport bands

Use these as layout contracts. Prefer CSS / Tailwind breakpoints already in play (`sm` 640, `lg` 1024, `xl` 1280, `2xl` 1536).

### Mobile — `< 640px`

- Single column; **no** sticky project sidebar (`ProjectSidebar` stays `hidden lg:flex`).
- Mobile journey chrome (`ProjectMobileBar`) = **one** band. Do not stack Stages chips + progress + coach intro above the fold on design/express/studio/call.
- Content pad: `px-4 py-4` (≥ ~14px effective after token fix).
- Tap targets: **min 44×44px** for primary actions and icon buttons.
- Type: body ≥ 13px; avoid `text-[9px]` / `text-[10px]` for anything actionable.
- Illustrations: banner/hero `max-h` ~10–12rem; step cards may keep photo but not dominate first screen.
- Faro Call: bottom sheet agenda OK; Continue full-width `min-h-11`.

### Tablet — `640–1024px`

- Still no full journey sidebar until `lg`, unless a collapsible rail is added later.
- Shell: full width with `px-5`; optional `max-w-5xl` only for long-form reading (express review), not for Design Studio.
- Pipeline: stack above canvas (`grid` single column → `lg:grid-cols-[…]`).
- Coach: minimized by default on design / express / logo / handover.

### Desktop — `1024–1440px`

- Project shell: sidebar + main inside **one** centered max-width (see §4).
- Sidebar ~180–200px; content pad `px-5 py-5` / `lg:px-6`.
- Design Studio: pipeline + canvas side-by-side; canvas is the hero (pipeline ≤ ~260px).
- Product H1 ≤ `text-xl` / `lg:text-2xl` (tool), not marketing `text-4xl+`.

### Wide — `> 1440px` (incl. 2xl)

- **Widen the product shell** — do not leave 400px+ empty cream per side with a ~1000px column.
- Target content+sidebar band ≈ **1200–1350px**, up to ~1440px on very wide; beyond that, centered gutters are fine.
- Do **not** stretch marketing home to `2xl:max-w-[110rem]` again on working pages.
- Line length for prose / ledes: keep **45–75ch**; widen grids and canvases, not paragraph measure.

---

## 3. SSOT tokens — rem, spacing, type floors

**Single source of truth:** `app/globals.css` `@theme inline` + `html { font-size }`.  
Brand color/radius SSOT stays `app/brand/tokens.css` (`--radius-sm/md/lg/pill`).

### Recommended root

| Token | Current (broken) | **Recommended now** | Notes |
|-------|------------------|---------------------|-------|
| `html` font-size | 13.5px / 15px churn | **14px (main baseline)** | Do not stack rem cuts with spacing/type cuts |
| `--spacing` | 0.185–0.22 churn | **0.2rem (main)** | Known-good; change alone if needed |
| `body` font-size | `text-sm` (~11.2px) | **`text-base` (~12.25px @ 14)** | One notch up for legibility; keep rem at 14 |

### Type scale floors (rem × 15px)

Never ship below the **floor px** column. Marketing home may use 3xl–4xl; product journey stops at ~2xl/3xl.

| Step | Recommended rem | ≈ px @ 15 | Floor px | Role |
|------|-----------------|-----------|----------|------|
| `--text-xs` | **0.75rem** | 11.25 | **11** | Meta, chips, timestamps |
| `--text-sm` | **0.875rem** | 13.1 | **12.5** | Secondary / dense UI |
| `--text-base` | **0.9375rem** | 14.1 | **13.5** | **Body default** |
| `--text-lg` | **1.0625rem** | 15.9 | 15 | Emphasized UI / serif subheads |
| `--text-xl` | **1.1875rem** | 17.8 | 17 | Product H1 (sm screens) |
| `--text-2xl` | **1.375rem** | 20.6 | 20 | Product H1 desktop |
| `--text-3xl` | **1.625rem** | 24.4 | 24 | Rare product / home section |
| `--text-4xl` | **1.875rem** | 28.1 | — | Marketing only |
| `--text-5xl`+ | keep milder than defaults | — | — | Home hero via `clamp`, not journey |

Line-heights: keep slightly tight (1.15–1.45) but do not crush xs/sm below ~1.1rem / 1.35rem.

### Hard bans

- No `text-[9px]` for UI copy (coach badges → `text-[10px]` minimum, prefer `text-xs`).
- `.faro-kicker` → **11px** or `0.6875rem`, not `10px`.
- Do not set rem to 13–14 **and** compress `--text-*` **and** cut `--spacing` in the same pass.

---

## 4. Layout shells

### Product project shell (`app/projects/[id]/layout.tsx`)

**One** centered wrapper for sidebar + main. Children must **not** nest another `max-w-6xl` / `max-w-7xl`.

| Band | Class / width |
|------|----------------|
| Default desktop | `max-w-7xl` (≈ 1200px @ 15px rem) |
| Wide | `2xl:max-w-[90rem]` (≈ 1350px) |
| Avoid | `max-w-6xl` alone on xl/2xl (≈ 1080 / leftover void) |

```tsx
// Intent (implementer)
<div className="mx-auto flex min-h-screen w-full max-w-7xl 2xl:max-w-[90rem]">
```

### Sidebar

| | Current | Recommended |
|--|---------|-------------|
| Width | `w-48` (~120px today) | **`w-56`** (~185px @ 15/0.22) or `w-[12.5rem]` (~188px rem-stable) |
| Behavior | `sticky` `h-screen` `hidden lg:flex` | keep |
| Labels | truncate + Next/Done chips | needs ≥180px or chips wrap/overflow |

### Content padding (hub, design, workshops)

| | Current | Recommended |
|--|---------|-------------|
| Page | `px-3 py-4 lg:px-5 lg:py-5` | **`px-4 py-5 lg:px-6 lg:py-6`** |

### Home / marketing (`HomeChrome`)

- Shell `max-w-6xl` @ 15px ≈ 1080px is OK for marketing; may match product `max-w-7xl` for alignment.
- Hero art: keep `aspect-[16/9]` with **`max-h-[14rem] sm:max-h-[16rem]`** (not uncapped).
- Step cards: photo `aspect-[16/10]` OK; copy block must remain scannable above the fold on laptop.

### When NOT to nest `max-w-*`

- Inside project layout main (already capped).
- Design Studio root (uses full main column).
- Faro Call stage (viewport theatre — full bleed intentional).
- Only nest for **prose measure** (`max-w-2xl` / `max-w-3xl` on ledes) or **form columns** (`max-w-md`), never a second page shell.

### Faro Call

- Full-viewport shell; footer controls `max-w-3xl sm:max-w-4xl` centered — keep.
- Do not force Call into the cream `max-w-7xl` project band.

---

## 5. Component aspect rules

### Cards

- Padding: `p-4` / `p-5` (not `p-2` micro, not `p-7` marketing).
- Radius: `rounded-[var(--radius-lg)]` for cards; **primary CTAs** `rounded-[var(--radius-md)]`; pills for chips only.
- Hub stage cards: prefer more stages above the fold over large illustration blocks.

### Banners / illustrations

| Context | Max treatment |
|---------|----------------|
| `StagePageBanner` art | `size="xs"`; **`lg:h-11 lg:w-11`** or hide `<lg` — never md/lg photo on tool pages |
| Home hero | `max-h` 14–16rem; 16/9 |
| Home step / empty projects | aspect locked; image not taller than copy block on desktop |
| Handover / share package | editorial may stay larger (exception) |
| Design generation window | avoid 60–70vh splash; keep focused, ~content-sized |

### CTAs / controls

| | Rule |
|--|------|
| Min height desktop | **36–40px** (`min-h-9` / `min-h-10`) |
| Min height mobile primary | **44px** (`min-h-11`) |
| Padding target | `px-4 py-2` → `px-5 py-2.5` (not `py-1.5` as primary) |
| Radius | `var(--radius-md)` primary; Call may keep pill for meeting chrome |

### Coach / persona

| State | Face size |
|-------|-----------|
| Minimized / quiet routes | **32px** |
| Default dock | **36–40px** (not >44) |
| Expanded header | ≤ 40px |
| Chat width | `min(100vw-1.25rem, 18rem)` — keep modest |

Quiet by default on design / express / logo / handover / call (call already hides journey coach).

### Design Studio pipeline

| | Current | Recommended |
|--|---------|-------------|
| Grid | `lg:grid-cols-[200px_minmax(0,1fr)]` | **`lg:grid-cols-[240px_minmax(0,1fr)]`** |
| Max | — | **≤ 260px** (skill ceiling ~280; prefer 240) |
| Preview | `min-h-[28vh] lg:min-h-[36vh]` | keep ≤ **40–48vh** |
| Status | one region | do not restack banners |

### Loaders

- In-journey waits: FaroLoader beacon **`lg`** (not `hero`).
- Hero beacon: first-run / empty marketing moments only.

---

## 6. Legibility checklist

Use before merging any further “density” tweak:

- [ ] Body text ≥ **13px** effective; default body uses `text-base` after token fix
- [ ] Secondary UI (`text-sm`) ≥ **12.5px**; meta (`text-xs`) ≥ **11px**
- [ ] No actionable `text-[9px]`; kickers ≥ 11px
- [ ] Contrast: ink on paper / muted on paper meets AA for body; muted not used for primary labels
- [ ] Lede / paragraph measure **45–75ch** (`max-w-2xl` ~OK for ledes)
- [ ] Primary tap targets **≥ 44px** on mobile; **≥ 36px** desktop
- [ ] Sidebar labels readable without hover-only truncation on desktop ≥ 1280px
- [ ] Hard-refresh at **100% browser zoom**; note Windows Display Scale 125–150% (owner env) — do not “fix” DPI by cutting rem further
- [ ] Cream side gutters on 1440+ feel intentional, not like a lost column (`2xl` shell widen)

---

## 7. Anti-patterns

1. **Rem whack-a-mole** — Cutting `html { font-size }` without raising `--text-*` floors and without checking `--spacing` (or the reverse). One SSOT pass only.
2. **Triple compression** — rem ↓ + spacing ↓ + type scale ↓ + width caps ↓ in one PR. Pick density *or* width shrink, then verify.
3. **Double `max-w` nesting** — layout shell + page `max-w-7xl` + inner `max-w-6xl`. One shell; inner only for prose/forms.
4. **Illustration dominating viewport** — hub/home heroes and stage banners stealing first glance from Next up / primary CTA / canvas.
5. **Marketing type on tool pages** — `text-4xl`/`5xl` journey titles, `lg:px-12 py-12` product pads.
6. **Fixed px chrome vs utility squeeze** — pipeline/coach/kicker in raw px while padding uses crushed `--spacing` (rhythm break).
7. **Matching Call control size by shrinking Call** — Call is the reference; bring cream-app CTAs *up* toward Call, don’t pull Call down.
8. **Empty Express / wait voids** — huge cream with tiny type and a hero beacon; use progress list + `lg` loader instead.

---

## 8. Recommended FIX VALUES (apply now)

Implementer: change these concrete values. Do not drive-by restyle unrelated components in the same PR unless required by the token bump.

### A. `app/globals.css`

```css
@theme inline {
  /* …colors/fonts unchanged… */

  --spacing: 0.22rem;

  --text-xs: 0.75rem;
  --text-xs--line-height: 1.1rem;
  --text-sm: 0.875rem;
  --text-sm--line-height: 1.35rem;
  --text-base: 0.9375rem;
  --text-base--line-height: 1.45rem;
  --text-lg: 1.0625rem;
  --text-lg--line-height: 1.5rem;
  --text-xl: 1.1875rem;
  --text-xl--line-height: 1.5rem;
  --text-2xl: 1.375rem;
  --text-2xl--line-height: 1.35rem;
  --text-3xl: 1.625rem;
  --text-3xl--line-height: 1.25rem;
  --text-4xl: 1.875rem;
  --text-4xl--line-height: 1.15;
  --text-5xl: 2.25rem;
  --text-5xl--line-height: 1.1;
  --text-6xl: 2.75rem;
  --text-6xl--line-height: 1.05;
  --text-7xl: 3.25rem;
  --text-7xl--line-height: 1;
}

html {
  font-size: 15px;
  /* antialias / text-rendering unchanged */
}

body {
  /* … */
  font-size: var(--text-base); /* was var(--text-sm) */
  line-height: 1.45;
}

.faro-kicker {
  font-size: 11px; /* was 10px */
  /* weight / tracking / color unchanged */
}
```

### B. Project layout shell

**File:** `app/projects/[id]/layout.tsx`

```tsx
<div className="mx-auto flex min-h-screen w-full max-w-7xl 2xl:max-w-[90rem]">
```

(Replace `max-w-6xl xl:max-w-7xl`.)

### C. Project sidebar

**File:** `components/ProjectSidebar.tsx`

```tsx
className="… w-56 …"  // was w-48
```

### D. Design Studio pipeline

**File:** `components/DesignStudio.tsx`

```tsx
<div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">  // was 200px
```

Page pad on design (and hub for consistency):

```tsx
<div className="w-full px-4 py-5 lg:px-6 lg:py-6">  // was px-3 py-4 lg:px-5 lg:py-5
```

### E. Home chrome (light align)

**File:** `components/HomeChrome.tsx`

- Primary CTAs: `px-4 py-2` or `min-h-9` (replace `py-1.5` on Start / secondary).
- Hero image: `max-h-[14rem] sm:max-h-[16rem]` (bump from 11/14 if it feels cropped after rem restore — do not remove cap).
- Shell may stay `max-w-6xl` or move to `max-w-7xl` to align with product.

### F. Expected effective pixels after fix (15 × 0.22)

| Class | ≈ px |
|-------|------|
| `text-xs` / `sm` / `base` | 11.3 / 13.1 / 14.1 |
| `p-4` | 13.2 |
| `w-56` sidebar | **184.8** |
| `max-w-7xl` | **1200** |
| `2xl:max-w-[90rem]` | **1350** |
| Pipeline | **240** fixed |

### G. Verify (re-audit)

- [ ] Hub / design / home / call at 100% zoom on ~1440 and ~1920 widths  
- [ ] Body ≥ 13px; sidebar labels not clipped into uselessness  
- [ ] Side gutters reduced on wide; canvas still calm  
- [ ] CTA heights ≥ 36px desktop; Call Continue still ≥ 44px mobile  
- [ ] No second page-level `max-w-7xl` inside project main  
- [ ] Windows 125% scale: still tool-sized, not “postage stamp in a field of cream”

---

## Product principles (keep)

1. **Tokens first, then chrome** — never rem-only.
2. **Marketing may breathe; product must tool.**
3. **One shell, prose measure inside.**
4. **Call is control-size north star** for primary actions.
5. **Guide present, not loud** — coach ≤ 40px face; quiet on dense routes.
6. **Same Faro, different modes** — cream workshop vs dark Call theatre.

---

*Guidelines only — no product CSS was edited in this pass. Implement against §8.*
