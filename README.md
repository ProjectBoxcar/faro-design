# Faro Design — Brand App

A guided brand-building workspace: strategy → logo → design system → **Content Studio**, built on the Finisterra methodology.

## Run the app (one way)

| How | Command |
|-----|---------|
| **Double-click** | `start.bat` |
| **PowerShell** | `.\start.ps1` |
| **Manual** | `cd app` → `npm run dev` |

Both launchers install deps if needed, migrate the DB if needed, start **Open Design** (port 7456) and the app on **http://localhost:3100**, and open the browser.

Open Design only (if graphics fail):

```powershell
.\start-open-design.ps1
# or: cd app; npm run od:ensure
```

### Network access

Once running:

- Local: http://localhost:3100  
- Same Wi‑Fi: http://YOUR_LAN_IP:3100  
- Tailscale: http://YOUR_TAILSCALE_IP:3100  

Keys go in `app/.env.local` (gitignored): strategy Anthropic key, logo OpenAI/Gemini, etc. See `docs/11-ai-lanes.md`.

### If `.bat` / `.ps1` open in an editor

Right-click → Open with → Command Prompt / PowerShell → “Always use this app”.

## Layout

```
Faro Design/
├── start.bat / start.ps1   # only entrypoints you need
├── start-open-design.ps1   # optional OD daemon only
├── app/                    # Next.js product
├── docs/                   # Product design docs
├── services/               # Python Content Studio scaffold
├── reference/              # Finisterra sources (read-only)
├── external/               # third-party clones (gitignored)
├── local/                  # machine-only media & pilot scripts (gitignored)
└── CLAUDE.md               # agent rules
```

## Docs

| File | What |
|------|------|
| `docs/01`–`09` | Scope, methodology, flows, data, AI, stack, roadmap |
| `docs/10-asset-studio.md` | Logo Workshop + assets |
| `docs/11-ai-lanes.md` | Strategy / logo / Open Design engines |
| `docs/12-content-studio.md` | Content Studio |

## Status

Active product branch work (e.g. Content Studio) lands via PRs to `main`. Local media under `local/` is never committed.
