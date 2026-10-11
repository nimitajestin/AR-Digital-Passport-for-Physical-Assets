/* Thin fetch wrapper over docs/API.md. No mock data — all calls hit the real backend. */
(function () {
  function base() { return (window.DASHBOARD_CONFIG && window.DASHBOARD_CONFIG.API_BASE_URL) || 'http://localhost:3000/api'; }
  async function req(path, options) {
    var res;
    try {
      res = await fetch(base() + path, options);
    } catch (e) {
      throw new Error('Cannot reach API at ' + base() + '. Is the backend running?');
    }
    if (res.status === 204) return null;
    var body = null;
    try { body = await res.json(); } catch (e) { body = null; }
    if (!res.ok) {
      var msg = (body && body.error && body.error.message) || ('Request failed (' + res.status + ')');
      var err = new Error(msg);
      err.status = res.status; err.code = body && body.error && body.error.code; err.details = body && body.error && body.error.details;
      throw err;
    }
    return body;
  }
  function qs(o) {
    var p = new URLSearchParams();
    Object.keys(o || {}).forEach(function (k) { if (o[k] !== '' && o[k] !== undefined && o[k] !== null) p.set(k, o[k]); });
    var s = p.toString();
    return s ? '?' + s : '';
  }
  window.DashboardAPI = {
    get base() { return base(); },
    listAssets: function (f) { return req('/assets' + qs(f)); },
    getAsset: function (id) { return req('/assets/' + encodeURIComponent(id)); },
    getMaintenance: function (id) { return req('/assets/' + encodeURIComponent(id) + '/maintenance'); },
    createAsset: function (b) { return req('/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); },
    updateAsset: function (id, b) { return req('/assets/' + encodeURIComponent(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); },
    deleteAsset: function (id) { return req('/assets/' + encodeURIComponent(id), { method: 'DELETE' }); },
    listLocations: function () { return req('/locations'); },
    listIssues: function (f) { return req('/issues' + qs(f)); },
    updateIssueStatus: function (id, status) { return req('/issues/' + id + '/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: status }) }); }
  };
})();
