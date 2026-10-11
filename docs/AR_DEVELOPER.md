# AR Developer Notes

## Project Structure

- `frontend/ar/` — AR / WebAR scanner (Dev 1)
- `backend/` — REST API (Dev 2); also serves the AR page at `/ar/`
- `database/` — schema and seed SQL
- `docs/` — implementation notes for developers

## Dev 1 Responsibility

Developer 1 is responsible for the AR/WebAR mobile foundation, including:

- AR page layout and user experience
- A-Frame + MindAR setup
- marker target configuration (`targetDefinitions` in `js/config.js`)
- UI states for loading, scanning, and error handling
- live REST lookups: marker detect → `GET /api/assets/marker/:markerId` → `GET /api/assets/:id` → passport panel

The three marker buttons remain a fallback when the camera cannot detect a printed image.

## AR Technology Stack

- A-Frame for 3D / augmented scene rendering
- MindAR for image-based tracking
- HTML, CSS, and JavaScript for the UI and browser logic

## How the AR Page Works

Physical Asset → Image Marker → MindAR Target (`#target-0` … `#target-2`) → `targetIndex` → `markerId` → REST API → Asset passport panel

MindAR fires `targetFound` / `targetLost` on those entities. The page does **not** auto-load an asset when the tracker becomes ready. Losing the current target clears the panel and shows “Scan an asset”.

The compiled marker file is expected at `frontend/ar/assets/targets/targets.mind`. If a `HEAD` of that path fails, the scan banner shows the missing-file message (not only `console.warn`).

## Where the MindAR Target File Goes

Compile your marker images into ONE file named exactly:

```text
frontend/ar/assets/targets/targets.mind
```

`*.mind` is **git-ignored**. Each machine or phone demo keeps its own compiled file — do not commit `targets.mind`.

## How to Create Markers for Your Assets (step by step)

MindAR does not scan raw JPG/PNG files — images must first be compiled into
the `.mind` format with MindAR's official **Image Targets Compiler**
(in-browser, nothing to install):
`https://hiukim.github.io/mind-ar-js-doc/tools/compile`

1. **Pick one marker image per asset (3 for the demo).** Good markers are
   high-contrast, asymmetric, detail-rich images (photos of the asset, a
   detailed poster, a patterned sticker). Avoid: plain colours, large blank
   areas, repetitive grids, thin lines only, rotationally symmetric logos.
   Export each as PNG/JPG (the repo's `frontend/ar/assets/markers/*.svg`
   files are print-friendly symbols — for best tracking, use richer images).
2. **Compile:** open the compiler page → drop the images **in this exact
   order** → Start → download the `.mind` file:
   1. projector image (becomes targetIndex **0** → `projector-marker` → AST-001)
   2. purifier image (becomes targetIndex **1** → `purifier-marker` → AST-002)
   3. printer image (becomes targetIndex **2** → `printer-marker` → AST-003)
3. **Place it:** rename the download to `targets.mind` and put it in
   `frontend/ar/assets/targets/`. Both `index.html` (`imageTargetSrc`) and
   `js/config.js` (`mindarTargetPath`) already point there — no code change.
4. **Print the SAME images** (A5 or larger, matte paper, good lighting).
   Point the phone camera so a marker fills most of the view.
5. **Add a 4th+ asset later:** recompile with all images (order preserved for
   old ones), add its `{ index, markerId, label }` to `targetDefinitions` in
   `js/config.js`, its marker row in the DB, and raise `maxTrack` if you want
   simultaneous detection.

Why the order matters: the compiler assigns `targetIndex` by upload order,
and the app maps `targetIndex → markerId` in `targetDefinitions`, then
`markerId → asset` via `GET /api/assets/marker/:markerId` followed by
`GET /api/assets/:id`. Wrong order = right detection, wrong asset.

## API Connection

The frontend talks to the live backend only — there is no fallback or demo
data. If the API is unreachable, the passport panel shows the real error
instead of invented values. Fetches in `frontend/ar/js/api.js` abort after
about 12 seconds with a readable timeout message.

Calls used by the AR page (isolated in `frontend/ar/js/api.js`):

- `GET /api/assets/marker/:markerId` — returns `{ markerId, assetId, asset }`
- `GET /api/assets/:id` — bare passport object (always called after marker lookup)
- `GET /api/assets/:id/maintenance`
- `POST /api/issues`

## How to run locally

From the project root:

```bash
cd backend
npm install
npm start
```

Then open:

```text
http://localhost:3000/ar/
```

The Express app serves the AR static files at `/ar/` and the API at `/api`, so same-origin `/api` works without a query param. On a laptop static server on another port, pass `?api=http://localhost:3000/api`.

## HTTPS, camera, and hotspot limits

- The camera API requires a **secure context**: `https://` or `http://localhost`.
- Opening `http://<hotspot-ip>:3000/ar/` on a phone usually **blocks** the camera. Workarounds: serve over HTTPS, or set Chrome’s “Insecure origins treated as secure” flag for that origin (demo only).
- Allow camera permission when prompted. Denial shows an error in the scan banner (`arError`).
- Laptop and phone must share a network (phone hotspot is typical). Run `npm run phone` in `backend/` to print the LAN URLs.
- Without `targets.mind` on the machine serving the page, detection cannot start; the scan banner reports the missing file.

The page is intentionally lightweight and designed to be expanded by the next development stages.
