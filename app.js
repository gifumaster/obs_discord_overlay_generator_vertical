const sharedForm = document.querySelector("#shared-form");
const userList = document.querySelector("#user-list");
const userRowTemplate = document.querySelector("#user-row-template");
const addUserButton = document.querySelector("#add-user");
const saveJsonButton = document.querySelector("#save-json");
const loadJsonField = document.querySelector("#load-json");
const copyButton = document.querySelector("#copy-css");
const copyStatus = document.querySelector("#copy-status");
const output = document.querySelector("#css-output");
const openHelpButton = document.querySelector("#open-help");
const helpModal = document.querySelector("#help-modal");
const closeHelpButton = document.querySelector("#close-help");
const resumeModal = document.querySelector("#resume-modal");
const resumeDescription = document.querySelector("#resume-description");
const resumePreviousButton = document.querySelector("#resume-previous");
const resumeNewButton = document.querySelector("#resume-new");
const previewCanvas = document.querySelector("#preview-canvas");
const previewEmptyState = document.querySelector("#preview-empty-state");
const userTabBar = document.querySelector("#user-tab-bar");
const userEmptyState = document.querySelector("#user-empty-state");
const tabSharedButton = document.querySelector("#tab-shared");
const tabUsersButton = document.querySelector("#tab-users");
const sharedPanel = document.querySelector("#panel-shared");
const usersPanel = document.querySelector("#panel-users");
const sharedAdvancedPanel = document.querySelector("#shared-advanced-panel");
const sharedSizePresetField = document.querySelector("#shared-size-preset");
const sharedDisplayWidthField = document.querySelector("#shared-display-width");
const sharedDisplayHeightField = document.querySelector("#shared-display-height");
const shapePresetField = document.querySelector("#shape-preset");
const clipLeftTopField = document.querySelector("#clip-left-top");
const clipRightTopField = document.querySelector("#clip-right-top");
const clipRightBottomField = document.querySelector("#clip-right-bottom");
const clipLeftBottomField = document.querySelector("#clip-left-bottom");
const stackGapField = document.querySelector("#stack-gap");
const stackPaddingTopField = document.querySelector("#stack-padding-top");
const stackPaddingBottomField = document.querySelector("#stack-padding-bottom");
const stackPaddingLeftField = document.querySelector("#stack-padding-left");
const labelGapField = document.querySelector("#label-gap");
const minHeightField = document.querySelector("#min-height");
const containerSelectorField = document.querySelector("#container-selector");
const speakingClassField = document.querySelector("#speaking-class");
const zIndexBaseField = document.querySelector("#z-index-base");
const resizeMaxWidthField = document.querySelector("#resize-max-width");
const resizeMaxHeightField = document.querySelector("#resize-max-height");
const displayImageScaleField = document.querySelector("#display-image-scale");
const frameColorField = document.querySelector("#frame-color");
const frameGlowColorField = document.querySelector("#frame-glow-color");
const frameStrokeWidthField = document.querySelector("#frame-stroke-width");
const frameGlowStrengthField = document.querySelector("#frame-glow-strength");
const speakingFilterStrengthField = document.querySelector("#speaking-filter-strength");
const bobDistanceField = document.querySelector("#bob-distance");
const bobDurationField = document.querySelector("#bob-duration");
const enableGlowField = document.querySelector("#enable-glow");
const enableBobbingField = document.querySelector("#enable-bobbing");

const SIZE_PRESETS = {
  compact: { displayWidth: 256, displayHeight: 64, stackGap: 18 },
  balanced: { displayWidth: 320, displayHeight: 80, stackGap: 26 },
  focus: { displayWidth: 384, displayHeight: 96, stackGap: 30 },
  tall: { displayWidth: 448, displayHeight: 112, stackGap: 34 }
};
const SHAPE_PRESETS = {
  gentle: { clipLeftTop: 5, clipRightTop: 100, clipRightBottom: 95, clipLeftBottom: 0 },
  balanced: { clipLeftTop: 8, clipRightTop: 100, clipRightBottom: 92, clipLeftBottom: 0 },
  sharp: { clipLeftTop: 13, clipRightTop: 100, clipRightBottom: 87, clipLeftBottom: 0 },
  reverse: { clipLeftTop: 0, clipRightTop: 92, clipRightBottom: 100, clipLeftBottom: 8 }
};

