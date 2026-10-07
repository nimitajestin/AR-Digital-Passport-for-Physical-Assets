(function () {
  const config = window.ARDigitalPassportConfig;
  const ui = window.ARDigitalPassportUI;
  const api = window.ARDigitalPassportAPI;

  const state = {
    currentTargetIndex: 0,
    currentAsset: null,
    isTrackReady: false
  };

  function getCurrentTarget() {
    return config.targetDefinitions.find((item) => item.index === state.currentTargetIndex) || config.targetDefinitions[0];
  }

  async function loadAssetForTarget(index) {
    const target = config.targetDefinitions[index] || config.targetDefinitions[0];
    state.currentTargetIndex = index;

    ui.showLoadingState(`Loading asset ${target.label}...`);

    try {
      const asset = await api.getAssetByMarker(target.markerId);
      state.currentAsset = asset;
      ui.renderAsset(asset);
      ui.setStatusBanner("detected", `Asset ${asset.name} ready`);
      return asset;
    } catch (error) {
      console.error("Failed to load asset payload", error);
      ui.showErrorState("Asset data could not be loaded.");
      return null;
    }
  }

  function initializeTargetButtons() {
    ui.renderTargetButtons(config.targetDefinitions, state.currentTargetIndex);
  }

  function switchTarget(nextIndex) {
    if (!config.targetDefinitions[nextIndex]) {
      return;
    }

    state.currentTargetIndex = nextIndex;
    initializeTargetButtons();
    loadAssetForTarget(nextIndex);
  }

  function attachDetectorState() {
    const scene = document.querySelector("a-scene");
    if (!scene) {
      return;
    }

    scene.addEventListener("arReady", () => {
      state.isTrackReady = true;
      ui.showScanState("Scan an asset");
      initializeTargetButtons();
      loadAssetForTarget(state.currentTargetIndex);
    });

    scene.addEventListener("arError", () => {
      state.isTrackReady = false;
      ui.showErrorState("MindAR failed to initialize. Check the marker asset.");
    });
  }

  function bindRefreshAction() {
    const refreshButton = document.getElementById("refreshScanBtn");
    if (refreshButton) {
      refreshButton.addEventListener("click", () => {
        ui.showLoadingState("Refreshing asset context...");
        loadAssetForTarget(state.currentTargetIndex);
      });
    }
  }

  function initialize() {
    ui.showLoadingState("Initializing AR tracker...");
    initializeTargetButtons();
    bindRefreshAction();
    attachDetectorState();

    const targetPath = config.mindarTargetPath;
    if (targetPath && targetPath.includes("placeholder-target.mind")) {
      console.info("MindAR target file is intentionally placeholder only. Add the real .mind target file in frontend/ar/assets/targets/ before deployment.");
    }

    const demoAsset = config.assets[0];
    ui.renderAsset(demoAsset);
    ui.showScanState("Scan an asset");
  }

  window.ARDigitalPassportAR = {
    initialize,
    switchTarget,
    getCurrentTarget,
    loadAssetForTarget
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
