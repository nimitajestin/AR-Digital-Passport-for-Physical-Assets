# AR Digital Passport for Physical Assets

A lightweight AR/WebAR foundation for scanning physical assets with an image marker and displaying a digital passport in the browser.

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