const {
  buildCssOutput,
  buildFrameDataUrl,
  buildLayoutMetrics,
  buildSpeakingFilterValue,
  clampNumber,
  hexToRgba,
  normalizeHexColor
} = window.VerticalOverlayCssGenerator;
const {
  clearLocalDraft,
  exportState: exportAppState,
  formatSavedAt,
  importState: importAppState,
  markStateForDraftImages,
  readLocalDraft,
  scheduleLocalDraftSave
} = window.VerticalOverlayStateIO;
const { renderPreview: renderPreviewPanel } = window.VerticalOverlayPreview;
const { openImageCropper } = window.VerticalOverlayImageCropper;
const {
  createUserRow: createUserRowPanel,
  renderActiveUserEditor: renderActiveUserEditorPanel,
  renderUserTabs: renderUserTabsPanel
} = window.VerticalOverlayUserEditor;
const {
  applyShapePreset: applyShapePresetPanel,
  applySharedSizePreset: applySharedSizePresetPanel,
  detectShapePreset: detectShapePresetPanel,
  detectSharedSizePreset: detectSharedSizePresetPanel,
  initializeDefaultState: initializeDefaultStatePanel,
  readSharedSettings: readSharedSettingsPanel,
  setSharedSettings: setSharedSettingsPanel
} = window.VerticalOverlaySharedSettings;

const SAMPLE_IMAGE_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#15324d"/>
      <stop offset="50%" stop-color="#10233c"/>
      <stop offset="100%" stop-color="#09131f"/>
    </linearGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#67e8f9" stop-opacity="0.68"/>
      <stop offset="55%" stop-color="#38bdf8" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.06"/>
    </linearGradient>
  </defs>
  <rect width="320" height="80" rx="18" fill="url(#bg)"/>
  <path d="M24 10h72L54 72H18z" fill="#ffffff" opacity="0.12"/>
  <rect x="20" y="12" width="278" height="56" rx="16" fill="url(#beam)"/>
  <path d="M212 14h54L182 70h-42z" fill="#ffffff" opacity="0.1"/>
</svg>
`)}`;
let nextUserNumber = 1;
let usersState = [];
let activeUserId = null;
let statusTimeoutId = null;
let outputFrameRequestId = 0;
const originalImageSourceByUserId = new Map();

function setStatus(message = "", type = "info", persist = false) {
  if (statusTimeoutId) {
    clearTimeout(statusTimeoutId);
    statusTimeoutId = null;
  }

  copyStatus.textContent = message;
  copyStatus.classList.toggle("is-empty", !message);
  copyStatus.classList.toggle("is-error", type === "error");

  if (message && !persist) {
    statusTimeoutId = window.setTimeout(() => {
      copyStatus.textContent = "";
      copyStatus.classList.add("is-empty");
      copyStatus.classList.remove("is-error");
      statusTimeoutId = null;
    }, 2800);
  }
}

function setActiveTab(tabName) {
  const isShared = tabName === "shared";
  tabSharedButton.classList.toggle("is-active", isShared);
  tabUsersButton.classList.toggle("is-active", !isShared);
  tabSharedButton.setAttribute("aria-selected", String(isShared));
  tabUsersButton.setAttribute("aria-selected", String(!isShared));
  tabSharedButton.tabIndex = isShared ? 0 : -1;
  tabUsersButton.tabIndex = isShared ? -1 : 0;
  sharedPanel.hidden = !isShared;
  usersPanel.hidden = isShared;
  sharedPanel.classList.toggle("is-active", isShared);
  usersPanel.classList.toggle("is-active", !isShared);
}

function closeResumeModal() {
  resumeModal.hidden = true;
}

function closeHelpModal() {
  helpModal.hidden = true;
}

function openHelpModal() {
  helpModal.hidden = false;
}

function showResumeModal(draft) {
  const savedAtLabel = formatSavedAt(draft.savedAt);
  resumeDescription.textContent = savedAtLabel
    ? `${savedAtLabel} に保存されたローカル下書きがあります。`
    : "前回保存されたローカル下書きがあります。";
  resumeModal.hidden = false;
}

