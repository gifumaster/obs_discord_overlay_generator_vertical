window.VerticalOverlayUserEditor = (() => {
  const userTabElements = new Map();

  function updateUserTitle(card) {
    const label = card.querySelector(".user-label").value.trim();
    card.querySelector(".user-card-title").textContent = label || "ユーザー";
  }

  function getOrCreateUserTabElements(user, deps) {
    const existing = userTabElements.get(user.internalId);
    if (existing) {
      return existing;
    }

    const button = document.createElement("button");
    const toggle = document.createElement("span");
    const toggleInput = document.createElement("input");
    const toggleText = document.createElement("span");

    button.type = "button";
    button.className = "user-tab-button";
    button.setAttribute("role", "tab");
    button.id = `user-tab-${user.internalId}`;
    button.setAttribute("aria-controls", `user-panel-${user.internalId}`);
    button.addEventListener("click", () => {
      deps.setActiveUserId(user.internalId);
      deps.renderUserTabs();
      deps.renderActiveUserEditor();
    });
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      const usersState = deps.getUsersState();
      const index = usersState.findIndex((entry) => entry.internalId === user.internalId);
      if (index === -1) {
        return;
      }

      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + direction + usersState.length) % usersState.length;
      deps.setActiveUserId(usersState[nextIndex].internalId);
      deps.renderUserTabs();
      deps.renderActiveUserEditor();
      deps.userTabBar.querySelector(".user-tab-button.is-active")?.focus();
    });

    toggle.className = "user-tab-toggle";
    toggleInput.type = "checkbox";
    toggleInput.setAttribute("aria-label", "表示する");
    toggleInput.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    toggleInput.addEventListener("change", () => {
      const targetUser = deps.getUsersState().find((entry) => entry.internalId === user.internalId);
      if (!targetUser) {
        return;
      }

      targetUser.enabled = toggleInput.checked;
      targetUser.editorCard?.classList.toggle("is-disabled", !targetUser.enabled);
      deps.setStatus("");
      deps.renderUserTabs();
      deps.updateOutput();
    });

    toggle.append(toggleInput, toggleText);
    button.append(toggle);

    const created = { button, toggleInput, toggleText };
    userTabElements.set(user.internalId, created);
    return created;
  }

  function createUserRow(initialValues, deps) {
    const user = {
      internalId: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: initialValues.label || `ユーザー ${deps.getNextUserNumber()}`,
      userId: initialValues.userId || "",
      axisOffset: Number(initialValues.axisOffset) || 0,
      enabled: initialValues.enabled ?? true,
      speaking: initialValues.speaking ?? false,
      dataUrl: initialValues.dataUrl || ""
    };

    const usersState = deps.getUsersState();
    usersState.push(user);
    const fragment = deps.userRowTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".user-card");
    const labelField = card.querySelector(".user-label");
    const userIdField = card.querySelector(".user-id");
    const axisOffsetField = card.querySelector(".axis-offset");
    const speakingField = card.querySelector(".is-speaking");
    const dataUrlField = card.querySelector(".data-url");
    const fileField = card.querySelector(".image-file");
    const cropButton = card.querySelector(".crop-user-image");
    const moveUpButton = card.querySelector(".move-user-up");
    const moveDownButton = card.querySelector(".move-user-down");
    const removeButton = card.querySelector(".remove-user");

    labelField.value = user.label;
    userIdField.value = user.userId;
    axisOffsetField.value = String(user.axisOffset);
    speakingField.checked = user.speaking;
    dataUrlField.value = user.dataUrl;

    deps.incrementNextUserNumber();
    updateUserTitle(card);
    card.dataset.internalId = user.internalId;
    card.classList.toggle("is-disabled", !user.enabled);

    card.addEventListener("input", (event) => {
      const targetUser = deps.getUsersState().find((entry) => entry.internalId === user.internalId);
      if (!targetUser) {
        return;
      }

      if (event.target === labelField) {
        updateUserTitle(card);
      }

      targetUser.label = labelField.value.trim();
      targetUser.userId = userIdField.value.trim();
      targetUser.axisOffset = Number(axisOffsetField.value) || 0;
      targetUser.speaking = speakingField.checked;
      targetUser.dataUrl = dataUrlField.value.trim();
      deps.setStatus("");
      deps.renderUserTabs();
      deps.updateOutput();
    });

    fileField.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      try {
        await deps.applyUserImageFile(user.internalId, dataUrlField, file);
      } catch (error) {
        deps.setStatus("画像の読込に失敗しました。別の画像で試してください。", "error", true);
      } finally {
        fileField.value = "";
      }
    });

    cropButton.addEventListener("click", async () => {
      try {
        await deps.openUserImageCropper(user.internalId, dataUrlField);
      } catch (error) {
        deps.setStatus("画像トリミングに失敗しました。", "error", true);
      }
    });

    card.addEventListener("paste", async (event) => {
      const items = Array.from(event.clipboardData?.items || []);
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      const file = imageItem?.getAsFile();

      if (!file) {
        return;
      }

      event.preventDefault();

      try {
        await deps.applyUserImageFile(user.internalId, dataUrlField, file);
        deps.setStatus("クリップボード画像を読み込みました。");
      } catch (error) {
        deps.setStatus("クリップボード画像の読み込みに失敗しました。", "error", true);
      }
    });

    moveUpButton.addEventListener("click", () => {
      const currentUsers = deps.getUsersState();
      const index = currentUsers.findIndex((entry) => entry.internalId === user.internalId);
      if (index <= 0) {
        return;
      }

      [currentUsers[index - 1], currentUsers[index]] = [currentUsers[index], currentUsers[index - 1]];
      deps.setStatus("");
      deps.renderUserTabs();
      deps.renderActiveUserEditor();
      deps.updateOutput();
    });

    moveDownButton.addEventListener("click", () => {
      const currentUsers = deps.getUsersState();
      const index = currentUsers.findIndex((entry) => entry.internalId === user.internalId);
      if (index === -1 || index >= currentUsers.length - 1) {
        return;
      }

      [currentUsers[index], currentUsers[index + 1]] = [currentUsers[index + 1], currentUsers[index]];
      deps.setStatus("");
      deps.renderUserTabs();
      deps.renderActiveUserEditor();
      deps.updateOutput();
    });

    removeButton.addEventListener("click", () => {
      deps.clearUserOriginalImageSource?.(user.internalId);
      const currentUsers = deps.getUsersState().filter((entry) => entry.internalId !== user.internalId);
      deps.setUsersState(currentUsers);
      if (deps.getActiveUserId() === user.internalId) {
        deps.setActiveUserId(currentUsers[0]?.internalId || null);
      }
      deps.setStatus("");
      deps.renderUserTabs();
      deps.renderActiveUserEditor();
      deps.updateOutput();
    });

    deps.setActiveUserId(user.internalId);

    user.editorCard = card;
    deps.renderUserTabs();
    deps.renderActiveUserEditor();
  }

  function renderUserTabs(deps) {
    const usersState = deps.getUsersState();
    const activeUserId = deps.getActiveUserId();
    deps.userEmptyState.hidden = usersState.length > 0;
    const liveIds = new Set(usersState.map((user) => user.internalId));

    userTabElements.forEach((elements, internalId) => {
      if (!liveIds.has(internalId)) {
        elements.button.remove();
        userTabElements.delete(internalId);
      }
    });

    const fragment = document.createDocumentFragment();

    usersState.forEach((user, index) => {
      const { button, toggleInput, toggleText } = getOrCreateUserTabElements(user, deps);
      const isActive = user.internalId === activeUserId;

      button.classList.toggle("is-active", isActive);
      button.classList.toggle("is-disabled-user", !user.enabled);
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;

      toggleInput.checked = user.enabled;
      toggleText.textContent = user.label || user.userId || `ユーザー ${index + 1}`;

      fragment.append(button);
    });

    deps.userTabBar.replaceChildren(fragment);
  }

  function renderActiveUserEditor(deps) {
    deps.userList.innerHTML = "";
    const activeUser = deps.getUsersState().find((user) => user.internalId === deps.getActiveUserId());
    if (!activeUser?.editorCard) {
      return;
    }

    activeUser.editorCard.id = `user-panel-${activeUser.internalId}`;
    activeUser.editorCard.setAttribute("role", "tabpanel");
    activeUser.editorCard.setAttribute("aria-labelledby", `user-tab-${activeUser.internalId}`);

    const activeIndex = deps.getUsersState().findIndex((user) => user.internalId === activeUser.internalId);
    const moveUpButton = activeUser.editorCard.querySelector(".move-user-up");
    const moveDownButton = activeUser.editorCard.querySelector(".move-user-down");

    if (moveUpButton) {
      moveUpButton.disabled = activeIndex <= 0;
    }

    if (moveDownButton) {
      moveDownButton.disabled = activeIndex === -1 || activeIndex >= deps.getUsersState().length - 1;
    }

    deps.userList.append(activeUser.editorCard);
  }

  return {
    createUserRow,
    renderActiveUserEditor,
    renderUserTabs
  };
})();
