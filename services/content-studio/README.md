# Content Studio (Python service) — deferred

**Status: experimental scaffold only.** Production Content Studio runs in the **Next.js TypeScript** path:

- `app/lib/content-studio/*`
- `app/app/api/content-studio/*`

Do not wire FARO UI or Settings to this Python package unless an explicit migration is planned. Model API keys are **not** connected here.

## Why it exists

Early modular sketch (`brand_profile`, `asset_processing`, `generation`, `engine`) for a possible future sidecar. Contracts in `content_studio/models.py` should stay loosely aligned with `app/lib/content-studio/types.ts` if revived.

## Run (local experiment only)

```bash
cd services/content-studio
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m content_studio.cli --help
```

## Live product path

Use the TypeScript Content Studio (vision media cards, month plan, Open Design posts, owner controls, export).
