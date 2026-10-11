# Deployment (Dev 4)

## Recommended free-tier topology
| piece | service | notes |
|---|---|---|
| database | Supabase Postgres (free) | run `database/schema.sql` + `seed.sql` in SQL editor |
| backend | Render / Railway / Fly.io | `npm start --prefix backend`, env below |
| AR + dashboard | Vercel / Netlify / GitHub Pages (static) | publish repo root or `frontend/` |

## Backend env (production)
```
NODE_ENV=production
PORT=3000 (or provider-assigned $PORT)
DATABASE_URL=postgresql://... (Supabase pooler string, ssl on)
USE_MEMORY_DB=false
CORS_ORIGIN=https://<your-frontend-domain>
```
Never commit `.env`. Copy from `.env.example`.

## Deploy steps — backend (Render example)
1. Push repo, create Web Service → build `npm install --prefix backend`, start `npm start --prefix backend`.
2. Add env vars above; add Supabase `DATABASE_URL`.
3. Once: `psql "$DATABASE_URL" -f database/schema.sql` then `seed.sql` (or SQL editor).
4. Verify: `GET https://<backend>/health` → `{ ok: true, db: "postgres" }`, and `GET …/api/assets` → 6 rows.

## Deploy steps — frontend (Vercel/Netlify example)
1. Import repo; framework preset: **Other/static**; publish directory: repo root (or `frontend/`).
2. No build command. Dashboard: `https://<frontend>/frontend/dashboard/?api=https://<backend>/api`. AR: `https://<frontend>/frontend/ar/` (same-origin `/api` works if a rewrite proxies to backend; otherwise set `window.ENV.API_BASE_URL` before `config.js` or serve AR behind the same host).
3. HTTPS is **required** for camera on mobile browsers.

## Supabase notes
- Create project → Settings → Database → copy **connection string (pooler)** → set as `DATABASE_URL` (append `?sslmode=require` if needed).
- `db.js` enables `ssl: { rejectUnauthorized: false }` automatically for supabase/render/neon/railway hosts.
- RLS is not used (service/connection-string access); restrict the string to server env only.

## CI
`.github/workflows/ci.yml`: on push/PR — `npm install --prefix backend`, `npm test --prefix backend`, static presence check for `frontend/dashboard` + `frontend/ar`, `node --check tests/integration-check.js`. No secrets in CI.

## Rollback / recovery
- Backend is stateless; redeploy previous commit. Production must use Postgres
  (the server will not start without `DATABASE_URL`).
- Seed is idempotent; re-running `seed.sql` will not duplicate rows.
