window.VerticalOverlayCssGenerator = (() => {
  function sanitizeSelectorValue(value, fallback) {
    const trimmed = String(value || "").trim();
    return trimmed ? trimmed.replace(/"/g, '\\"') : fallback;
  }

  function sanitizeSelector(selector, fallback) {
    const trimmed = String(selector || "").trim();
    return trimmed || fallback;
  }

  function normalizeHexColor(value, fallback) {
    const trimmed = String(value || "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toLowerCase() : fallback;
  }

  function hexToRgba(value, alpha, fallback = "#ffffff") {
    const hex = normalizeHexColor(value, fallback).slice(1);
    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);
    const safeAlpha = Math.max(0, Math.min(1, Number(alpha) || 0));
    return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (Number.isNaN(number)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, number));
  }

  function lerpNumber(start, end, amount) {
    return start + ((end - start) * amount);
  }

  function buildSpeakingFilterValue(strengthValue) {
    const strength = clampNumber(strengthValue, 0, 2, 0.7);
    const brightness = lerpNumber(0.9, 1.28, strength);
    const saturate = lerpNumber(0.88, 1.18, strength);
    const contrast = lerpNumber(1, 1.12, strength);
    return `brightness(${brightness.toFixed(3)}) saturate(${saturate.toFixed(3)}) contrast(${contrast.toFixed(3)})`;
  }

  function buildPolygonPoints(width, height, clip) {
    return [
      `${(clip.clipLeftTop / 100) * width},0`,
      `${(clip.clipRightTop / 100) * width},0`,
      `${(clip.clipRightBottom / 100) * width},${height}`,
      `${(clip.clipLeftBottom / 100) * width},${height}`
    ].join(" ");
  }

  function buildPolygonClipPath(clip) {
    return `polygon(${clip.clipLeftTop}% 0, ${clip.clipRightTop}% 0, ${clip.clipRightBottom}% 100%, ${clip.clipLeftBottom}% 100%)`;
  }

  function buildExpandedPolygonClipPath(clip, width, height, bleed) {
    const expandedWidth = width + (bleed * 2);
    const expandedHeight = height + (bleed * 2);
    const leftTopX = bleed + ((clip.clipLeftTop / 100) * width);
    const rightTopX = bleed + ((clip.clipRightTop / 100) * width);
    const rightBottomX = bleed + ((clip.clipRightBottom / 100) * width);
    const leftBottomX = bleed + ((clip.clipLeftBottom / 100) * width);

    return `polygon(${(leftTopX / expandedWidth) * 100}% ${(bleed / expandedHeight) * 100}%, ${(rightTopX / expandedWidth) * 100}% ${(bleed / expandedHeight) * 100}%, ${(rightBottomX / expandedWidth) * 100}% ${((expandedHeight - bleed) / expandedHeight) * 100}%, ${(leftBottomX / expandedWidth) * 100}% ${((expandedHeight - bleed) / expandedHeight) * 100}%)`;
  }

  function buildFrameDataUrl(sharedSettings, options = {}) {
    const width = Math.max(1, options.width ?? sharedSettings.sharedDisplayWidth);
    const height = Math.max(1, options.height ?? sharedSettings.sharedDisplayHeight);
    const strokeWidth = Math.max(0, Number(sharedSettings.frameStrokeWidth ?? 2));

    if (strokeWidth === 0) {
      return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"></svg>`)}`;
    }

    const halfStroke = strokeWidth / 2;
    const insetWidth = Math.max(1, width - strokeWidth);
    const insetHeight = Math.max(1, height - strokeWidth);
    const points = buildPolygonPoints(insetWidth, insetHeight, options.clip ?? sharedSettings)
      .split(" ")
      .map((point) => {
        const [x, y] = point.split(",").map(Number);
        return `${x + halfStroke},${y + halfStroke}`;
      })
      .join(" ");
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <polygon
    points="${points}"
    fill="none"
    stroke="${normalizeHexColor(sharedSettings.frameColor, "#ffffff")}"
    stroke-width="${strokeWidth}"
    stroke-linejoin="round"
  />
</svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  function buildLayoutMetrics(sharedSettings, users) {
    const enabledUsers = users
      .filter((user) => user.enabled)
      .map((user, index) => ({ ...user, stackIndex: index }));
    const slotHeight = sharedSettings.sharedDisplayHeight + sharedSettings.stackGap;
    const rawTops = enabledUsers.map((user) => sharedSettings.stackPaddingTop + (user.stackIndex * slotHeight) + user.axisOffset);
    const minRawTop = rawTops.reduce((currentMin, top) => Math.min(currentMin, top), sharedSettings.stackPaddingTop);
    const topShift = sharedSettings.stackPaddingTop - minRawTop;
    const labelWidth = Math.max(120, Math.min(200, Math.round(sharedSettings.sharedDisplayWidth * 0.56)));
    const totalWidth = sharedSettings.stackPaddingLeft + sharedSettings.sharedDisplayWidth + sharedSettings.labelGap + labelWidth + 24;

    const positionedUsers = enabledUsers.map((user, index) => ({
      ...user,
      stackNumber: index + 1,
      top: rawTops[index] + topShift,
      left: sharedSettings.stackPaddingLeft
    }));

    const contentBottom = positionedUsers.reduce((currentMax, user) => (
      Math.max(currentMax, user.top + sharedSettings.sharedDisplayHeight)
    ), sharedSettings.stackPaddingTop);

    return {
      enabledUsers: positionedUsers,
      labelWidth,
      totalWidth,
      totalHeight: Math.max(sharedSettings.minHeight, contentBottom + sharedSettings.stackPaddingBottom)
    };
  }

  function buildSpeakingBlock(sharedSettings) {
    const lines = [];

    if (sharedSettings.enableGlow) {
      lines.push(`  filter: ${buildSpeakingFilterValue(sharedSettings.speakingFilterStrength)};`);
    }

    if (sharedSettings.enableBobbing) {
      lines.push(`  animation: verticalOverlayImageBob ${sharedSettings.bobDuration}s ease-in-out infinite;`);
    }

    if (lines.length === 0) {
      lines.push("  opacity: 1;");
    }

    return lines.join("\n");
  }

  function buildSpeakingFrameBlock(sharedSettings) {
    return "";
  }

  function buildUserCss(sharedSettings, user, labelWidth, sampleImageDataUrl) {
    const userId = sanitizeSelectorValue(user.userId, "USER_ID_HERE");
    const dataUrl = user.dataUrl || sampleImageDataUrl;
    const frameInset = Math.max(1, Math.ceil(Math.max(0, sharedSettings.frameStrokeWidth) / 2));
    const imageBleed = Math.max(frameInset + 2, Math.round(sharedSettings.sharedDisplayHeight * 0.16));
    const frameWidth = Math.max(1, sharedSettings.sharedDisplayWidth - (frameInset * 2));
    const frameHeight = Math.max(1, sharedSettings.sharedDisplayHeight - (frameInset * 2));
    const frameClip = {
      clipLeftTop: sharedSettings.clipLeftTop,
      clipRightTop: sharedSettings.clipRightTop,
      clipRightBottom: sharedSettings.clipRightBottom,
      clipLeftBottom: sharedSettings.clipLeftBottom
    };
    const expandedClipPath = buildExpandedPolygonClipPath(frameClip, sharedSettings.sharedDisplayWidth, sharedSettings.sharedDisplayHeight, imageBleed);
    const frameDataUrl = buildFrameDataUrl(sharedSettings, { width: frameWidth, height: frameHeight, clip: frameClip });
    const glowStrength = clampNumber(sharedSettings.frameGlowStrength, 0.2, 3, 1.1);
    const labelTop = Math.max(0, Math.round((sharedSettings.sharedDisplayHeight / 2) - 14));
    const itemWidth = sharedSettings.sharedDisplayWidth + sharedSettings.labelGap + labelWidth;

    return `li[data-userid="${userId}"] {
  position: absolute;
  left: ${user.left}px;
  top: ${user.top}px;
  width: ${itemWidth}px;
  min-height: ${sharedSettings.sharedDisplayHeight}px;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  overflow: visible !important;
  z-index: ${sharedSettings.zIndexBase + user.stackNumber};
}

li[data-userid="${userId}"] .voice_avatar {
  display: none !important;
}

li[data-userid="${userId}"] .voice_content,
li[data-userid="${userId}"] .voice_user,
li[data-userid="${userId}"] .voice_text {
  margin-left: 0 !important;
  padding-left: 0 !important;
}

li[data-userid="${userId}"] .voice_username {
  position: absolute;
  left: ${sharedSettings.sharedDisplayWidth + sharedSettings.labelGap}px;
  top: ${labelTop}px;
  width: ${labelWidth}px;
  max-width: ${labelWidth}px;
  margin: 0 !important;
  padding: 0 !important;
  display: flex;
  align-items: center;
  min-height: 28px;
  overflow: hidden;
}

li[data-userid="${userId}"] .voice_username > span {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

li[data-userid="${userId}"]::before {
  content: "";
  position: absolute;
  left: ${0 - imageBleed}px;
  top: ${0 - imageBleed}px;
  width: ${sharedSettings.sharedDisplayWidth + (imageBleed * 2)}px;
  height: ${sharedSettings.sharedDisplayHeight + (imageBleed * 2)}px;
  background: url("${dataUrl}") center / cover no-repeat;
  background-position: center center;
  clip-path: ${expandedClipPath};
  pointer-events: none;
  z-index: 10;
  filter: brightness(0.9) saturate(0.88);
  transition: filter 0.15s ease, background-position 0.15s ease;
}

li[data-userid="${userId}"]::after {
  content: "";
  position: absolute;
  left: ${frameInset}px;
  top: ${frameInset}px;
  width: ${frameWidth}px;
  height: ${frameHeight}px;
  background: url("${frameDataUrl}") center / 100% 100% no-repeat;
  pointer-events: none;
  z-index: 11;
  opacity: 0;
  transition: opacity 0.15s ease, filter 0.15s ease;
}

li[data-userid="${userId}"].${sharedSettings.speakingClass}::before {
${buildSpeakingBlock(sharedSettings)}
}

li[data-userid="${userId}"].${sharedSettings.speakingClass}::after {
  opacity: 1;
  filter:
    drop-shadow(0 0 ${Math.max(1, Math.round(4 * glowStrength))}px ${hexToRgba(sharedSettings.frameGlowColor, Math.min(1, 0.95 * glowStrength))})
    drop-shadow(0 0 ${Math.max(2, Math.round(10 * glowStrength))}px ${hexToRgba(sharedSettings.frameGlowColor, Math.min(1, 0.62 * glowStrength))})
    drop-shadow(0 0 ${Math.max(4, Math.round(22 * glowStrength))}px ${hexToRgba(sharedSettings.frameGlowColor, Math.min(1, 0.32 * glowStrength))});
${buildSpeakingFrameBlock(sharedSettings)}
}`;
  }

  function buildCssOutput(sharedSettings, users, sampleImageDataUrl) {
    const safeSettings = {
      ...sharedSettings,
      containerSelector: sanitizeSelector(sharedSettings.containerSelector, ".voice_states"),
      speakingClass: String(sharedSettings.speakingClass || "wrapper_speaking").replace(/[^a-zA-Z0-9_-]/g, "") || "wrapper_speaking"
    };
    const layout = buildLayoutMetrics(safeSettings, users);
    const userCssBlocks = layout.enabledUsers
      .map((user) => buildUserCss(safeSettings, user, layout.labelWidth, sampleImageDataUrl))
      .join("\n\n");
    const bobKeyframes = safeSettings.enableBobbing ? `

@keyframes verticalOverlayImageBob {
  0% {
    background-position: center center;
  }
  50% {
    background-position: center calc(50% - ${safeSettings.bobDistance}px);
  }
  100% {
    background-position: center center;
  }
}` : "";

    return `${safeSettings.containerSelector} {
  position: relative;
  min-height: ${layout.totalHeight}px;
  overflow: visible !important;
}

${safeSettings.containerSelector} li {
  list-style: none;
}

${userCssBlocks}${bobKeyframes}
`;
  }

  return {
    buildCssOutput,
    buildFrameDataUrl,
    buildLayoutMetrics,
    buildSpeakingFilterValue,
    clampNumber,
    hexToRgba,
    normalizeHexColor
  };
})();
