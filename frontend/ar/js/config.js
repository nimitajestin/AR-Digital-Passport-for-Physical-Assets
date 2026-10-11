// Global config: API base + marker/target mapping only.
// Asset DATA always comes from the live backend (docs/API.md) —
// nothing here invents assets, statuses, or maintenance dates.
//
// API base resolution: window.ENV.API_BASE_URL > ?api= query param >
// same-origin "/api". Examples:
//   served by backend (phone/demo):        default "/api" just works
//   laptop static server on another port:  /frontend/ar/?api=http://localhost:3000/api
var queryApi = null;
try { queryApi = new URLSearchParams(window.location.search).get("api"); } catch (e) { queryApi = null; }
window.ARDigitalPassportConfig = {
  appName: "AR Digital Passport",
  apiBaseUrl: ((window.ENV && window.ENV.API_BASE_URL) || queryApi || "/api").replace(/\/$/, ""),
  targetDefinitions: [
    { index: 0, markerId: "projector-marker", label: "Projector" },
    { index: 1, markerId: "purifier-marker", label: "Air Purifier" },
    { index: 2, markerId: "printer-marker", label: "3D Printer" }
  ],
  mindarTargetPath: "./assets/targets/targets.mind"
};
