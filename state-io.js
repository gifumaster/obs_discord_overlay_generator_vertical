window.VerticalOverlayStateIO = (() => {
  const LOCAL_DRAFT_KEY = "vertical-obs-discord-overlay-generator:last-state";
  const LOCAL_DRAFT_VERSION = 1;
  let localDraftSaveTimeoutId = null;

  function exportState(readSharedSettings, readUserRows) {
    return {
      version: 1,
      shared: readSharedSettings(),
      users: readUserRows()
    };
  }

  function importState(state, handlers) {
    if (!state || typeof state !== "object") {
      throw new Error("Invalid JSON state.");
    }

    handlers.setSharedSettings(state.shared || {});
    handlers.resetUsersState();

    const users = Array.isArray(state.users) && state.users.length > 0
      ? state.users
      : [{ label: "ユーザー 1", userId: "" }];

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
        localStorage.setItem(
          LOCAL_DRAFT_KEY,
          JSON.stringify({
            version: LOCAL_DRAFT_VERSION,
            savedAt: new Date().toISOString(),
            state: exportStateFn()
          })
        );
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
    readLocalDraft,
    scheduleLocalDraftSave
  };
})();
