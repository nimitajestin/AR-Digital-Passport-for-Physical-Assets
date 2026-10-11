# AR Developer Notes

## Project Structure

The project is organized into a simple frontend-first structure so future backend and database developers can work independently:

- `frontend/ar/` contains the AR interface and client-side logic
- `backend/` is reserved for future REST API development
- `database/` is reserved for schema and persistence work
- `docs/` contains implementation notes for developers

## Dev 1 Responsibility

Developer 1 is responsible for the AR/WebAR mobile foundation, including:

- AR page layout and user experience
- A-Frame + MindAR setup
- marker target configuration
- UI states for loading, scanning, and error handling
- placeholder integration points for future REST API calls

## AR Technology Stack

- A-Frame for 3D / augmented scene rendering
- MindAR for image-based tracking
- HTML, CSS, and JavaScript for the UI and browser logic

## How the AR Page Works

The AR module is a static front-end page that loads a MindAR image-tracking scene. The application is designed around the project flow:

Physical Asset → Image Marker → MindAR Target → Asset/Marker ID → REST API → Asset Information → AR Information Panel

The page expects a marker target file in the `frontend/ar/assets/targets/` directory. Once the marker is detected, the app can look up an asset ID and show a digital passport panel with asset details.

## Where the MindAR Target File Goes

Compile your marker images into ONE file named exactly:

```text
frontend/ar/assets/targets/targets.mind
```

(`*.mind` is git-ignored — each machine/phone demo keeps its own compiled file.)

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
`markerId → asset` via `GET /api/assets/marker/:markerId`. Wrong order =
right detection, wrong asset.

## Future API Connection

The frontend talks to the live backend only — there is no fallback or demo
data. If the API is unreachable, the passport panel shows the real error
instead of invented values.

Calls (isolated in `frontend/ar/js/api.js`):

- `GET /api/assets/`
- `GET /api/assets/marker/`
- `GET /api/assets/:id/maintenance`
- `POST /api/issues`

## How Another Developer Can Run the Module

From the project root:

```bash
cd "c:\Users\aaroh\OneDrive\Desktop\ARVR"
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/frontend/ar/
```

The page is intentionally lightweight and designed to be expanded by the next development stages.
