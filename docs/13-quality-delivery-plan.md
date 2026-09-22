# Quality delivery plan

**Date:** 2026-09-22  
**App:** Faro Design (`app/`, Next.js on port 3100)  
**Goal:** Align the running app with the fixes already proven by the July and August audits and the 22 September code read, without reopening journey rules that are correct.

This wave is executed by 100 agents with exclusive file ownership. Agents do not share files. A second agent may touch a file only after the first has finished.

## Keep

Do not change these. They are the product.

- Localhost with no `APP_PASSWORD` stays open. Any other host without that password stays blocked.
- Approving strategy does not publish a share link. Publishing stays on Brand Handover.
- A brand name must be confirmed before the first logos, even when the working title looks real.
- Handover and Content Studio open only after the full visual package is selected (identity, landing page, deck, and channel templates).
- Design jobs keep landed assets and can resume. Do not copy that machinery into a hasty logo rewrite in this wave.

## This wave

| # | Change | Owner files |
|---|--------|-------------|
| 1 | Add `app/app/error.tsx`, `app/app/global-error.tsx`, and `app/app/projects/[id]/error.tsx` so a render crash does not blank the app | those three files only |
| 2 | Set SQLite `busy_timeout` to 5000 in `lib/db/index.ts` | that file only |
| 3 | Intake expansion failure returns HTTP 502, still with `projectId` and `answersSaved: true` | `app/api/intake/route.ts` only |
| 4 | `DesignStudio` defaults `daemonUp` to false | `components/DesignStudio.tsx` only |
| 5 | Name workshop and the six Express stage labels go through `lib/i18n/catalog.ts` (English and Spanish) | `NameWorkshop.tsx`, `ExpressJourney.tsx`, `catalog.ts` |
| 6 | Remove the unused portrait map (`FARO_FACE`, `faceForMood`). Fix mojibake in `faro-persona.ts`. Keep the SVG robot | `lib/faro-persona.ts`, `lib/__tests__/faro-persona.test.ts` |
| 7 | Backup also copies `data/content-studio` when present. Add `scripts/restore.ts` and `npm run backup:restore` | `scripts/backup.ts`, `scripts/restore.ts`, `package.json` scripts only |
| 8 | Reject an Anthropic key pasted into the OpenAI / logo field. Do not add a database column | `components/SettingsForm.tsx`, `app/api/settings/route.ts` |
| 9 | Move the proxy decision into pure `decideAccess` and test all five outcomes | `lib/auth.ts`, `proxy.ts`, `lib/__tests__/auth.test.ts` |

Each change is implemented once, then checked by a second agent who edits the same files only if the spec was missed. Eighty read-only checks then look for regressions. One agent runs `npm test` and may fix test breakage in the files above. One agent writes the result.

## Next wave (not this 100)

Do these only after `npm test` is green and the logo workshop still completes a generate.

1. **Resumable logo jobs.** Today `POST /api/studio` waits inside the request (`maxDuration` 300) and the run id lives in memory. Mirror design jobs: return quickly, poll, resume, never delete landed candidates. This needs the studio route, `lib/studio.ts`, and `StudioLogoWorkspace.tsx` together. It is one owner, not a swarm.
2. **Two stored graphics keys.** A logo OpenAI key and a design-helper Anthropic key cannot both live in `settings.design_api_key`. Add a column and a migration, then two settings fields. Until then, a Claude key pasted in the OpenAI box is rejected so it cannot wipe the logo key. The strategy Claude key still unlocks the design helper.
3. **Route-level tests** for approve-does-not-publish, once that behavior is extracted without importing the database into the unit runner.

## Done when

- `npm test` in `app/` passes.
- The nine rows above match the code.
- The Keep list still matches the code.
- Logo generate, approve, and discard behave as they do today.
