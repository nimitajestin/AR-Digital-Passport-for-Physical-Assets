/* Dashboard config — never hard-code production URLs.
 * Resolution order: ?api= query param > saved localStorage value >
 * same-origin "/api" when the page is served over http(s) from a non-localhost
 * host (phone on hotspot via the backend) > local dev default.
 * Examples:
 *   laptop, backend serves all:      http://localhost:3000/dashboard/  (uses /api)
 *   laptop, split static + backend:  .../frontend/dashboard/?api=http://localhost:3000/api
 *   phone on hotspot:                http://192.168.43.20:3000/dashboard/ (uses /api)
 */
(function () {
  var params = new URLSearchParams(window.location.search);
  var stored = null;
  try { stored = window.localStorage.getItem('ar_passport_api_base'); } catch (e) { stored = null; }
  var sameOrigin = null;
  try {
    var isHttp = window.location.protocol.indexOf('http') === 0;
    var host = window.location.hostname;
    if (isHttp && host && host !== 'localhost' && host !== '127.0.0.1') {
      sameOrigin = window.location.origin + '/api';
    }
  } catch (e) { sameOrigin = null; }
  var base = params.get('api') || stored || sameOrigin || 'http://localhost:3000/api';
  window.DASHBOARD_CONFIG = {
    API_BASE_URL: String(base).replace(/\/$/, '')
  };
})();
