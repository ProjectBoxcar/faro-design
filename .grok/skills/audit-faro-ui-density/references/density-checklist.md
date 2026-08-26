# UI density pass/fail checklist

Use during `/audit-faro-ui-density`. Mark each item Pass / Fail / N/A with a path.

## Global

- [ ] `html` rem ≤ 15px (14.5–15 preferred after type/chrome pass)
- [ ] Brand tokens expose spacing/control heights used by chrome (or document gap)
- [ ] No accidental second rem bump via zoom / large system scaling noted for owner

## Type

- [ ] Product page H1 ≤ `text-2xl` / `lg:text-3xl` (no journey `text-4xl`/`5xl`)
- [ ] Section/review chapter overlays not pitch-deck `4xl`/`5xl` (or removed)
- [ ] Express title not `lg:text-4xl+`
- [ ] Guide/lede body ≤ `text-sm` / `text-base` (not `text-lg`/`2xl` walls)

## Spacing & containers

- [ ] Product shells avoid `lg:px-12` + `py-10+` as default
- [ ] No `2xl:max-w-[104rem]` / `110rem` on working pages (or justified)
- [ ] Card padding mostly `p-4`/`p-5`, not `p-6`/`p-7` everywhere

## Illustrations & loaders

- [ ] StagePageBanner art ≤ ~`h-16`–`h-20` or hidden `<lg`
- [ ] Hero beacon reserved for first-run; in-journey waits use `sm`/`lg`
- [ ] Home step cards not full-bleed oversized if bleeding into product feel

## Design Studio (highest drop-off)

- [ ] Journey sidebar ≤ `w-60` / `w-64`
- [ ] Pipeline column ≤ ~260–280px
- [ ] Preview `min-h` ≤ ~40–48vh
- [ ] Generation window not 60–70vh splash
- [ ] One status region (not stacked banners fighting sticky strip)

## Coach & mobile

- [ ] Faro face default ≤ ~40–44px
- [ ] Chat panel max-width modest (~18–20rem)
- [ ] Mobile Stages bar not three tall bands before content
- [ ] Coach does not cover sticky Approve / Generate

## Controls

- [ ] Primary CTA padding ~`px-4 py-2` / `px-5 py-2.5` (not default `px-6 py-3`)
- [ ] Inputs not `text-lg` + `py-3` by default on tool forms
- [ ] Consistent radius (brand `radius-md` vs pill) noted

## Owner verify

- [ ] Hard-refresh at **100%** browser zoom
- [ ] Windows display scaling noted if >100%
