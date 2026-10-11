# Backend — architecture, setup, testing, deployment (Dev 2)

## Architecture
```
backend/src/
  server.js   # listen() entrypoint
  app.js      # Express app factory (routes + error handler)
  config.js   # dotenv env (PORT, DATABASE_URL, USE_MEMORY_DB, CORS_ORIGIN)
  db.js       # data-access layer: Postgres (pg) OR in-memory fallback
  seedData.js # canonical demo dataset (mirrors database/seed.sql)
  utils.js    # validation regexes, DTO mappers, error envelope
  routes.js   # request handlers (validation + store calls)
backend/tests/api.test.js  # Jest + Supertest contract tests
```

`db.js` exposes one `store()` surface with two implementations:
- **Postgres** (`pg` Pool) — the only store the running server uses. `src/server.js`
  refuses to start without `DATABASE_URL` (fail-fast, no silent fallback).
- **Memory** — test-only (`NODE_ENV=test` or explicit `USE_MEMORY_DB=true`),
  seeded identically so `npm test` needs no database. Ephemeral; never demo/prod.

Route registration order matters: `/assets/marker/:markerId` is registered
**before** `/assets/:id` so `marker` is never captured as an asset id.

## Database schema
See `database/schema.sql`. Tables:

| table | purpose | keys |
|---|---|---|
| `locations` | building/room master | PK `id`, UNIQUE `code`, index via FK |
| `assets` | passport per physical asset | PK `id` (`AST-nnn`), FK `location_id`, CHECK `status`/`dates`, indexes on `status, category, location_id` |
| `asset_markers` | marker → asset (1:1) | PK `marker_id`, UNIQUE `asset_id`, FK cascade |
| `maintenance_records` | service history | PK `id`, FK `asset_id` cascade, indexes on `asset_id, maintenance_date` |
| `issues` | user reports | PK `id`, FK `asset_id` cascade, CHECK `status/priority/desc>=5`, indexes on `asset_id, status` |
| `admin_users` | optional future auth | PK `id`, UNIQUE `username` |

Relationships: `Location 1—N Assets 1—1 Marker`, `Asset 1—N Maintenance`, `Asset 1—N Issues`. Deletes cascade from asset → markers/maintenance/issues; locations are `RESTRICT` (cannot delete a room that still has assets).

## Environment variables
| var | default | notes |
|---|---|---|
| `PORT` | `3000` | server port |
| `DATABASE_URL` | _(required)_ | Postgres/Supabase connection string |
| `USE_MEMORY_DB` | `false` | `true` = ephemeral test-only store (never demo/prod) |
| `CORS_ORIGIN` | `*` | comma-separated allowlist in production |
| `NODE_ENV` | `development` | `production` hides stack traces |

## Setup
```bash
cd backend
npm install
cp ../.env.example ../.env   # DATABASE_URL already points at the Docker Postgres
# from repo root: start real Postgres + seed once
docker compose up -d db
docker compose --profile tools run --rm db-seed
npm start                     # fails fast if DATABASE_URL is unreachable
```

## Database init + seed (Postgres)
```bash
# from repo root, with DATABASE_URL exported or in .env
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/seed.sql
# helper (runs schema via pg driver):
cd backend && npm run db:init
```
Seed provides 7 assets, 4 locations, 6 markers, 8 maintenance rows, 4 issues.
Locations, assets, and markers upsert (`ON CONFLICT`). **Re-running `database/seed.sql`
can duplicate `maintenance_records` and `issues`** — those inserts have no unique
key. Seed once on a clean database.

## Testing
```bash
cd backend
npm test   # Jest + Supertest, in-memory DB, no Postgres needed
```
Covers: asset creation/retrieval, marker lookup, maintenance retrieval, issue creation/status update, invalid asset, invalid input, nonexistent marker.

## Deployment
- **Render/Railway/Fly**: set `DATABASE_URL` (Supabase/Neon/managed Postgres), `NODE_ENV=production`, `CORS_ORIGIN=https://<frontend>`. Start command `npm start --prefix backend`. Run `schema.sql` once against the managed DB.
- **Supabase**: create project → copy connection string → run `schema.sql` + `seed.sql` in SQL editor.
- Health check path: `GET /health`.

## Known limitations
- No authentication yet (`admin_users` table reserved; all endpoints open). No credentials are seeded.
- No pagination on `GET .../maintenance` (history sets are small).
- Full-text search is `LIKE`-based (no trigram index activation by default).
- Image/model uploads not handled — `imageUrl`/`modelUrl` are plain URL strings.
