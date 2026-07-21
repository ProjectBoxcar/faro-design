# Brand App — Quick Start

Run the app locally and access it from your own devices (or a client preview) via Tailscale.

## Run locally

```bash
cd "F:\Faro Design\app"
npm install
npm run db:migrate
npm run dev
```

Open `http://localhost:3100` in your browser.

## First-time setup

1. Open **Settings** from the home screen.
2. Paste your **Anthropic API key** (or switch to **OpenAI-compatible** for OpenAI / OpenRouter / Groq / Ollama).
3. Create a project and start with **Quick Start** or the **Planning** phase.

You can also set keys via environment variables in `.env.local`:

- Anthropic: `ANTHROPIC_API_KEY`
- OpenAI-compatible: `OPENAI_API_KEY` and optionally `OPENAI_BASE_URL`

## Access via Tailscale

1. Install Tailscale on this machine and any device you want to use: <https://tailscale.com/download>
2. Sign in with the same account on each device.
3. On this machine, find your Tailscale IP:
   - Windows: `tailscale ip -4` in PowerShell or check the Tailscale tray menu.
4. From another device, open `http://<TAILSCALE_IP>:3100`.

The device must be on the same Tailscale network. You can also use Tailscale Funnel to share a public URL without opening ports: `tailscale funnel 3000`.

## Build for production

```bash
npm run build
npm start
```

`npm start` runs the Next.js production server on port 3100.

## Notes

- Project data lives in `app/data/brand.db` (SQLite). It is gitignored and stays on this machine.
- API keys are stored in the same local database and are never committed to git.
- `npm run db:migrate` is the safe way to apply schema changes; never use `npm run db:push` after initial setup.

## Troubleshooting

### "404 This page could not be found" after answering the intake questions

The Next.js dev server can keep a stale route map if it was running while new pages were added (for example, the `/projects/[id]/review/[group]` review screens). The fix is to restart the dev server:

```bash
cd "F:\Faro Design\app"
npm run dev
```

After the restart, the intake → project hub → review → handoff flow works as expected.
