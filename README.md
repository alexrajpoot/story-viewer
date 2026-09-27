# StoryPeek — frontend + backend on Netlify (educational)

A static frontend (`public/`) connected to a serverless backend (`netlify/functions/`).
Netlify hosts both on one domain, so the page simply calls `/api/...` — no CORS setup needed.

```
public/                 ← frontend (HTML/CSS/JS)
  index.html  style.css  app.js  demo/*.svg
netlify/functions/      ← backend endpoints (each file = one API route)
  story.mjs     GET /api/story?username=NAME   or   ?url=<story link>
  download.mjs  GET /api/download?mediaUrl=... (allowlisted hosts only)
  health.mjs    GET /api/health
netlify/lib/            ← shared backend code (provider adapter, validation, config)
netlify.toml            ← tells Netlify where the site and functions are
dev-server.mjs          ← optional local preview without the Netlify CLI
```

No `npm install` needed — there are no dependencies.

## Run locally

```bash
node dev-server.mjs          # → http://localhost:8888
```
Search any username; in demo mode you get 4 sample stories.

## Deploy to Netlify

> Netlify's drag-and-drop ("Netlify Drop") only uploads static files — it **won't deploy the functions**.
> Use one of the two options below.

### Option A — GitHub (easiest, auto-redeploys on every push)
1. Create a new GitHub repo and upload this folder's contents (so `netlify.toml` is at the repo root).
2. In Netlify: **Add new site → Import an existing project → GitHub** → pick the repo.
3. Build settings are read from `netlify.toml` automatically (publish: `public`, functions: `netlify/functions`). Leave the build command empty. Click **Deploy**.
4. Open `https://<your-site>.netlify.app` and search a username.

### Option B — Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify deploy          # draft preview URL
netlify deploy --prod   # live
```

## Settings (Netlify → Site configuration → Environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `STORY_MODE` | `demo` | `demo` = sample stories, works with no API. `provider` = call your real API. |
| `PROVIDER_BASE_URL` | – | Your provider's base URL. Backend calls `GET {base}/story?username=...&storyId=...` |
| `PROVIDER_API_KEY` | – | Kept server-side; never sent to the browser. |
| `PROVIDER_API_KEY_HEADER` | `x-api-key` | Header name the provider expects. |
| `MEDIA_HOST_ALLOWLIST` | – | Comma-separated hostnames `/api/download` may fetch from, e.g. `cdn.provider.com`. |
| `MAX_DOWNLOAD_BYTES` | 52428800 | Max download size (50 MB). |
| `UPSTREAM_TIMEOUT_MS` | 15000 | Provider timeout. |

After changing variables, trigger a redeploy (**Deploys → Trigger deploy**).

If your provider's JSON looks different, edit only `normalizeResponse()` in `netlify/lib/provider.js`.

## How the connection works

1. `public/app.js` → `fetch("/api/story?username=natgeo")`
2. Netlify routes `/api/story` to `netlify/functions/story.mjs` (see `export const config = { path: ... }`)
3. The function validates input, calls the provider (or demo data) and returns JSON
4. The page renders cards; each **Download** link points at `/api/download?mediaUrl=...`

To host the backend somewhere else instead (Render, Railway…), set `API_BASE` at the top of `public/app.js` to that URL.

## Responsible use
Only use a data provider whose terms allow your use, show public content only, and respect people's privacy and copyright. Not affiliated with Instagram/Meta.
