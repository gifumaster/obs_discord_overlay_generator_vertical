window.VerticalOverlayPreview = (() => {
  const previewCardElements = new Map();

  function buildExpandedPolygonClipPath(sharedSettings, bleed) {
    const width = sharedSettings.sharedDisplayWidth;
    const height = sharedSettings.sharedDisplayHeight;
    const expandedWidth = width + (bleed * 2);
    const expandedHeight = height + (bleed * 2);
    const leftTopX = bleed + ((sharedSettings.clipLeftTop / 100) * width);
    const rightTopX = bleed + ((sharedSettings.clipRightTop / 100) * width);
    const rightBottomX = bleed + ((sharedSettings.clipRightBottom / 100) * width);
    const leftBottomX = bleed + ((sharedSettings.clipLeftBottom / 100) * width);

    return `polygon(${(leftTopX / expandedWidth) * 100}% ${(bleed / expandedHeight) * 100}%, ${(rightTopX / expandedWidth) * 100}% ${(bleed / expandedHeight) * 100}%, ${(rightBottomX / expandedWidth) * 100}% ${((expandedHeight - bleed) / expandedHeight) * 100}%, ${(leftBottomX / expandedWidth) * 100}% ${((expandedHeight - bleed) / expandedHeight) * 100}%)`;
  }

  function getOrCreatePreviewCardElements(user) {
    const existing = previewCardElements.get(user.internalId);
    if (existing) {
      return existing;
    }

    const card = document.createElement("div");
    const avatar = document.createElement("div");
    const frame = document.createElement("div");
    const label = document.createElement("div");

    card.className = "preview-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    avatar.className = "preview-avatar";
    frame.className = "preview-frame";
    label.className = "preview-label";

    card.append(avatar, frame, label);

    const created = { card, avatar, frame, label };
    previewCardElements.set(user.internalId, created);
    return created;
  }

  function renderPreview({
    buildFrameDataUrl,
    buildLayoutMetrics,
    buildSpeakingFilterValue,
    clampNumber,
    hexToRgba,
    onSelectUser,
    previewCanvas,
    previewEmptyState,
    sampleImageDataUrl,
    sharedSettings,
    usersState
  }) {
    const layout = buildLayoutMetrics(sharedSettings, usersState);
    const liveIds = new Set(layout.enabledUsers.map((user) => user.internalId));

    previewCardElements.forEach((elements, internalId) => {
      if (!liveIds.has(internalId)) {
        elements.card.remove();
        previewCardElements.delete(internalId);
      }
    });

    previewEmptyState.hidden = layout.enabledUsers.length > 0;

    if (layout.enabledUsers.length === 0) {
      previewCanvas.style.width = "100%";
      previewCanvas.style.height = "0";
      previewCanvas.replaceChildren();
      return;
    }

    previewCanvas.style.width = `${Math.max(280, layout.totalWidth)}px`;
    previewCanvas.style.height = `${layout.totalHeight}px`;

    const fragment = document.createDocumentFragment();

    layout.enabledUsers.forEach((user) => {
      const { card, avatar, frame, label } = getOrCreatePreviewCardElements(user);
      const glowStrength = clampNumber(sharedSettings.frameGlowStrength, 0.2, 3, 1.1);
      const frameInset = Math.max(1, Math.ceil(Math.max(0, sharedSettings.frameStrokeWidth) / 2));
      const imageBleed = Math.max(frameInset + 2, Math.round(sharedSettings.sharedDisplayHeight * 0.16));
      const frameWidth = Math.max(1, sharedSettings.sharedDisplayWidth - (frameInset * 2));
      const frameHeight = Math.max(1, sharedSettings.sharedDisplayHeight - (frameInset * 2));
      const expandedClipPath = buildExpandedPolygonClipPath(sharedSettings, imageBleed);

      card.classList.toggle("is-speaking", user.speaking);
      card.classList.toggle("is-bobbing", false);
      card.setAttribute("aria-label", `${user.label || user.userId || "ユーザー"} を編集`);
      card.onclick = () => {
        onSelectUser?.(user.internalId);
      };
      card.onkeydown = (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        onSelectUser?.(user.internalId);
      };
      avatar.classList.toggle("is-bobbing", user.speaking && sharedSettings.enableBobbing);
      card.style.left = `${user.left}px`;
      card.style.top = `${user.top}px`;
      card.style.width = `${sharedSettings.sharedDisplayWidth + sharedSettings.labelGap + layout.labelWidth}px`;
      card.style.height = `${sharedSettings.sharedDisplayHeight}px`;
      card.style.zIndex = String(sharedSettings.zIndexBase + user.stackNumber);
      card.style.setProperty("--preview-bob-distance", `${sharedSettings.bobDistance}px`);
      card.style.setProperty("--preview-bob-duration", `${sharedSettings.bobDuration}s`);

      avatar.style.left = `${0 - imageBleed}px`;
      avatar.style.top = `${0 - imageBleed}px`;
      avatar.style.width = `${sharedSettings.sharedDisplayWidth + (imageBleed * 2)}px`;
      avatar.style.height = `${sharedSettings.sharedDisplayHeight + (imageBleed * 2)}px`;
      avatar.style.backgroundImage = `url("${user.dataUrl || sampleImageDataUrl}")`;
      avatar.style.backgroundPosition = "center center";
      avatar.style.clipPath = expandedClipPath;
      avatar.style.setProperty(
        "--preview-speaking-filter",
        sharedSettings.enableGlow
          ? buildSpeakingFilterValue(sharedSettings.speakingFilterStrength)
          : "brightness(0.9) saturate(0.88) contrast(1)"
      );

      frame.style.left = `${frameInset}px`;
      frame.style.top = `${frameInset}px`;
      frame.style.width = `${frameWidth}px`;
      frame.style.height = `${frameHeight}px`;
      frame.style.backgroundImage = `url("${buildFrameDataUrl(sharedSettings, {
        width: frameWidth,
        height: frameHeight,
        clip: {
          clipLeftTop: sharedSettings.clipLeftTop,
          clipRightTop: sharedSettings.clipRightTop,
          clipRightBottom: sharedSettings.clipRightBottom,
          clipLeftBottom: sharedSettings.clipLeftBottom
        }
      })}")`;
      frame.style.setProperty("--preview-frame-glow-near", hexToRgba(sharedSettings.frameGlowColor, Math.min(1, 0.95 * glowStrength)));
      frame.style.setProperty("--preview-frame-glow-mid", hexToRgba(sharedSettings.frameGlowColor, Math.min(1, 0.62 * glowStrength)));
      frame.style.setProperty("--preview-frame-glow-far", hexToRgba(sharedSettings.frameGlowColor, Math.min(1, 0.32 * glowStrength)));
      frame.style.setProperty("--preview-frame-glow-radius-near", `${Math.max(1, Math.round(4 * glowStrength))}px`);
      frame.style.setProperty("--preview-frame-glow-radius-mid", `${Math.max(2, Math.round(10 * glowStrength))}px`);
      frame.style.setProperty("--preview-frame-glow-radius-far", `${Math.max(4, Math.round(22 * glowStrength))}px`);

      label.textContent = user.label || user.userId || "ユーザー";
      label.style.left = `${sharedSettings.sharedDisplayWidth + sharedSettings.labelGap}px`;
      label.style.top = `${Math.max(0, Math.round((sharedSettings.sharedDisplayHeight / 2) - 14))}px`;
      label.style.width = `${layout.labelWidth}px`;
      label.style.maxWidth = `${layout.labelWidth}px`;

      fragment.append(card);
    });

    previewCanvas.replaceChildren(fragment);
  }

  return {
    renderPreview
  };
})();
