# Frontend Dashboard — architecture, setup, deployment (Dev 3)

Plain HTML/CSS/JS (no framework — matches the repo's existing AR stack).
No build step, no bundler, works from any static host.

## Architecture
```
frontend/dashboard/
  index.html      # layout: stats cards, asset table + filters, issues, 3 dialogs
  css/dashboard.css
  js/config.js    # API base resolution (?api= > localStorage > same-origin /api > local default)
  js/api.js       # fetch wrapper over docs/API.md (no mocks; ~12s timeout)
  js/app.js       # search/filter/table, CRUD dialogs, issue status updates
```

## Setup

The backend requires a real PostgreSQL `DATABASE_URL` (or the test-only
`USE_MEMORY_DB=true` hatch). It does **not** start in a silent memory mode.

Preferred (backend also serves the dashboard at `/dashboard/`):

```bash
# from repo root — Docker Desktop must be running
cp .env.example .env
docker compose up -d db
docker compose --profile tools run --rm db-seed   # once; do not re-run blindly
cd backend && npm install && npm start            # http://localhost:3000
```

Then open:

```text
http://localhost:3000/dashboard/
```

Same-origin `/api` works. If you serve the repo from another static port:

```bash
python -m http.server 8000
# http://localhost:8000/frontend/dashboard/?api=http://localhost:3000/api
```

The API URL box in the header persists to `localStorage(ar_passport_api_base)`.

## Environment variables
| var | used by | default |
|---|---|---|
| `VITE_API_BASE_URL` | optional deploy-time string replace (there is no Vite build) | `http://localhost:3000/api` |

No production URL is hard-coded. Runtime resolution (`js/config.js`):
`?api=` → saved localStorage → same-origin `/api` on a non-localhost host →
`http://localhost:3000/api` for local laptop splits.

When the Express app serves `/dashboard/`, the default localhost API URL is
correct. On a phone hotspot (`http://<lan-ip>:3000/dashboard/`) same-origin
`/api` is used.

## API dependency (all from docs/API.md — never invented)
`GET /api/assets` · `GET /api/assets/:id` · `POST /api/assets` ·
`PATCH /api/assets/:id` · `DELETE /api/assets/:id` ·
`GET /api/assets/:id/maintenance` · `GET /api/issues` ·
`PATCH /api/issues/:id/status` · `GET /api/locations`.

Response formats are consumed exactly as documented. If the backend returns
`{ error: { code, message } }` the dashboard shows `message` (never raw stacks).
Fetches abort after about 12 seconds with a readable timeout.

Live updates: the dashboard re-fetches assets, issues, and **unfiltered**
summary cards silently every 10 seconds (skipped while the tab is hidden) and
on every tab-focus, so an issue reported from the AR scanner appears without a
manual refresh. The assets panel shows "live, updated HH:MM:SS". Every render
comes from the backend — no mock data.

Summary cards always reflect the full catalog (total / operational /
maintenance+degraded / open issues), not the current table or issue filter.

## Features → requirements
Summary cards · asset table (ID/name/category/location/status/dates/actions) ·
search (id/name/category/location, debounced) · filters (status/category/location) ·
detail dialog (full info + markerId + maintenance + issues) · create/edit forms
with required-field + date-order validation · issue list with inline status
select (`open/in_progress/resolved/rejected`) · responsive (desktop/tablet/mobile) ·
semantic HTML, labelled controls, keyboard-accessible `<dialog>`s ·
loading/empty/error states · delete confirmation dialog.

## Build command
None (static). Smoke check: start the backend, open `/dashboard/`.

## Deployment
Any static host (Vercel/Netlify/GitHub Pages): publish `frontend/dashboard/`
(or repo root) and point it at the backend with `?api=` or the saved API base.
The dashboard itself needs no camera. Exact host steps belong in `docs/DEPLOYMENT.md`
(Dev 4).

## Known limitations
- No auth — anyone with the URL can edit (matches backend v1).
- No pagination UI (fetches up to 100 rows per list).
- No offline support; API failures show a friendly banner, not raw errors.
- `VITE_API_BASE_URL` is a deploy-time replace only; runtime override is `?api=`.
