/* AR UI helpers — rendering only. Data comes from the live API via ar.js. */
(function () {
  var colorMap = {
    operational: "status-operational",
    maintenance: "status-warning",
    degraded: "status-warning",
    offline: "status-critical",
    retired: "status-critical",
    loading: "status-loading"
  };

  function el(id) { return document.getElementById(id); }

  function esc(value) {
    return String(value === null || value === undefined ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function banner() { return el("scanStatus"); }
  function badge() { return document.querySelector("#assetCard .status-badge"); }

  function setStatusBanner(state, label) {
    var b = banner();
    if (!b) return;
    b.className = "scan-status status-" + state;
    b.innerHTML = '<span class="status-indicator"></span><span></span>';
    b.lastChild.textContent = label;
  }

  function updateStatusBadge(status) {
    var badgeEl = badge();
    if (!badgeEl) return;
    var key = String(status || "loading").toLowerCase();
    badgeEl.className = "status-badge " + (colorMap[key] || "status-loading");
    badgeEl.textContent = status || "Loading";
  }

  function renderAsset(asset) {
    el("assetName").textContent = asset.name || "--";
    el("assetId").textContent = asset.id || "--";
    el("category").textContent = asset.category || "--";
    el("location").textContent = asset.location || "--";
    el("status").textContent = asset.status || "--";
    el("description").textContent = asset.description || "No description available.";
    el("lastMaintenance").textContent = asset.lastMaintenance || "--";
    el("nextMaintenance").textContent = asset.nextMaintenance || "--";
    var title = document.querySelector("#assetCard h2");
    if (title) title.textContent = asset.name || "Asset passport";
    updateStatusBadge(asset.status || "Loading");
  }

  function clearAsset() {
    el("assetName").textContent = "--";
    el("assetId").textContent = "--";
    el("category").textContent = "--";
    el("location").textContent = "--";
    el("status").textContent = "--";
    el("description").textContent = "Waiting for an asset scan.";
    el("lastMaintenance").textContent = "--";
    el("nextMaintenance").textContent = "--";
    var title = document.querySelector("#assetCard h2");
    if (title) title.textContent = "Asset passport";
    updateStatusBadge("Loading");
  }

  function showLoadingState(message) {
    setStatusBanner("loading", message || "Initializing AR tracker...");
    updateStatusBadge("Loading");
  }

  function showScanState(message) {
    setStatusBanner("idle", message || "Scan an asset");
  }

  function showErrorState(message) {
    setStatusBanner("error", message || "AR target is not ready. Check the marker file.");
    updateStatusBadge("Critical");
  }

  function renderTargetButtons(targetDefinitions, activeIndex) {
    var container = el("targetButtons");
    if (!container) return;
    activeIndex = activeIndex === undefined ? 0 : activeIndex;
    container.innerHTML = "";
    targetDefinitions.forEach(function (target) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "target-button" + (target.index === activeIndex ? " active" : "");
      button.textContent = target.label;
      button.addEventListener("click", function () {
        if (window.ARDigitalPassportAR) window.ARDigitalPassportAR.switchTarget(target.index);
      });
      container.appendChild(button);
    });
  }

  function openDialog(id) {
    var dialog = el(id);
    if (dialog && typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    else if (dialog) dialog.setAttribute("open", "");
  }

  function showDialogMessage(bodyId, message) {
    var body = el(bodyId);
    if (body) body.innerHTML = "<p></p>";
    if (body) body.firstChild.textContent = message;
  }

  function renderAssetDetails(bodyId, asset) {
    var body = el(bodyId);
    if (!body) return;
    var rows = [
      ["Asset ID", asset.id], ["Name", asset.name], ["Category", asset.category],
      ["Location", asset.locationName ? asset.location + " — " + asset.locationName : asset.location],
      ["Status", asset.status], ["Marker ID", asset.markerId || "–"],
      ["Last maintenance", asset.lastMaintenance || "–"],
      ["Next maintenance", asset.nextMaintenance || "–"]
    ];
    var html = "<p>" + esc(asset.description || "No description available.") + "</p>" +
      '<dl class="ar-detail-grid">' +
      rows.map(function (r) { return "<div><dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1] || "–") + "</dd></div>"; }).join("") +
      "</dl>";
    body.innerHTML = html;
  }

  function renderMaintenance(bodyId, asset, records) {
    var body = el(bodyId);
    if (!body) return;
    if (!records || !records.length) {
      body.innerHTML = "<p>No maintenance records found for " + esc(asset.id) + ".</p>";
      return;
    }
    var html = "<p>" + esc(asset.name) + " (" + esc(asset.id) + ") — " + records.length + " record(s), newest first.</p><ul class=\"ar-mini-list\">" +
      records.map(function (m) {
        return "<li><strong>" + esc(m.date) + "</strong> [" + esc(m.type) + "] " + esc(m.description) +
          (m.performedBy ? " — " + esc(m.performedBy) : "") + "</li>";
      }).join("") + "</ul>";
    body.innerHTML = html;
  }

  function resetIssueForm(asset) {
    var form = el("issueForm");
    var target = el("issueAssetLabel");
    if (target) target.textContent = asset.name + " (" + asset.id + ")";
    if (form) form.reset();
    var errorEl = el("issueFormError");
    if (errorEl) errorEl.hidden = true;
    var result = el("issueDialogBody");
    if (result) result.innerHTML = "";
  }

  window.ARDigitalPassportUI = {
    renderAsset: renderAsset,
    clearAsset: clearAsset,
    showLoadingState: showLoadingState,
    showScanState: showScanState,
    showErrorState: showErrorState,
    renderTargetButtons: renderTargetButtons,
    setStatusBanner: setStatusBanner,
    updateStatusBadge: updateStatusBadge,
    openDialog: openDialog,
    showDialogMessage: showDialogMessage,
    renderAssetDetails: renderAssetDetails,
    renderMaintenance: renderMaintenance,
    resetIssueForm: resetIssueForm
  };
})();
