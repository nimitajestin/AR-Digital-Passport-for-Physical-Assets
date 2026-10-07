(function () {
  const config = window.ARDigitalPassportConfig;

  const fallbackAsset = config.assets[0];

  function normalizeAsset(asset) {
    return {
      ...fallbackAsset,
      ...asset
    };
  }

  const API = {
    async getAssetByMarker(markerId) {
      const safeId = markerId || fallbackAsset.markerId;
      const url = `${config.apiBaseUrl}/assets/marker/${safeId}`;

      try {
        const response = await fetch(url, { method: "GET" });

        if (!response.ok) {
          return normalizeAsset({ markerId: safeId });
        }

        const data = await response.json();
        return normalizeAsset(data);
      } catch (error) {
        console.warn("API unavailable. Using fallback demo data.", error);
        const foundAsset = config.assets.find((item) => item.markerId === safeId) || fallbackAsset;
        return normalizeAsset(foundAsset);
      }
    },

    async getAsset(assetId) {
      const url = `${config.apiBaseUrl}/assets/${assetId || fallbackAsset.id}`;

      try {
        const response = await fetch(url, { method: "GET" });

        if (!response.ok) {
          return normalizeAsset({ id: assetId || fallbackAsset.id });
        }

        const data = await response.json();
        return normalizeAsset(data);
      } catch (error) {
        console.warn("Asset lookup failed. Using fallback open data.", error);
        const foundAsset = config.assets.find((item) => item.id === (assetId || fallbackAsset.id)) || fallbackAsset;
        return normalizeAsset(foundAsset);
      }
    },

    async getMaintenanceSchedule(assetId) {
      const url = `${config.apiBaseUrl}/assets/${assetId || fallbackAsset.id}/maintenance`;

      try {
        const response = await fetch(url, { method: "GET" });

        if (!response.ok) {
          return {
            lastMaintenance: fallbackAsset.lastMaintenance,
            nextMaintenance: fallbackAsset.nextMaintenance
          };
        }

        return await response.json();
      } catch (error) {
        console.warn("Maintenance schedule unavailable.", error);
        return {
          lastMaintenance: fallbackAsset.lastMaintenance,
          nextMaintenance: fallbackAsset.nextMaintenance
        };
      }
    },

    async submitIssue(issueData) {
      const url = `${config.apiBaseUrl}/issues`;

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
            message: "Issue submission is pending backend integration."
          };
        }

        return await response.json();
      } catch (error) {
        console.warn("Issue submission cannot reach backend yet.", error);
        return {
          ok: false,
          message: "Issue submission is ready for backend integration."
        };
      }
    }
  };

  window.ARDigitalPassportAPI = API;
})();
