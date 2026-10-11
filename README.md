# AR Digital Passport for Physical Assets

Scan a physical asset's image marker with a phone → see its **digital passport**
(name, ID, location, status, maintenance history) → report issues → admins manage
everything from a dashboard. One REST API + PostgreSQL backend serves both the
AR client and the dashboard.

## Problem statement
Labs, classrooms and offices own equipment (projectors, printers, lab gear) whose
service history and fault reports live in chats and notebooks. This project puts a
machine-readable marker on each asset and makes its record retrievable in seconds
via AR, with a real database and admin workflow behind it.

## Features
- **AR scanner** (`frontend/ar`): MindAR image tracking, marker → asset passport panel, maintenance view, issue reporting, camera/API failure states.
- **REST API** (`backend`): assets, marker lookup, maintenance, issues, locations — documented in `docs/API.md`.
- **Admin dashboard** (`frontend/dashboard`): stats cards, searchable/filterable asset table, detail dialog (maintenance + issues + marker), create/edit/delete with validation, issue status workflow, responsive + accessible.
- **PostgreSQL schema + seed** (`database/`): normalized, indexed, FK-safe, demo-ready (7 assets including Lab PC 26, 4 locations, 8 maintenance rows, 4 issues, 6 markers).

## Architecture
```
Physical marker → MindAR (frontend/ar) ─┐
                                         ├→ Express REST (/api) → PostgreSQL (or memory fallback)
Admin dashboard (frontend/dashboard) ───┘
```
- AR never talks to the DB directly; dashboard never invents endpoints — both consume `docs/API.md`.
- Backend serves memory mode (zero-config) or Postgres via `DATABASE_URL`.

## Technology stack
AR: A-Frame + MindAR + HTML/CSS/JS · Backend: Node.js + Express + `pg` + dotenv + CORS ·
DB: PostgreSQL (Supabase-compatible) · Dashboard: plain HTML/CSS/JS · Tests: Jest + Supertest + `tests/integration-check.js` · CI: GitHub Actions.

## Repository structure
```
├── frontend/ar/            # Dev 1 — WebAR scanner (do not restructure)
├── frontend/dashboard/     # Dev 3 — admin dashboard
├── backend/                # Dev 2 — Express API (src/, tests/, scripts/)
├── database/               # Dev 2 — schema.sql, seed.sql
├── docs/                   # API.md, AR_DEVELOPER.md, BACKEND.md, FRONTEND.md, TEST_PLAN.md, DEPLOYMENT.md
├── tests/                  # Dev 4 — integration-check.js
├── .env.example            # all env vars (never commit .env)
├── .github/workflows/ci.yml
└── README.md
```

## Setup (fresh clone — everything live, real Postgres, no mocks)
Prerequisite: Docker Desktop running (for the bundled Postgres), or a Supabase project.
```bash
git clone https://github.com/nimitajestin/AR-Digital-Passport-for-Physical-Assets.git
cd AR-Digital-Passport-for-Physical-Assets
cp .env.example .env            # DATABASE_URL already points at the Docker Postgres
# terminal 1 — real database + API:
docker compose up -d db
docker compose --profile tools run --rm db-seed   # schema + seed (idempotent)
cd backend && npm install && npm start            # http://localhost:3000 (/health)
# terminal 2 — frontends (any static server from repo root):
python -m http.server 8000
# dashboard: http://localhost:8000/frontend/dashboard/?api=http://localhost:3000/api
# AR:        http://localhost:8000/frontend/ar/
```
Without `DATABASE_URL` the server exits immediately with setup instructions —
it never serves invented data. `USE_MEMORY_DB=true` is a test-only hatch.

## Environment variables
See `.env.example`. Summary: `PORT` (3000) · `DATABASE_URL` (**required** — Docker Postgres default included) ·
`USE_MEMORY_DB` (`false`; `true` = ephemeral test-only store) · `NODE_ENV` · `CORS_ORIGIN` ·
`VITE_API_BASE_URL` (dashboard default `http://localhost:3000/api`).

## Database setup
```bash
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/seed.sql
# or: cd backend && npm run db:init && npm run db:seed
```
Seed is idempotent; demo works immediately (no manual entry).

## Frontend setup
Static — no install/build. Serve repo root (`python -m http.server 8000`).
Dashboard API base: `?api=` → localStorage → default. AR base: `window.ENV.API_BASE_URL` or `/api` default.

## AR setup
Place the compiled `.mind` target in `frontend/ar/assets/targets/` (placeholder referenced by default; see `docs/AR_DEVELOPER.md`). Printable SVG markers: `frontend/ar/assets/markers/` (`projector/purifier/printer-marker.svg`, …). HTTPS required for camera on devices.

## Backend setup
`cd backend && npm install && npm start`. `GET /health` → `{ ok: true }`.

## Testing
```bash
cd backend && npm test                       # 15 Jest/Supertest tests (in-memory)
node tests/integration-check.js              # needs backend on :3000 (14 live checks)
node tests/integration-check.js --base https://<backend>
```
Manual matrix: `docs/TEST_PLAN.md` (A–N + failure injection).

## Deployment
Full steps: `docs/DEPLOYMENT.md`. Short version: Supabase (DB + seed) → Render/Railway (backend, `DATABASE_URL`, `CORS_ORIGIN`) → Vercel/Netlify (static frontend, `?api=https://<backend>/api`). CI runs backend tests + frontend presence checks on every push.

## Demo (3–5 min, reliable)
1. Open dashboard → show counts (7 assets including Lab PC 26, open issues).
2. Open AR scanner → pick **printer-marker** (target button) → passport for `AST-003`.
3. Open maintenance history → 2 records.
4. Report issue ("Belt slips on Y axis…") → `201`.
5. Dashboard → issue appears → set `in_progress` → re-fetch asset/issues shows update.
Printable markers + seed mean nothing is typed into the DB live.

## Team contributions
- **Dev 1 Aarohi (AR/WebAR)** — `frontend/ar`, `docs/AR_DEVELOPER.md`.
- **Dev 2 Nimita (Backend + DB)** — `backend/`, `database/`, `docs/API.md`, `docs/BACKEND.md`, `.env.example`, `docker-compose.yml`.
- **Dev 3 Archisha (Dashboard)** — `frontend/dashboard`, `docs/FRONTEND.md`.
- **Dev 4 Rudra (Integration/QA/Deploy)** — `tests/integration-check.js`, `docs/TEST_PLAN.md`, `docs/DEPLOYMENT.md`, README, CI, `backend/scripts/*`, end-to-end verification.

## Known limitations
- No auth (open API; `admin_users` reserved, nothing seeded) · no pagination UI (≤100 rows) ·
  LIKE search (no FTS) · `imageUrl/modelUrl` are URL strings (no uploads) ·
  real `.mind` target + device camera needed for true marker tracking.

## Verification (this repo state)
- `npm test`: 15/15 pass (test-only memory store) · `integration-check.js`: 14/14 pass against a live backend ·
- server refuses to start without `DATABASE_URL` (verified) · AR/dashboard verified live against backend ·
  no secrets committed · API contract unchanged (`docs/API.md`).
