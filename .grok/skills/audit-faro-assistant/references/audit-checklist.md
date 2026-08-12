# Faro assistant — quick checklist

## Anchors expected in UI

- `faro-start-brand`, `faro-home-projects`, `faro-lang`
- `faro-start-name`, `faro-start-next`, `faro-start-finish`
- `faro-express-approve`, `faro-express-apply`
- `faro-hub-continue`, `faro-journey-current`
- `faro-design-handover`
- `faro-handover-pack`, `faro-handover-share`
- `faro-content-generate`

## Knowledge IDs (`explain.k.*`)

startBrand, projectsList, language, nextStep, finishDraft, nameField, nameConfirm,
approveStrategy, applyEdits, rewriteAi, editCard, logoGate, designBuild, handover,
productPack, sharePackage, contentMonth, reviewPhotos, contentStudio, settings, apiKeys,
continueJourney, journeyCurrent, viability, fullMap, pathHome, pathStart, pathSettings,
pathExpress, pathName, pathLogo, pathDesign, pathHandover, pathContent, pathReview,
newProject, delete, back, preview

## Anti-patterns (fail knowledge grade)

- “Something nice on the next page”
- “This is a button / link” with no journey meaning
- Claiming Approve strategy publishes full package
- Suggesting OpenAI for Design Studio mockups
- Content before logo/design as primary path
- Engineer jargon in owner-facing strings
