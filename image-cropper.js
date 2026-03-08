window.VerticalOverlayImageCropper = (() => {
  const modal = document.querySelector("#cropper-modal");
  const viewport = document.querySelector("#cropper-viewport");
  const image = document.querySelector("#cropper-image");
  const selection = document.querySelector("#cropper-selection");
  const sourceBadge = document.querySelector("#cropper-source-badge");
  const zoomField = document.querySelector("#cropper-zoom");
  const closeButton = document.querySelector("#cropper-close");
  const cancelButton = document.querySelector("#cropper-cancel");
  const applyButton = document.querySelector("#cropper-apply");

  if (image) {
    image.addEventListener("dragstart", (event) => {
      event.preventDefault();
    });
  }

  let activeSession = null;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function loadImage(sourceDataUrl) {
    return new Promise((resolve, reject) => {
      const loadedImage = new Image();
      loadedImage.onload = () => resolve(loadedImage);
      loadedImage.onerror = () => reject(new Error("Failed to load image."));
      loadedImage.src = sourceDataUrl;
    });
  }

  function measureCropRect(aspectRatio) {
    const viewportRect = viewport.getBoundingClientRect();
    const widthLimit = Math.max(120, viewportRect.width - 48);
    const heightLimit = Math.max(120, viewportRect.height - 48);
    let cropWidth = widthLimit;
    let cropHeight = cropWidth / aspectRatio;

    if (cropHeight > heightLimit) {
      cropHeight = heightLimit;
      cropWidth = cropHeight * aspectRatio;
    }

    return {
      viewportRect,
      cropRect: {
        width: cropWidth,
        height: cropHeight,
        left: (viewportRect.width - cropWidth) / 2,
        top: (viewportRect.height - cropHeight) / 2
      }
    };
  }

  function clampPosition() {
    if (!activeSession) {
      return;
    }

    const { cropRect, state } = activeSession;
    const displayWidth = state.naturalWidth * state.baseScale * state.zoom;
    const displayHeight = state.naturalHeight * state.baseScale * state.zoom;
    const cropCenterX = cropRect.left + (cropRect.width / 2);
    const cropCenterY = cropRect.top + (cropRect.height / 2);
    const halfDisplayWidth = displayWidth / 2;
    const halfDisplayHeight = displayHeight / 2;

    state.centerX = clamp(
      state.centerX,
      cropCenterX + (cropRect.width / 2) - halfDisplayWidth,
      cropCenterX - (cropRect.width / 2) + halfDisplayWidth
    );
    state.centerY = clamp(
      state.centerY,
      cropCenterY + (cropRect.height / 2) - halfDisplayHeight,
      cropCenterY - (cropRect.height / 2) + halfDisplayHeight
    );
  }

  function render() {
    if (!activeSession) {
      return;
    }

    const { cropRect, state } = activeSession;
    const displayWidth = state.naturalWidth * state.baseScale * state.zoom;
    const displayHeight = state.naturalHeight * state.baseScale * state.zoom;

    clampPosition();

    image.style.width = `${displayWidth}px`;
    image.style.height = `${displayHeight}px`;
    image.style.left = `${state.centerX - (displayWidth / 2)}px`;
    image.style.top = `${state.centerY - (displayHeight / 2)}px`;

    selection.style.left = `${cropRect.left}px`;
    selection.style.top = `${cropRect.top}px`;
    selection.style.width = `${cropRect.width}px`;
    selection.style.height = `${cropRect.height}px`;
  }

  function cleanupSession(session) {
    modal.hidden = true;
    viewport.removeEventListener("pointerdown", session.handlePointerDown);
    window.removeEventListener("pointermove", session.handlePointerMove);
    window.removeEventListener("pointerup", session.handlePointerUp);
    window.removeEventListener("keydown", session.handleWindowKeydown);
    zoomField.removeEventListener("input", session.handleZoomInput);
    closeButton.removeEventListener("click", session.handleCancel);
    cancelButton.removeEventListener("click", session.handleCancel);
    applyButton.removeEventListener("click", session.handleApply);
  }

  function finish(result) {
    if (!activeSession) {
      return;
    }

    const session = activeSession;
    activeSession = null;
    cleanupSession(session);
    session.resolve(result);
  }

  function exportCroppedImage() {
    if (!activeSession) {
      throw new Error("Cropper session is not active.");
    }

    const { cropRect, state } = activeSession;
    const displayScale = state.baseScale * state.zoom;
    const displayLeft = state.centerX - ((state.naturalWidth * displayScale) / 2);
    const displayTop = state.centerY - ((state.naturalHeight * displayScale) / 2);
    const sourceX = (cropRect.left - displayLeft) / displayScale;
    const sourceY = (cropRect.top - displayTop) / displayScale;
    const sourceWidth = cropRect.width / displayScale;
    const sourceHeight = cropRect.height / displayScale;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D context is unavailable.");
    }

    canvas.width = Math.max(1, Math.round(sourceWidth));
    canvas.height = Math.max(1, Math.round(sourceHeight));
    context.drawImage(
      state.image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL("image/png");
  }

  async function openImageCropper({ sourceDataUrl, aspectRatio, sourceKind = "original" }) {
    if (!modal || !viewport || !image || !selection || !sourceBadge || !zoomField || !closeButton || !cancelButton || !applyButton) {
      throw new Error("Cropper UI is unavailable.");
    }

    if (activeSession) {
      finish(null);
    }

    const loadedImage = await loadImage(sourceDataUrl);

    return new Promise((resolve, reject) => {
      let pointerId = null;
      let dragOriginX = 0;
      let dragOriginY = 0;
      let startCenterX = 0;
      let startCenterY = 0;

      const handleCancel = () => finish(null);

      const handleApply = () => {
        try {
          finish(exportCroppedImage());
        } catch (error) {
          const session = activeSession;
          activeSession = null;
          if (session) {
            cleanupSession(session);
          }
          reject(error);
        }
      };

      const handleWindowKeydown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          handleCancel();
        }
      };

      const handleZoomInput = () => {
        if (!activeSession) {
          return;
        }

        activeSession.state.zoom = Math.max(1, Number(zoomField.value) || 1);
        render();
      };

      const handlePointerDown = (event) => {
        if (!activeSession || event.button !== 0) {
          return;
        }

        pointerId = event.pointerId;
        dragOriginX = event.clientX;
        dragOriginY = event.clientY;
        startCenterX = activeSession.state.centerX;
        startCenterY = activeSession.state.centerY;
        viewport.setPointerCapture(pointerId);
      };

      const handlePointerMove = (event) => {
        if (!activeSession || pointerId !== event.pointerId) {
          return;
        }

        activeSession.state.centerX = startCenterX + (event.clientX - dragOriginX);
        activeSession.state.centerY = startCenterY + (event.clientY - dragOriginY);
        render();
      };

      const handlePointerUp = (event) => {
        if (pointerId !== event.pointerId) {
          return;
        }

        if (viewport.hasPointerCapture(pointerId)) {
          viewport.releasePointerCapture(pointerId);
        }

        pointerId = null;
      };

      modal.hidden = false;
      image.src = sourceDataUrl;
      zoomField.value = "1";
      sourceBadge.textContent = sourceKind === "original" ? "オリジナル画像" : "保存済み画像";
      sourceBadge.classList.toggle("is-fallback", sourceKind !== "original");

      requestAnimationFrame(() => {
        try {
          const { viewportRect, cropRect } = measureCropRect(aspectRatio);
          const baseScale = Math.max(cropRect.width / loadedImage.naturalWidth, cropRect.height / loadedImage.naturalHeight);

          activeSession = {
            resolve,
            cropRect,
            viewportRect,
            handleCancel,
            handleApply,
            handlePointerDown,
            handlePointerMove,
            handlePointerUp,
            handleWindowKeydown,
            handleZoomInput,
            state: {
              image: loadedImage,
              naturalWidth: loadedImage.naturalWidth,
              naturalHeight: loadedImage.naturalHeight,
              baseScale,
              zoom: 1,
              centerX: viewportRect.width / 2,
              centerY: viewportRect.height / 2
            }
          };

          render();
          viewport.addEventListener("pointerdown", handlePointerDown);
          window.addEventListener("pointermove", handlePointerMove);
          window.addEventListener("pointerup", handlePointerUp);
          window.addEventListener("keydown", handleWindowKeydown);
          zoomField.addEventListener("input", handleZoomInput);
          closeButton.addEventListener("click", handleCancel);
          cancelButton.addEventListener("click", handleCancel);
          applyButton.addEventListener("click", handleApply);
        } catch (error) {
          modal.hidden = true;
          reject(error);
        }
      });
    });
  }

  return {
    openImageCropper
  };
})();
