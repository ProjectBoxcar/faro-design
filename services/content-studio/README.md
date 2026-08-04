# Content Studio (Python service)

Modular backend for FARO Content Studio. Scaffold only — model API keys are **not** wired.

## Modules

| Module | Role |
|--------|------|
| `brand_profile` | Ingest locked profile from FARO project export **or** infer starter profile from footage |
| `asset_processing` | Normalize uploads, extract frames, metadata (placeholders) |
| `generation` | Captions, hashtags, platform crops (placeholders) |
| `engine` | Shared orchestration — both Workflow A and B call `generate_month` |

## Run (local)

```bash
cd services/content-studio
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m content_studio.cli --help
```

FARO’s Next.js API routes call into this service later (HTTP or subprocess). Today the TypeScript façade mirrors the same contracts with in-process placeholders so the UI can be developed without Python running.

## Contracts

See `content_studio/models.py` and `app/lib/content-studio/types.ts` — keep them aligned when changing fields.
