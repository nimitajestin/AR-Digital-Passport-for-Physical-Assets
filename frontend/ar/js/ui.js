(function () {
  const colorMap = {
    Operational: "status-operational",
    "Needs Inspection": "status-warning",
    Critical: "status-critical",
    Loading: "status-loading"
  };

  const elements = {
    statusBanner: document.getElementById("scanStatus"),
    assetTitle: document.querySelector("#assetCard h2"),
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
    elements.statusBanner.className = `scan-status status-${state}`;
    elements.statusBanner.innerHTML = `<span class="status-indicator"></span><span>${label}</span>`;
  }

  function updateStatusBadge(status) {
    const key = status || "Loading";
    const badgeClass = colorMap[key] || "status-loading";
    elements.badge.className = `status-badge ${badgeClass}`;
    elements.badge.textContent = key;
  }

  function renderAsset(asset) {
    if (!asset) {
      return;
    }

    elements.assetTitle.textContent = asset.name || "Asset information";
    elements.assetId.textContent = asset.id || "--";
    elements.category.textContent = asset.category || "--";
    elements.location.textContent = asset.location || "--";
    elements.status.textContent = asset.status || "--";
    elements.description.textContent = asset.description || "No description available.";
    elements.lastMaintenance.textContent = asset.lastMaintenance || "--";
    elements.nextMaintenance.textContent = asset.nextMaintenance || "--";
    updateStatusBadge(asset.status || "Loading");
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
        window.ARDigitalPassportAR?.switchTarget(target.index);
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