function initializeDefaultState() {
  return initializeDefaultStatePanel({
    applySharedSizePreset,
    createUserRow,
    resetNextUserNumber: () => {
      nextUserNumber = 1;
    },
    resetUsersState,
    setActiveTab,
    setActiveUserId: (value) => {
      activeUserId = value;
    },
    setSharedSettings,
    setStatus,
    updateOutput
  });
}

function readSharedSettings() {
  return readSharedSettingsPanel({
    bobDistanceField,
    bobDurationField,
    clampNumber,
    clipLeftBottomField,
    clipLeftTopField,
    clipRightBottomField,
    clipRightTopField,
    containerSelectorField,
    enableBobbingField,
    enableGlowField,
    frameColorField,
    frameGlowColorField,
    frameGlowStrengthField,
    frameStrokeWidthField,
    labelGapField,
    minHeightField,
    normalizeHexColor,
    displayImageScaleField,
    resizeMaxHeightField,
    resizeMaxWidthField,
    sharedAdvancedPanel,
    sharedDisplayHeightField,
    sharedDisplayWidthField,
    shapePresetField,
    sharedSizePresetField,
    speakingClassField,
    speakingFilterStrengthField,
    stackGapField,
    stackPaddingBottomField,
    stackPaddingLeftField,
    stackPaddingTopField,
    zIndexBaseField
  });
}

function setSharedSettings(sharedSettings) {
  return setSharedSettingsPanel(sharedSettings, {
    bobDistanceField,
    bobDurationField,
    clampNumber,
    clipLeftBottomField,
    clipLeftTopField,
    clipRightBottomField,
    clipRightTopField,
    containerSelectorField,
    enableBobbingField,
    enableGlowField,
    frameColorField,
    frameGlowColorField,
    frameGlowStrengthField,
    frameStrokeWidthField,
    labelGapField,
    minHeightField,
    normalizeHexColor,
    displayImageScaleField,
    resizeMaxHeightField,
    resizeMaxWidthField,
    sharedAdvancedPanel,
    sharedDisplayHeightField,
    sharedDisplayWidthField,
    shapePresetField,
    shapePresets: SHAPE_PRESETS,
    sharedSizePresetField,
    sizePresets: SIZE_PRESETS,
    speakingClassField,
    speakingFilterStrengthField,
    stackGapField,
    stackPaddingBottomField,
    stackPaddingLeftField,
    stackPaddingTopField,
    zIndexBaseField
  });
}

function applyShapePreset(presetName) {
  return applyShapePresetPanel(presetName, {
    clipLeftBottomField,
    clipLeftTopField,
    clipRightBottomField,
    clipRightTopField,
    shapePresets: SHAPE_PRESETS
  });
}

function detectShapePreset() {
  return detectShapePresetPanel({
    clipLeftBottomField,
    clipLeftTopField,
    clipRightBottomField,
    clipRightTopField,
    shapePresetField,
    shapePresets: SHAPE_PRESETS
  });
}

function readUserRows() {
  return usersState.map(({ internalId, editorCard, ...user }) => ({ ...user }));
}

function resetUsersState() {
  usersState = [];
  nextUserNumber = 1;
  originalImageSourceByUserId.clear();
}

function applySharedSizePreset(presetName) {
  return applySharedSizePresetPanel(presetName, {
    sharedDisplayHeightField,
    sharedDisplayWidthField,
    sizePresets: SIZE_PRESETS,
    stackGapField
  }, true);
}

function detectSharedSizePreset() {
  return detectSharedSizePresetPanel({
    sharedDisplayHeightField,
    sharedDisplayWidthField,
    sharedSizePresetField,
    sizePresets: SIZE_PRESETS
  });
}

function flushOutputUpdate() {
  outputFrameRequestId = 0;
  output.value = buildCssOutput(readSharedSettings(), readUserRows(), SAMPLE_IMAGE_DATA_URL);
  renderPreview();
  scheduleLocalDraftSave(() => exportState());
}

function updateOutput({ immediate = false } = {}) {
  if (immediate) {
    if (outputFrameRequestId) {
      cancelAnimationFrame(outputFrameRequestId);
      outputFrameRequestId = 0;
    }
    flushOutputUpdate();
    return;
  }

  if (outputFrameRequestId) {
    return;
  }

  outputFrameRequestId = requestAnimationFrame(() => {
    flushOutputUpdate();
  });
}

