# Coding Tracker (`apps/coding`)

Part of the Master Dashboard monorepo. Shows coding time synced from WakaTime,
stored in TiDB table `coding_logs` (via `apps/api`).

## Run locally
Login is shared with the hub (`apps/web`), so run all three and open the hub.
From the repo root, one command starts api (:4000) + web (:5173, proxies /coding → :5174) + coding (:5174):
```bash
npm run dev
```
Open http://localhost:5173 → log in → click **Coding Tracker** (http://localhost:5173/coding/).

## WakaTime OAuth app (one-time)
1. Create an app at https://wakatime.com/apps
2. Redirect URI: `http://localhost:4000/api/coding/wakatime/callback` (add the production API URL too)
3. Put `WAKATIME_CLIENT_ID`, `WAKATIME_CLIENT_SECRET`, `WAKATIME_REDIRECT_URI` in the root `.env`
   (and in the API's Vercel env vars).

## Flow
Hub → `/coding/` → not logged in? → `/login?next=/coding/` → back here →
not connected? → modal "Connect WakaTime" → WakaTime OAuth → `/coding/?wakatime=connected` →
sync last 14 days + import full history (WakaTime data dump, polled) → dashboard.

## Shared code
- `@md/ui` → `packages/ui` (Heatmap, …)
- `@md/auth-client` → `packages/auth-client` (AuthProvider, token storage, fetch wrapper)

## Deploy (Vercel)
New Vercel project, Root Directory = `apps/coding`. The app is built under the
`/coding/` base path so the hub can mount it on the same domain with a rewrite:
`/coding/:path*` → `https://<coding-project>.vercel.app/coding/:path*`.
Same domain = same localStorage = one login for every app.

## API (`apps/api/src/modules/coding`)
| Method | Path | Returns |
|---|---|---|
| GET  | `/api/coding/logs?from&to` | `[{ date, seconds, source }]` |
| GET  | `/api/coding/wakatime/connect-url` | `{ url }` |
| GET  | `/api/coding/wakatime/callback` | redirect → `/coding/?wakatime=connected\|denied\|error\|already_linked` |
| GET  | `/api/coding/wakatime/status` | `{ connected, username, lastSyncedAt }` |
| POST | `/api/coding/wakatime/sync` | last 14 days → `{ days, saved, lastSyncedAt }` |
| POST | `/api/coding/wakatime/import-history` | `{ status: 'processing', percent }` or `{ status: 'done', imported }` |
| DELETE | `/api/coding/wakatime` | disconnect |
