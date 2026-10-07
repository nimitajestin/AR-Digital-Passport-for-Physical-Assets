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

Place the real `.mind` target file in:

```text
frontend/ar/assets/targets/
```

Do not commit a fake target file. Keep the real target artifact local or add it later when the backend/AR team has generated it.

## Future API Connection

The frontend is prepared for future calls to:

- `GET /api/assets/`
- `GET /api/assets/marker/`
- `GET /api/assets/:id/maintenance`
- `POST /api/issues`

The API layer is isolated in `frontend/ar/js/api.js` so backend integration can happen later without rewriting the AR experience.

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
