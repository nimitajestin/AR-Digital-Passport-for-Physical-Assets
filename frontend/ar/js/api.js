(function () {
  const config = window.ARDigitalPassportConfig;
  const fallbackAsset = config.assets[0];

  function normalizeAsset(asset) {
    return {
      ...fallbackAsset,
      ...asset,
      status: (asset && asset.status) ? asset.status : fallbackAsset.status,
      lastMaintenance: asset && asset.lastMaintenance ? asset.lastMaintenance : fallbackAsset.lastMaintenance,
      nextMaintenance: asset && asset.nextMaintenance ? asset.nextMaintenance : fallbackAsset.nextMaintenance
    };
  }

  function getApiUrl(path) {
    const base = (config.apiBaseUrl || "/api").replace(/\/$/, "");
    return `${base}${path}`;
  }

  const API = {
    async getAssetByMarker(markerId) {
      const safeMarkerId = markerId || fallbackAsset.markerId;
      const url = getApiUrl(`/assets/marker/${encodeURIComponent(safeMarkerId)}`);

      try {
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) {
          throw new Error(`Marker lookup failed: ${response.status}`);
        }

        const data = await response.json();
        const assetId = data && data.assetId ? data.assetId : fallbackAsset.id;
        return this.getAsset(assetId);
      } catch (error) {
        console.warn("Marker lookup unavailable. Using demo asset fallback.", error);
        const foundAsset = config.assets.find((item) => item.markerId === safeMarkerId) || fallbackAsset;
        return normalizeAsset(foundAsset);
      }
    },

    async getAsset(assetId) {
      const safeId = assetId || fallbackAsset.id;
      const url = getApiUrl(`/assets/${encodeURIComponent(safeId)}`);

      try {
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) {
          throw new Error(`Asset lookup failed: ${response.status}`);
        }

        const data = await response.json();
        return normalizeAsset(data);
      } catch (error) {
        console.warn("Asset API unavailable. Using fallback demo data.", error);
        const foundAsset = config.assets.find((item) => item.id === safeId) || fallbackAsset;
        return normalizeAsset(foundAsset);
      }
    },

    async getMaintenanceSchedule(assetId) {
      const safeId = assetId || fallbackAsset.id;
      const url = getApiUrl(`/assets/${encodeURIComponent(safeId)}/maintenance`);

      try {
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) {
          throw new Error(`Maintenance request failed: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.warn("Maintenance API unavailable.", error);
        return [
          { date: fallbackAsset.lastMaintenance, note: "Last scheduled maintenance" },
          { date: fallbackAsset.nextMaintenance, note: "Next planned service" }
        ];
      }
    },

    async submitIssue(issueData) {
      const url = getApiUrl("/issues");

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(issueData)
        });

        if (!response.ok) {
          return {
            ok: false,
            message: "Issue submission is waiting on backend integration."
          };
        }

        return await response.json();
      } catch (error) {
        console.warn("Issue submission cannot reach backend yet.", error);
        return {
          ok: false,
          message: "Issue report queued for backend integration."
        };
      }
    }
  };

  window.ARDigitalPassportAPI = API;
})();
