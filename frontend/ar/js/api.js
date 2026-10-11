/* Real API layer — no fallback data, no simulation.
 * Every method hits the live backend (docs/API.md). On failure the promise
 * REJECTS and the UI shows the real error. Nothing is invented client-side.
 */
(function () {
  function getApiUrl(path) {
    var base = ((window.ARDigitalPassportConfig && window.ARDigitalPassportConfig.apiBaseUrl) || "/api").replace(/\/$/, "");
    return base + path;
  }

  function extractErrorMessage(body, status) {
    if (body && body.error && body.error.message) return body.error.message;
    return "Request failed (" + status + ")";
  }

  var FETCH_TIMEOUT_MS = 12000;

  async function req(path, options) {
    var res;
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT_MS);
    try {
      res = await fetch(getApiUrl(path), Object.assign({}, options, { signal: controller.signal }));
    } catch (networkError) {
      if (networkError && (networkError.name === "AbortError" || networkError.code === 20)) {
        throw new Error("The API did not respond within 12 seconds. Check that the backend is running and reachable.");
      }
      throw new Error("Cannot reach the API. Check the connection and that the backend is running.");
    } finally {
      clearTimeout(timer);
    }
    if (res.status === 204) return null;
    var body = null;
    try { body = await res.json(); } catch (parseError) { body = null; }
    if (!res.ok) throw new Error(extractErrorMessage(body, res.status));
    return body;
  }

  var API = {
    // Returns { markerId, assetId, asset } — contract frozen in docs/API.md.
    async getAssetByMarker(markerId) {
      if (!markerId) throw new Error("No marker ID was detected.");
      return req("/assets/marker/" + encodeURIComponent(markerId), { method: "GET" });
    },

    // Returns the bare asset passport object.
    async getAsset(assetId) {
      if (!assetId) throw new Error("No asset ID was provided.");
      return req("/assets/" + encodeURIComponent(assetId), { method: "GET" });
    },

    // Returns an array of maintenance records.
    async getMaintenanceSchedule(assetId) {
      if (!assetId) throw new Error("No asset ID was provided.");
      return req("/assets/" + encodeURIComponent(assetId) + "/maintenance", { method: "GET" });
    },

    // Creates a real issue row. Resolves with the created issue.
    async submitIssue(issueData) {
      var res = await req("/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issueData)
      });
      return res;
    }
  };

  window.ARDigitalPassportAPI = API;
})();