function exportState() {
  return exportAppState(readSharedSettings, readUserRows);
}

function importState(state) {
  return importAppState(state, {
    createUserRow,
    getUsersState: () => usersState,
    renderActiveUserEditor,
    renderUserTabs,
    resetUsersState,
    setActiveUserId: (value) => {
      activeUserId = value;
    },
    setSharedSettings,
    updateOutput
  });
}

function renderPreview() {
  return renderPreviewPanel({
    buildFrameDataUrl,
    buildLayoutMetrics,
    buildSpeakingFilterValue,
    clampNumber,
    hexToRgba,
    previewCanvas,
    previewEmptyState,
    sampleImageDataUrl: SAMPLE_IMAGE_DATA_URL,
    sharedSettings: readSharedSettings(),
    usersState
  });
}

function clearUserOriginalImageSource(userInternalId) {
  originalImageSourceByUserId.delete(userInternalId);
}

function createUserRow(initialValues = {}) {
  return createUserRowPanel(initialValues, {
    applyUserImageFile,
    clearUserOriginalImageSource,
    getActiveUserId: () => activeUserId,
    getNextUserNumber: () => nextUserNumber,
    getUsersState: () => usersState,
    incrementNextUserNumber: () => {
      nextUserNumber += 1;
    },
    openUserImageCropper,
    renderActiveUserEditor,
    renderUserTabs,
    setActiveUserId: (value) => {
      activeUserId = value;
    },
    setStatus,
    setUsersState: (value) => {
      usersState = value;
    },
    updateOutput,
    userRowTemplate,
    userTabBar
  });
}

function renderUserTabs() {
  return renderUserTabsPanel({
    getActiveUserId: () => activeUserId,
    getUsersState: () => usersState,
    renderActiveUserEditor,
    renderUserTabs,
    setActiveUserId: (value) => {
      activeUserId = value;
    },
    setStatus,
    updateOutput,
    userEmptyState,
    userTabBar
  });
}

function renderActiveUserEditor() {
  return renderActiveUserEditorPanel({
    getActiveUserId: () => activeUserId,
    getUsersState: () => usersState,
    userList
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("FileReader result is unavailable."));
    };

    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

function resizeImageToDataUrl(sourceDataUrl, maxWidth, maxHeight, mimeType = "image/png", quality = 0.92) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const widthRatio = maxWidth / image.width;
      const heightRatio = maxHeight / image.height;
      const scale = Math.min(widthRatio, heightRatio, 1);
      const targetWidth = Math.max(1, Math.round(image.width * scale));
      const targetHeight = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Canvas 2D context is unavailable."));
        return;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, targetWidth, targetHeight);
      resolve(canvas.toDataURL(mimeType, quality));
    };

    image.onerror = () => reject(new Error("Failed to load image."));
    image.src = sourceDataUrl;
  });
}

async function buildDisplayImageDataUrl(sourceDataUrl) {
  const sharedSettings = readSharedSettings();
  const preferredWidth = Math.max(
    sharedSettings.resizeMaxWidth,
    Math.round(sharedSettings.sharedDisplayWidth * sharedSettings.displayImageScale)
  );
  const preferredHeight = Math.max(
    sharedSettings.resizeMaxHeight,
    Math.round(sharedSettings.sharedDisplayHeight * sharedSettings.displayImageScale)
  );

  return resizeImageToDataUrl(
    sourceDataUrl,
    preferredWidth,
    preferredHeight,
    "image/png"
  );
}

async function applyUserImageData(userInternalId, dataUrlField, sourceDataUrl, { updateOriginalSource = false } = {}) {
  const displayDataUrl = await buildDisplayImageDataUrl(sourceDataUrl);
  dataUrlField.value = displayDataUrl;
  if (updateOriginalSource) {
    originalImageSourceByUserId.set(userInternalId, sourceDataUrl);
  }
  const targetUser = usersState.find((entry) => entry.internalId === userInternalId);
  if (targetUser) {
    targetUser.dataUrl = displayDataUrl;
  }

  return displayDataUrl;
}

