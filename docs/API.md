# API Contract — AR Digital Passport (frozen for AR)

Base URL is configurable. Local default: `http://localhost:3000/api`.
AR reads its base from `window.ARDigitalPassportConfig.apiBaseUrl` (default `/api`).
Dashboard reads `window.DASHBOARD_CONFIG.API_BASE_URL` (default `http://localhost:3000/api`).

> **AR freeze notice (Dev 2 → Dev 1):**
> `GET /api/assets/:id` returns the **bare asset object** below, and
> `GET /api/assets/marker/:markerId` returns **`{ markerId, assetId, asset }`**.
> The AR client (`frontend/ar/js/api.js`) reads `data.assetId` from the marker
> endpoint and then calls `GET /api/assets/:id`. Do not rename `assetId`,
> do not wrap the asset response in `{ data }`, and do not rename
> camelCase fields (`imageUrl`, `modelUrl`, `lastMaintenance`, `nextMaintenance`)
> without updating `docs/API.md` and notifying the team.

All errors use:

```json
{ "error": { "code": "ASSET_NOT_FOUND", "message": "Asset AST-999 was not found" } }
```

Status codes: `200` ok · `201` created · `204` deleted · `400` invalid request ·
`404` not found · `409` conflict · `500` unexpected error.

---

## Asset object

```json
{
  "id": "AST-001",
  "name": "Projector",
  "category": "AV Equipment",
  "location": "CL-6",
  "locationId": 1,
  "locationName": "Classroom 6",
  "status": "operational",
  "description": "Classroom projector",
  "imageUrl": "",
  "modelUrl": "",
  "lastMaintenance": "2026-09-18",
  "nextMaintenance": "2026-12-18",
  "markerId": "projector-marker",
  "createdAt": "2026-10-01T00:00:00.000Z",
  "updatedAt": "2026-10-01T00:00:00.000Z"
}
```

`status` ∈ `operational | maintenance | degraded | offline | retired`.
Asset ids match `^AST-[0-9]{3,}$`. Marker ids match `^[a-z0-9][a-z0-9-]{1,62}$`.

## Endpoints

### `GET /api/assets`
Query: `?status=&category=&location=&search=&limit=&offset=` (limit 1–100, default 50).
Response `200`:
```json
{ "data": [ { "id": "AST-001", "name": "Projector" } ], "meta": { "total": 7, "limit": 50, "offset": 0 } }
```

### `GET /api/assets/:id`
Response `200`: bare asset object. `404` → `ASSET_NOT_FOUND`. `400` → `INVALID_ASSET_ID`.

### `GET /api/assets/marker/:markerId` — **AR critical**
Response `200`:
```json
{
  "markerId": "projector-marker",
  "assetId": "AST-001",
  "asset": { "id": "AST-001", "name": "Projector" }
}
```
`404` → `MARKER_NOT_FOUND`. `400` → `INVALID_MARKER_ID`.

### `GET /api/assets/:id/maintenance`
Response `200`: **bare JSON array** (AR expects an array, not `{ data }`):
```json
[
  { "id": 1, "assetId": "AST-001", "date": "2026-09-18", "type": "routine",
    "description": "Cleaned air filter.", "performedBy": "Campus Facilities", "cost": 450.00 }
]
```
`type` ∈ `routine | repair | inspection | upgrade | calibration`.

### `POST /api/assets`
Body (`location` accepts a location **code** e.g. `"CL-6"`; or pass `locationId`):
```json
{ "name": "Projector", "category": "AV Equipment", "location": "CL-6",
  "status": "operational", "description": "...", "markerId": "projector-marker",
  "lastMaintenance": "2026-09-18", "nextMaintenance": "2026-12-18" }
```
Response `201`: created asset. `400` → `INVALID_ASSET` / `INVALID_LOCATION`. `409` → `ASSET_CONFLICT` / `MARKER_CONFLICT`.

### `PATCH /api/assets/:id`
Partial body (same fields as POST). Response `200`: updated asset.

### `DELETE /api/assets/:id`
Response `204` (empty). Cascades to markers, maintenance, and issues.

### `GET /api/locations`
Response `200`: `{ "data": [ { "id": 1, "code": "CL-6", "name": "Classroom 6", "building": "Main Block", "floor": "Ground Floor" } ] }`.

### `GET /api/issues`
Query: `?assetId=&status=&limit=&offset=`. Response `200`: `{ "data": [issue], "meta": {...} }`.
Issue:
```json
{ "id": 1, "assetId": "AST-003", "description": "Nozzle clogs mid-print.",
  "status": "open", "priority": "medium", "reportedBy": "Student",
  "reportedAt": "2026-10-02T10:15:00.000Z", "resolvedAt": null }
```
`status` ∈ `open | in_progress | resolved | rejected`.

### `POST /api/issues`
Body: `{ "assetId": "AST-001", "description": "at least 5 chars", "priority": "medium", "reportedBy": "AR user" }`.
Response `201`: created issue (`status: "open"`).

### `PATCH /api/issues/:id/status`
Body: `{ "status": "in_progress" }`. Response `200`: updated issue. `400` → `INVALID_STATUS`.

### `GET /health`
`{ "ok": true, "db": "memory|postgres", "assets": 6, "time": "..." }`.

## Changelog
- `v1.0.0` (Dev 2): initial frozen contract. Marker endpoint returns both `assetId` (AR) and inline `asset` (dashboard convenience).
