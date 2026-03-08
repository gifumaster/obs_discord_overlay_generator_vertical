window.VerticalOverlaySharedSettings = (() => {
  function clampPercent(value, fallback) {
    const number = Number(value);
    if (Number.isNaN(number)) {
      return fallback;
    }

    return Math.min(100, Math.max(0, number));
  }

  function applyShapePreset(presetName, deps) {
    const preset = deps.shapePresets[presetName];
    if (!preset) {
      return;
    }

    deps.clipLeftTopField.value = String(preset.clipLeftTop);
    deps.clipRightTopField.value = String(preset.clipRightTop);
    deps.clipRightBottomField.value = String(preset.clipRightBottom);
    deps.clipLeftBottomField.value = String(preset.clipLeftBottom);
  }

  function detectShapePreset(deps) {
    const current = {
      clipLeftTop: clampPercent(deps.clipLeftTopField.value, 8),
      clipRightTop: clampPercent(deps.clipRightTopField.value, 100),
      clipRightBottom: clampPercent(deps.clipRightBottomField.value, 92),
      clipLeftBottom: clampPercent(deps.clipLeftBottomField.value, 0)
    };

    const matchedPreset = Object.entries(deps.shapePresets).find(([, preset]) => (
      preset.clipLeftTop === current.clipLeftTop &&
      preset.clipRightTop === current.clipRightTop &&
      preset.clipRightBottom === current.clipRightBottom &&
      preset.clipLeftBottom === current.clipLeftBottom
    ));

    deps.shapePresetField.value = matchedPreset ? matchedPreset[0] : "custom";
  }

  function applySharedSizePreset(presetName, deps, includeGap = false) {
    const preset = deps.sizePresets[presetName];
    if (!preset) {
      return;
    }

    deps.sharedDisplayWidthField.value = String(preset.displayWidth);
    deps.sharedDisplayHeightField.value = String(preset.displayHeight);

    if (includeGap) {
      deps.stackGapField.value = String(preset.stackGap);
    }
  }

  function detectSharedSizePreset(deps) {
    const currentWidth = Math.max(1, Number(deps.sharedDisplayWidthField.value) || 320);
    const currentHeight = Math.max(1, Number(deps.sharedDisplayHeightField.value) || 80);
    const matchedPreset = Object.entries(deps.sizePresets).find(([, preset]) => (
      preset.displayWidth === currentWidth && preset.displayHeight === currentHeight
    ));

    deps.sharedSizePresetField.value = matchedPreset ? matchedPreset[0] : "custom";
  }

  function readSharedSettings(deps) {
    const sharedDisplayWidth = Number(deps.sharedDisplayWidthField.value);
    const sharedDisplayHeight = Number(deps.sharedDisplayHeightField.value);
    const stackGap = Number(deps.stackGapField.value);
    const stackPaddingTop = Number(deps.stackPaddingTopField.value);
    const stackPaddingBottom = Number(deps.stackPaddingBottomField.value);
    const stackPaddingLeft = Number(deps.stackPaddingLeftField.value);
    const labelGap = Number(deps.labelGapField.value);
    const zIndexBase = Number(deps.zIndexBaseField.value);
    const resizeMaxWidth = Number(deps.resizeMaxWidthField.value);
    const resizeMaxHeight = Number(deps.resizeMaxHeightField.value);
    const bobDistance = Number(deps.bobDistanceField.value);
    const bobDuration = Number(deps.bobDurationField.value);

    return {
      containerSelector: deps.containerSelectorField.value.trim() || ".voice_states",
      speakingClass: deps.speakingClassField.value.trim() || "wrapper_speaking",
      sharedSizePreset: deps.sharedSizePresetField.value,
      sharedDisplayWidth: Math.max(1, Number.isNaN(sharedDisplayWidth) ? 320 : sharedDisplayWidth),
      sharedDisplayHeight: Math.max(1, Number.isNaN(sharedDisplayHeight) ? 80 : sharedDisplayHeight),
      shapePreset: deps.shapePresetField.value,
      clipLeftTop: clampPercent(deps.clipLeftTopField.value, 8),
      clipRightTop: clampPercent(deps.clipRightTopField.value, 100),
      clipRightBottom: clampPercent(deps.clipRightBottomField.value, 92),
      clipLeftBottom: clampPercent(deps.clipLeftBottomField.value, 0),
      stackGap: Math.max(0, Number.isNaN(stackGap) ? 26 : stackGap),
      stackPaddingTop: Math.max(0, Number.isNaN(stackPaddingTop) ? 20 : stackPaddingTop),
      stackPaddingBottom: Math.max(0, Number.isNaN(stackPaddingBottom) ? 28 : stackPaddingBottom),
      stackPaddingLeft: Math.max(0, Number.isNaN(stackPaddingLeft) ? 18 : stackPaddingLeft),
      labelGap: Math.max(0, Number.isNaN(labelGap) ? 16 : labelGap),
      minHeight: deps.clampNumber(deps.minHeightField.value, 1, 2000, 280),
      zIndexBase: Number.isNaN(zIndexBase) ? 10 : zIndexBase,
      resizeMaxWidth: Math.max(1, Number.isNaN(resizeMaxWidth) ? 336 : resizeMaxWidth),
      resizeMaxHeight: Math.max(1, Number.isNaN(resizeMaxHeight) ? 540 : resizeMaxHeight),
      frameColor: deps.normalizeHexColor(deps.frameColorField.value, "#f8fafc"),
      frameGlowColor: deps.normalizeHexColor(deps.frameGlowColorField.value, "#7dd3fc"),
      frameStrokeWidth: Math.max(0, Number(deps.frameStrokeWidthField.value ?? 2)),
      frameGlowStrength: deps.clampNumber(deps.frameGlowStrengthField.value, 0.2, 3, 1.1),
      speakingFilterStrength: deps.clampNumber(deps.speakingFilterStrengthField.value, 0, 2, 0.7),
      bobDistance: Math.max(0, Number.isNaN(bobDistance) ? 5 : bobDistance),
      bobDuration: Math.max(0.1, Number.isNaN(bobDuration) ? 0.7 : bobDuration),
      enableGlow: deps.enableGlowField.checked,
      enableBobbing: deps.enableBobbingField.checked,
      advancedOpen: deps.sharedAdvancedPanel.open
    };
  }

  function setSharedSettings(sharedSettings, deps) {
    deps.containerSelectorField.value = sharedSettings.containerSelector || ".voice_states";
    deps.speakingClassField.value = sharedSettings.speakingClass || "wrapper_speaking";
    deps.sharedSizePresetField.value = sharedSettings.sharedSizePreset || "balanced";
    deps.sharedDisplayWidthField.value = String(sharedSettings.sharedDisplayWidth ?? 320);
    deps.sharedDisplayHeightField.value = String(sharedSettings.sharedDisplayHeight ?? 80);
    if (sharedSettings.shapePreset && sharedSettings.shapePreset !== "custom" && deps.shapePresets[sharedSettings.shapePreset]) {
      deps.shapePresetField.value = sharedSettings.shapePreset;
      applyShapePreset(sharedSettings.shapePreset, deps);
    } else {
      deps.shapePresetField.value = sharedSettings.shapePreset || "custom";
      deps.clipLeftTopField.value = String(sharedSettings.clipLeftTop ?? 8);
      deps.clipRightTopField.value = String(sharedSettings.clipRightTop ?? 100);
      deps.clipRightBottomField.value = String(sharedSettings.clipRightBottom ?? 92);
      deps.clipLeftBottomField.value = String(sharedSettings.clipLeftBottom ?? 0);
      detectShapePreset(deps);
    }
    deps.stackGapField.value = String(sharedSettings.stackGap ?? 26);
    deps.stackPaddingTopField.value = String(sharedSettings.stackPaddingTop ?? 20);
    deps.stackPaddingBottomField.value = String(sharedSettings.stackPaddingBottom ?? 28);
    deps.stackPaddingLeftField.value = String(sharedSettings.stackPaddingLeft ?? 18);
    deps.labelGapField.value = String(sharedSettings.labelGap ?? 16);
    deps.minHeightField.value = String(deps.clampNumber(sharedSettings.minHeight, 1, 2000, 280));
    deps.zIndexBaseField.value = String(sharedSettings.zIndexBase ?? 10);
    deps.resizeMaxWidthField.value = String(sharedSettings.resizeMaxWidth ?? 336);
    deps.resizeMaxHeightField.value = String(sharedSettings.resizeMaxHeight ?? 540);
    deps.frameColorField.value = deps.normalizeHexColor(sharedSettings.frameColor, "#f8fafc");
    deps.frameGlowColorField.value = deps.normalizeHexColor(sharedSettings.frameGlowColor, "#7dd3fc");
    deps.frameStrokeWidthField.value = String(sharedSettings.frameStrokeWidth ?? 2);
    deps.frameGlowStrengthField.value = String(sharedSettings.frameGlowStrength ?? 1.1);
    deps.speakingFilterStrengthField.value = String(sharedSettings.speakingFilterStrength ?? 0.7);
    deps.bobDistanceField.value = String(sharedSettings.bobDistance ?? 5);
    deps.bobDurationField.value = String(sharedSettings.bobDuration ?? 0.7);
    deps.enableGlowField.checked = sharedSettings.enableGlow ?? true;
    deps.enableBobbingField.checked = sharedSettings.enableBobbing ?? true;
    deps.sharedAdvancedPanel.open = sharedSettings.advancedOpen ?? false;
    detectSharedSizePreset(deps);
  }

  function initializeDefaultState(deps) {
    deps.resetUsersState();
    deps.setActiveUserId(null);
    deps.resetNextUserNumber();
    applySharedSizePreset("balanced", deps, true);
    deps.setSharedSettings({
      sharedSizePreset: "balanced",
      sharedDisplayWidth: 320,
      sharedDisplayHeight: 80,
      shapePreset: "balanced",
      clipLeftTop: 8,
      clipRightTop: 100,
      clipRightBottom: 92,
      clipLeftBottom: 0,
      stackGap: 26,
      stackPaddingTop: 20,
      stackPaddingBottom: 28,
      stackPaddingLeft: 18,
      labelGap: 16,
      minHeight: 280,
      containerSelector: ".voice_states",
      speakingClass: "wrapper_speaking",
      zIndexBase: 10,
      resizeMaxWidth: 336,
      resizeMaxHeight: 540,
      frameColor: "#f8fafc",
      frameGlowColor: "#7dd3fc",
      frameStrokeWidth: 2,
      frameGlowStrength: 1.1,
      speakingFilterStrength: 0.7,
      bobDistance: 5,
      bobDuration: 0.7,
      enableGlow: true,
      enableBobbing: true,
      advancedOpen: false
    });
    deps.createUserRow({ label: "ユーザー 1", userId: "123456789012345678" });
    deps.setActiveTab("shared");
    deps.setStatus("");
    deps.updateOutput({ immediate: true });
  }

  return {
    applyShapePreset,
    applySharedSizePreset,
    detectShapePreset,
    detectSharedSizePreset,
    initializeDefaultState,
    readSharedSettings,
    setSharedSettings
  };
})();
