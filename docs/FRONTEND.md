# Frontend Dashboard — architecture, setup, deployment (Dev 3)

Plain HTML/CSS/JS (no framework — matches the repo's existing AR stack).
No build step, no bundler, works from any static host.

## Architecture
```
frontend/dashboard/
  index.html      # layout: stats cards, asset table + filters, issues, 3 dialogs
  css/dashboard.css
  js/config.js    # API base resolution (query ?api= > localStorage > default)
  js/api.js       # fetch wrapper over docs/API.md (no mocks)
  js/app.js       # search/filter/table, CRUD dialogs, issue status updates
```

## Setup
Serve the repo root statically and open the dashboard (backend must be running):
```bash
# terminal 1 — backend (zero-config memory mode)
cd backend && npm install && npm start        # http://localhost:3000
# terminal 2 — static frontend
cd .. && python -m http.server 8000
# open http://localhost:8000/frontend/dashboard/?api=http://localhost:3000/api
```
The API URL box in the header persists to `localStorage(ar_passport_api_base)`.

## Environment variables
| var | used by | default |
|---|---|---|
| `VITE_API_BASE_URL` | deployment replacement for the default base | `http://localhost:3000/api` |

No production URL is hard-coded: `js/config.js` default is the local URL above,
overridable at runtime via `?api=` or the header input. When deploying, either
rewrite the default or link with `?api=https://<backend>/api`.

## API dependency (all from docs/API.md — never invented)
`GET /api/assets` · `GET /api/assets/:id` · `POST /api/assets` ·
`PATCH /api/assets/:id` · `DELETE /api/assets/:id` ·
`GET /api/assets/:id/maintenance` · `GET /api/issues` ·
`PATCH /api/issues/:id/status` · `GET /api/locations`.

Response formats are consumed exactly as documented. If the backend returns
`{ error: { code, message } }` the dashboard shows `message` (never raw stacks).

Live updates: the dashboard re-fetches assets + issues silently every 10 seconds
(skipped while the tab is hidden) and on every tab-focus, so an issue reported
from the AR scanner appears without a manual refresh. The header shows
"live, updated HH:MM:SS". Every render comes from the backend — no mock data.

## Features → requirements
Summary cards · asset table (ID/name/category/location/status/dates/actions) ·
search (id/name/category/location, debounced) · filters (status/category/location) ·
detail dialog (full info + markerId + maintenance + issues) · create/edit forms
with required-field + date-order validation · issue list with inline status
select (`open/in_progress/resolved/rejected`) · responsive (desktop/tablet/mobile) ·
semantic HTML, labelled controls, keyboard-accessible `<dialog>`s ·
loading/empty/error states · delete confirmation dialog.

## Build command
None (static). Optional smoke check: `python -m http.server` + open the page.

## Deployment
Any static host (Vercel/Netlify/GitHub Pages): publish `frontend/dashboard/`
(or repo root) and point it at the backend with `?api=` or the saved API base.
Requires HTTPS backend for camera-adjacent flows; dashboard itself needs no camera.

## Known limitations
- No auth — anyone with the URL can edit (matches backend v1).
- No pagination UI (fetches up to 100 rows per list).
- No offline support; API failures show a friendly banner, not raw errors.
- `VITE_API_BASE_URL` is honoured at deploy time only; runtime override is `?api=`.
