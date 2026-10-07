# AR Digital Passport for Physical Assets

This repository contains the Dev 1 AR/WebAR foundation for the project described in the project specification. The system follows the real-world flow:

Physical Asset → Image Marker → MindAR Target → Asset/Marker ID → REST API → Asset Information → AR Information Panel

The current scope is intentionally limited to the AR front-end foundation so the backend and database teams can build against a clear API contract later.

## Technology Stack

- A-Frame
- MindAR
- HTML
- CSS
- JavaScript

## Current Project Structure

```text
AR-Digital-Passport-for-Physical-Assets/
├── frontend/
│   └── ar/
│       ├── index.html
│       ├── css/
│       │   └── ar.css
│       ├── js/
│       │   ├── ar.js
│       │   ├── api.js
│       │   ├── config.js
│       │   └── ui.js
│       └── assets/
│           ├── targets/
│           ├── models/
│           └── images/
├── backend/
├── database/
├── docs/
│   └── AR_DEVELOPER.md
├── .gitignore
└── README.md
```

## Local Setup

1. Open a terminal in the project root.
2. Start a simple local web server:

```bash
cd "c:\Users\aaroh\OneDrive\Desktop\ARVR"
python -m http.server 8000
```

3. Open the app in a browser:

```text
http://localhost:8000/frontend/ar/
```

## Current Dev 1 Scope

This repository currently contains the initial AR foundation for Developer 1 (Aarohi):

- mobile-first AR page structure
- A-Frame + MindAR setup placeholder
- target configuration and UI states
- mock API preparation for future service integration
- clean project layout for future backend and database work

This project does not yet include the backend, database, or admin dashboard.