async function applyUserImageFile(userInternalId, dataUrlField, file) {
  if (!file || !file.type.startsWith("image/")) {
    return false;
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  await applyUserImageData(userInternalId, dataUrlField, sourceDataUrl, { updateOriginalSource: true });

  setStatus("");
  updateOutput();
  return true;
}

async function openUserImageCropper(userInternalId, dataUrlField) {
  const targetUser = usersState.find((entry) => entry.internalId === userInternalId);
  const originalSourceDataUrl = originalImageSourceByUserId.get(userInternalId) || "";
  const sourceDataUrl = originalSourceDataUrl || dataUrlField.value.trim() || targetUser?.dataUrl || "";

  if (!sourceDataUrl) {
    setStatus("先に画像を読み込んでください。", "error", true);
    return false;
  }

  const sharedSettings = readSharedSettings();
  const croppedDataUrl = await openImageCropper({
    sourceDataUrl,
    aspectRatio: Math.max(1, sharedSettings.sharedDisplayWidth) / Math.max(1, sharedSettings.sharedDisplayHeight),
    sourceKind: originalSourceDataUrl ? "original" : "fallback"
  });

  if (!croppedDataUrl) {
    return false;
  }

  await applyUserImageData(userInternalId, dataUrlField, croppedDataUrl);

  setStatus("画像をトリミングしました。");
  updateOutput();
  return true;
}

sharedForm.addEventListener("input", (event) => {
  if ([clipLeftTopField, clipRightTopField, clipRightBottomField, clipLeftBottomField].includes(event.target)) {
    detectShapePreset();
  }
  if (event.target === sharedDisplayWidthField || event.target === sharedDisplayHeightField) {
    detectSharedSizePreset();
  }

  setStatus("");
  updateOutput();
});

shapePresetField.addEventListener("change", () => {
  if (shapePresetField.value !== "custom") {
    applyShapePreset(shapePresetField.value);
  }

  setStatus("");
  updateOutput();
});

sharedSizePresetField.addEventListener("change", () => {
  if (sharedSizePresetField.value !== "custom") {
    applySharedSizePreset(sharedSizePresetField.value);
  }

  setStatus("");
  updateOutput();
});

addUserButton.addEventListener("click", () => {
  createUserRow();
  setActiveTab("users");
  setStatus("");
  updateOutput();
});

tabSharedButton.addEventListener("click", () => {
  setActiveTab("shared");
});

tabUsersButton.addEventListener("click", () => {
  setActiveTab("users");
});

tabSharedButton.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") {
    event.preventDefault();
    setActiveTab("users");
    tabUsersButton.focus();
  }
});

tabUsersButton.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    setActiveTab("shared");
    tabSharedButton.focus();
  }
});

saveJsonButton.addEventListener("click", () => {
  const state = exportState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "vertical-obs-discord-overlay-config.json";
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus("JSON設定を保存しました。");
});

loadJsonField.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    await importState(JSON.parse(text));
    setStatus("JSON設定を読み込みました。");
  } catch (error) {
    setStatus("JSONの読み込みに失敗しました。内容を確認してください。", "error", true);
  } finally {
    loadJsonField.value = "";
  }
});

copyButton.addEventListener("click", async () => {
  try {
    updateOutput({ immediate: true });
    await navigator.clipboard.writeText(output.value);
    setStatus("CSSをクリップボードにコピーしました。");
  } catch (error) {
    setStatus("クリップボードへのコピーに失敗しました。手動でコピーしてください。", "error", true);
  }
});

resumePreviousButton.addEventListener("click", async () => {
  const draft = readLocalDraft();
  if (draft?.state) {
    await importState(markStateForDraftImages(draft.state));
    setStatus("前回のローカル下書きを読み込みました。");
  }
  closeResumeModal();
});

resumeNewButton.addEventListener("click", () => {
  clearLocalDraft();
  closeResumeModal();
  initializeDefaultState();
  setStatus("新しい状態を開始しました。");
});

openHelpButton.addEventListener("click", () => {
  openHelpModal();
});

closeHelpButton.addEventListener("click", () => {
  closeHelpModal();
});

helpModal.addEventListener("click", (event) => {
  if (event.target === helpModal) {
    closeHelpModal();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !helpModal.hidden) {
    closeHelpModal();
  }
});

const initialDraft = readLocalDraft();

if (initialDraft?.state) {
  showResumeModal(initialDraft);
} else {
  clearLocalDraft();
  initializeDefaultState();
}
