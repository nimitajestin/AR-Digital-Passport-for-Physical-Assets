/* AR controller — marker detection → live API → passport panel.
 * No demo data: without a reachable backend every lookup shows a real error.
 */
(function () {
  var config = window.ARDigitalPassportConfig;
  var ui = window.ARDigitalPassportUI;
  var api = window.ARDigitalPassportAPI;

  var state = {
    currentTargetIndex: 0,
    currentAsset: null,
    isTrackReady: false,
    mindFileMissing: false
  };

  function getCurrentTarget() {
    return config.targetDefinitions.find(function (item) { return item.index === state.currentTargetIndex; }) || config.targetDefinitions[0];
  }

  async function loadAssetForTarget(index) {
    var target = config.targetDefinitions[index] || config.targetDefinitions[0];
    state.currentTargetIndex = index;
    state.currentAsset = null;

    ui.showLoadingState("Loading asset " + target.label + "...");

    try {
      // Marker lookup returns { markerId, assetId, asset } per docs/API.md.
      // Always follow with GET /api/assets/:id so the panel uses the bare passport.
      var lookup = await api.getAssetByMarker(target.markerId);
      var assetId = lookup && lookup.assetId;
      var asset = await api.getAsset(assetId);
      state.currentAsset = asset;
      ui.renderAsset(asset);
      ui.setStatusBanner("detected", "Asset " + asset.name + " ready");
      return asset;
    } catch (error) {
      ui.showErrorState(error.message || "Asset data could not be loaded.");
      return null;
    }
  }

  function initializeTargetButtons() {
    ui.renderTargetButtons(config.targetDefinitions, state.currentTargetIndex);
  }

  function switchTarget(nextIndex) {
    if (!config.targetDefinitions[nextIndex]) return;
    state.currentTargetIndex = nextIndex;
    initializeTargetButtons();
    loadAssetForTarget(nextIndex);
  }

  async function showMaintenance() {
    if (!state.currentAsset) {
      ui.showDialogMessage("maintenanceDialogBody", "Scan an asset first — no asset is loaded.");
      ui.openDialog("maintenanceDialog");
      return;
    }
    ui.showDialogMessage("maintenanceDialogBody", "Loading maintenance history...");
    ui.openDialog("maintenanceDialog");
    try {
      var records = await api.getMaintenanceSchedule(state.currentAsset.id);
      ui.renderMaintenance("maintenanceDialogBody", state.currentAsset, records);
    } catch (error) {
      ui.showDialogMessage("maintenanceDialogBody", "Could not load maintenance: " + error.message);
    }
  }

  function showDetails() {
    if (!state.currentAsset) {
      ui.showDialogMessage("detailDialogBody", "Scan an asset first — no asset is loaded.");
      ui.openDialog("detailDialog");
      return;
    }
    ui.renderAssetDetails("detailDialogBody", state.currentAsset);
    ui.openDialog("detailDialog");
  }

  function showIssueForm() {
    if (!state.currentAsset) {
      ui.showDialogMessage("issueDialogBody", "Scan an asset first — no asset is loaded.");
      return;
    }
    ui.resetIssueForm(state.currentAsset);
    ui.openDialog("issueDialog");
  }

  async function submitIssue(event) {
    event.preventDefault();
    if (!state.currentAsset) return;
    var form = document.getElementById("issueForm");
    var description = form.description.value.trim();
    var errorEl = document.getElementById("issueFormError");
    if (description.length < 5) {
      errorEl.textContent = "Please describe the issue (at least 5 characters).";
      errorEl.hidden = false;
      return;
    }
    errorEl.hidden = true;
    var submitBtn = document.getElementById("issueSubmit");
    submitBtn.disabled = true;
    try {
      var created = await api.submitIssue({
        assetId: state.currentAsset.id,
        description: description,
        reportedBy: form.reportedBy.value.trim() || "AR user"
      });
      ui.showDialogMessage("issueDialogBody", "Issue #" + created.id + " reported for " + state.currentAsset.id + ". An admin will review it in the dashboard.");
      form.reset();
    } catch (error) {
      errorEl.textContent = error.message || "Issue could not be submitted.";
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  }

  function closePanel() {
    state.currentAsset = null;
    ui.clearAsset();
    ui.showScanState("Scan an asset");
  }

  function bindActions() {
    var buttons = document.querySelectorAll("[data-action]");
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var action = button.getAttribute("data-action");
        if (action === "details") showDetails();
        else if (action === "maintenance") showMaintenance();
        else if (action === "issue") showIssueForm();
        else if (action === "close") closePanel();
      });
    });
    var refreshButton = document.getElementById("refreshScanBtn");
    if (refreshButton) {
      refreshButton.addEventListener("click", function () {
        ui.showLoadingState("Refreshing asset context...");
        loadAssetForTarget(state.currentTargetIndex);
      });
    }
    var issueForm = document.getElementById("issueForm");
    if (issueForm) issueForm.addEventListener("submit", submitIssue);
    document.querySelectorAll("[data-close-dialog]").forEach(function (button) {
      button.addEventListener("click", function () {
        var dialog = document.getElementById(button.getAttribute("data-close-dialog"));
        if (dialog) dialog.close();
      });
    });
  }

  function attachDetectorState() {
    var scene = document.querySelector("a-scene");
    if (!scene) return;
    scene.addEventListener("arReady", function () {
      state.isTrackReady = true;
      initializeTargetButtons();
      if (state.mindFileMissing) {
        ui.showErrorState("Marker target file missing: " + config.mindarTargetPath + ". Compile it with the MindAR Image Targets Compiler into frontend/ar/assets/targets/targets.mind (see docs/AR_DEVELOPER.md).");
      } else {
        ui.showScanState("Scan an asset");
      }
    });
    scene.addEventListener("arError", function () {
      state.isTrackReady = false;
      ui.showErrorState("Camera or tracker failed. Allow camera access and use HTTPS.");
    });
  }

  function attachTargetEvents() {
    config.targetDefinitions.forEach(function (target) {
      var entity = document.querySelector("#target-" + target.index);
      if (!entity) return;
      entity.addEventListener("targetFound", function () {
        state.currentTargetIndex = target.index;
        initializeTargetButtons();
        loadAssetForTarget(target.index);
      });
      entity.addEventListener("targetLost", function () {
        if (state.currentTargetIndex !== target.index) return;
        closePanel();
      });
    });
  }

  function checkMindFile() {
    if (!config.mindarTargetPath) return;
    var missingMsg = "Marker target file missing: " + config.mindarTargetPath + ". Compile it with the MindAR Image Targets Compiler into frontend/ar/assets/targets/targets.mind (see docs/AR_DEVELOPER.md).";
    fetch(config.mindarTargetPath, { method: "HEAD" }).then(function (res) {
      if (res.ok) return;
      state.mindFileMissing = true;
      console.warn(missingMsg);
      ui.showErrorState(missingMsg);
    }).catch(function () {
      state.mindFileMissing = true;
      console.warn(missingMsg);
      ui.showErrorState(missingMsg);
    });
  }

  function initialize() {
    ui.clearAsset();
    ui.showLoadingState("Initializing AR tracker...");
    initializeTargetButtons();
    bindActions();
    attachDetectorState();
    attachTargetEvents();
    checkMindFile();
    ui.showScanState("Scan an asset");
  }

  window.ARDigitalPassportAR = {
    initialize: initialize,
    switchTarget: switchTarget,
    getCurrentTarget: getCurrentTarget,
    loadAssetForTarget: loadAssetForTarget
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
