window.VerticalOverlayStateIO = (() => {
  const LOCAL_DRAFT_KEY = "vertical-obs-discord-overlay-generator:last-state";
  const LOCAL_DRAFT_VERSION = 2;
  const DRAFT_DB_NAME = "vertical-obs-discord-overlay-generator";
  const DRAFT_DB_VERSION = 1;
  const DRAFT_IMAGE_STORE = "draft-images";
  let localDraftSaveTimeoutId = null;
  let draftDbPromise = null;

  function openDraftDb() {
    if (draftDbPromise) {
      return draftDbPromise;
    }

    draftDbPromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB is unavailable."));
        return;
      }

      const request = indexedDB.open(DRAFT_DB_NAME, DRAFT_DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(DRAFT_IMAGE_STORE)) {
          database.createObjectStore(DRAFT_IMAGE_STORE);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB."));
    });

    return draftDbPromise;
  }

  function exportState(readSharedSettings, readUserRows) {
    return {
      version: 1,
      shared: readSharedSettings(),
      users: readUserRows()
    };
  }

  function createDraftSnapshot(state) {
    const users = Array.isArray(state.users) ? state.users : [];
    const shouldEmbedImages = !("indexedDB" in window);
    return {
      version: state.version || 1,
      shared: state.shared || {},
      users: users.map(({ dataUrl, ...user }, index) => ({
        ...user,
        dataUrl: shouldEmbedImages ? (dataUrl || "") : "",
        hasDraftImage: Boolean(dataUrl),
        draftImageIndex: index
      }))
    };
  }

  async function saveDraftImages(state) {
    const database = await openDraftDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(DRAFT_IMAGE_STORE, "readwrite");
      const store = transaction.objectStore(DRAFT_IMAGE_STORE);
      const images = Array.isArray(state.users)
        ? state.users.map((user) => user.dataUrl || "")
        : [];

      store.put(images, LOCAL_DRAFT_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Failed to save draft images."));
    });
  }

  async function readDraftImages() {
    try {
      const database = await openDraftDb();

      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(DRAFT_IMAGE_STORE, "readonly");
        const store = transaction.objectStore(DRAFT_IMAGE_STORE);
        const request = store.get(LOCAL_DRAFT_KEY);
        request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
        request.onerror = () => reject(request.error || new Error("Failed to load draft images."));
      });
    } catch (error) {
      return [];
    }
  }

  async function clearDraftImages() {
    try {
      const database = await openDraftDb();

      await new Promise((resolve, reject) => {
        const transaction = database.transaction(DRAFT_IMAGE_STORE, "readwrite");
        const store = transaction.objectStore(DRAFT_IMAGE_STORE);
        store.delete(LOCAL_DRAFT_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error("Failed to clear draft images."));
      });
    } catch (error) {
      // Ignore IndexedDB failures.
    }
  }

  async function importState(state, handlers) {
    if (!state || typeof state !== "object") {
      throw new Error("Invalid JSON state.");
    }

    handlers.setSharedSettings(state.shared || {});
    handlers.resetUsersState();

    const fallbackUsers = [{ label: "ユーザー 1", userId: "" }];
    const inputUsers = Array.isArray(state.users) && state.users.length > 0 ? state.users : fallbackUsers;
    const draftImages = state.__loadDraftImages ? await readDraftImages() : [];
    const users = inputUsers.map((user, index) => ({
      ...user,
      dataUrl: user.dataUrl || draftImages[user.draftImageIndex ?? index] || ""
    }));

    users.forEach((user) => handlers.createUserRow(user));
    handlers.setActiveUserId(handlers.getUsersState()[0]?.internalId || null);
    handlers.renderUserTabs();
    handlers.renderActiveUserEditor();
    handlers.updateOutput({ immediate: true });
  }

  function scheduleLocalDraftSave(exportStateFn, delay = 180) {
    if (localDraftSaveTimeoutId) {
      clearTimeout(localDraftSaveTimeoutId);
    }

    localDraftSaveTimeoutId = window.setTimeout(() => {
      localDraftSaveTimeoutId = null;

      try {
        const state = exportStateFn();
        const snapshot = createDraftSnapshot(state);

        localStorage.setItem(
          LOCAL_DRAFT_KEY,
          JSON.stringify({
            version: LOCAL_DRAFT_VERSION,
            savedAt: new Date().toISOString(),
            state: snapshot
          })
        );

        saveDraftImages(state).catch(() => {
          // Ignore IndexedDB failures and keep the editor usable.
        });
      } catch (error) {
        // Keep editor usable even if localStorage fails.
      }
    }, delay);
  }

  function clearLocalDraft() {
    try {
      localStorage.removeItem(LOCAL_DRAFT_KEY);
    } catch (error) {
      // Ignore storage failures.
    }

    void clearDraftImages();
  }

  function readLocalDraft() {
    try {
      const raw = localStorage.getItem(LOCAL_DRAFT_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.state || typeof parsed.state !== "object") {
        return null;
      }

      const hasShared = parsed.state.shared && typeof parsed.state.shared === "object";
      const hasUsers = Array.isArray(parsed.state.users) && parsed.state.users.length > 0;

      if (!hasShared || !hasUsers) {
        return null;
      }

      return parsed;
    } catch (error) {
      return null;
    }
  }

  function markStateForDraftImages(state) {
    return {
      ...state,
      __loadDraftImages: true
    };
  }

  function formatSavedAt(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  return {
    clearLocalDraft,
    exportState,
    formatSavedAt,
    importState,
    markStateForDraftImages,
    readLocalDraft,
    scheduleLocalDraftSave
  };
})();
