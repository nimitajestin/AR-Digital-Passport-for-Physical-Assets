(function () {
  const colorMap = {
    operational: "status-operational",
    maintenance: "status-warning",
    warning: "status-warning",
    critical: "status-critical",
    loading: "status-loading"
  };

  const elements = {
    statusBanner: document.getElementById("scanStatus"),
    assetTitle: document.querySelector("#assetCard h2"),
    assetName: document.getElementById("assetName"),
    assetId: document.getElementById("assetId"),
    category: document.getElementById("category"),
    location: document.getElementById("location"),
    status: document.getElementById("status"),
    description: document.getElementById("description"),
    lastMaintenance: document.getElementById("lastMaintenance"),
    nextMaintenance: document.getElementById("nextMaintenance"),
    badge: document.querySelector("#assetCard .status-badge")
  };

  function setStatusBanner(state, label) {
    if (!elements.statusBanner) {
      return;
    }

    elements.statusBanner.className = `scan-status status-${state}`;
    elements.statusBanner.innerHTML = `<span class="status-indicator"></span><span>${label}</span>`;
  }

  function updateStatusBadge(status) {
    if (!elements.badge) {
      return;
    }

    const key = (status || "loading").toLowerCase();
    const badgeClass = colorMap[key] || "status-loading";
    elements.badge.className = `status-badge ${badgeClass}`;
    elements.badge.textContent = status || "Loading";
  }

  function renderAsset(asset) {
    if (!asset || !elements.assetTitle) {
      return;
    }

    const safeAsset = asset || {};

    elements.assetTitle.textContent = safeAsset.name || "Asset passport";
    elements.assetName.textContent = safeAsset.name || "--";
    elements.assetId.textContent = safeAsset.id || "--";
    elements.category.textContent = safeAsset.category || "--";
    elements.location.textContent = safeAsset.location || "--";
    elements.status.textContent = safeAsset.status || "--";
    elements.description.textContent = safeAsset.description || "No description available.";
    elements.lastMaintenance.textContent = safeAsset.lastMaintenance || "--";
    elements.nextMaintenance.textContent = safeAsset.nextMaintenance || "--";
    updateStatusBadge(safeAsset.status || "Loading");
  }

  function showLoadingState(message = "Initializing AR tracker...") {
    setStatusBanner("loading", message);
    updateStatusBadge("Loading");
  }

  function showScanState(message = "Scan an asset") {
    setStatusBanner("idle", message);
    updateStatusBadge("Operational");
  }

  function showErrorState(message = "AR target is not ready. Check the marker file.") {
    setStatusBanner("error", message);
    updateStatusBadge("Critical");
  }

  function renderTargetButtons(targetDefinitions, activeIndex = 0) {
    const container = document.getElementById("targetButtons");
    if (!container) {
      return;
    }

    container.innerHTML = "";

    targetDefinitions.forEach((target) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `target-button ${target.index === activeIndex ? "active" : ""}`;
      button.textContent = target.label;
      button.addEventListener("click", () => {
        if (window.ARDigitalPassportAR) {
          window.ARDigitalPassportAR.switchTarget(target.index);
        }
      });
      container.appendChild(button);
    });
  }

  window.ARDigitalPassportUI = {
    renderAsset,
    showLoadingState,
    showScanState,
    showErrorState,
    renderTargetButtons,
    setStatusBanner,
    updateStatusBadge
  };
})();
