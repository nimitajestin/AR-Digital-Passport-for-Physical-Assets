# Test Plan — integration & QA (Dev 4)

## Scope
End-to-end acceptance for `AR → API → DB → Dashboard` per the target user flow.
Backend contract: `docs/API.md`. Manual device steps + automated checks.

## Automated
| level | command | what it proves |
|---|---|---|
| backend contract | `cd backend && npm test` (15 tests, test-only in-memory DB) | asset CRUD, marker lookup, maintenance, issue lifecycle, 400/404/409 |
| integration | real Postgres backend (`docker compose up -d db` + seed + `npm start`), then `node tests/integration-check.js [--base URL]` | live B–L checklist below (14 assertions) |

## Checklist (map to acceptance flow)
- [ ] **A. Fresh setup** — `git clone`, `cd backend && npm install`, `cp .env.example .env`, `python -m http.server 8000` for frontend. No secrets committed (`git status` clean of `.env`).
- [ ] **B. Backend startup** — `npm start` → `GET /health` → `{ ok: true }`.
- [ ] **C. Database init** — `docker compose up -d db` + `docker compose --profile tools run --rm db-seed`
  (or `psql $DATABASE_URL -f database/schema.sql -f database/seed.sql` for Supabase).
  Verify counts via `/health` (expect 7 assets).
- [ ] **D. Frontend startup** — `http://localhost:8000/frontend/dashboard/` loads, stats render, no console errors.
- [ ] **E. AR startup** — `http://localhost:8000/frontend/ar/` loads over HTTPS on device; camera permission prompt appears; denial shows friendly error (no stack).
- [ ] **F. Marker recognition** — select each of `projector/purifier/printer-marker`; passport panel shows matching `AST-00x`. Invalid marker → `MARKER_NOT_FOUND` banner.
- [ ] **G. Asset retrieval** — `GET /api/assets/AST-001` returns bare object with `location: "CL-6"`.
- [ ] **H. Maintenance retrieval** — `GET /api/assets/AST-001/maintenance` returns non-empty array.
- [ ] **I. Issue creation** — from AR/dashboard: `POST /api/issues` → `201`, `status: open`.
- [ ] **J. Dashboard visibility** — new issue appears in dashboard issue list (filter by asset).
- [ ] **K. Status update** — `PATCH /api/issues/:id/status` → `in_progress`; dashboard + re-fetch reflect it.
- [ ] **L. Error handling** — backend-down banner (stop server, reload dashboard); `AST-999` → 404 envelope; short description → 400; camera-denied → friendly message.
- [ ] **M. Mobile browser** — Android Chrome: dashboard table scrolls, dialogs usable, AR scene ≥ 500px, touch targets ≥ 40px.
- [ ] **N. Production deployment** — frontend + backend + DB URLs documented; `?api=` points at prod backend; HTTPS; camera works from prod URL.

## Intentional failure matrix
| inject | expected UI |
|---|---|
| backend stopped | dashboard keeps last data + shows load error on next poll; AR: real error banner, no invented asset |
| invalid marker | 404 toast, scan state preserved |
| nonexistent asset | 404 `ASSET_NOT_FOUND`, friendly message |
| malformed issue (<5 chars) | 400 inline form error |
| empty database | "No assets found…" empty state |
| camera denied | AR error state "camera permission…" with retry |

## Results (this integration pass)
- `npm test`: **15/15 pass** (in-memory, no Postgres needed).
- `node tests/integration-check.js` vs live memory backend: **14/14 pass** (see Dev 4 report in README/commit message).
- Manual: dashboard exercised against live backend (stats, search, filters, detail, create/edit/delete, issue status); AR page loads locally with fallback data (camera/marker-file steps require device + `.mind` artifact).
