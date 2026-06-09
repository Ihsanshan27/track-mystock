const PREFIX = 'jurnal_saham_';

// --- Generic key helpers ---

export function getItem(key) {
  try {
    const data = localStorage.getItem(PREFIX + key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeItem(key) {
  localStorage.removeItem(PREFIX + key);
}

// --- User-scoped key helpers ---

/** Returns the user-scoped key (e.g. 'trades_userId123') */
export function getScopedKey(key, userId) {
  return `${key}_${userId}`;
}

export function getWorkspaceScopeKey(userId, workspaceId = null) {
  return workspaceId ? `${userId}_${workspaceId}` : `${userId}_personal`;
}

export function getWorkspaceScopedKey(key, userId, workspaceId = null) {
  return `${key}_${getWorkspaceScopeKey(userId, workspaceId)}`;
}

/** Read from user-scoped storage */
export function getScopedItem(key, userId) {
  return getItem(getScopedKey(key, userId));
}

/** Write to user-scoped storage */
export function setScopedItem(key, userId, value) {
  return setItem(getScopedKey(key, userId), value);
}

/** Remove from user-scoped storage */
export function removeScopedItem(key, userId) {
  return removeItem(getScopedKey(key, userId));
}

export function getWorkspaceScopedItem(key, userId, workspaceId = null) {
  return getItem(getWorkspaceScopedKey(key, userId, workspaceId));
}

export function setWorkspaceScopedItem(key, userId, workspaceId = null, value) {
  return setItem(getWorkspaceScopedKey(key, userId, workspaceId), value);
}

export function removeWorkspaceScopedItem(key, userId, workspaceId = null) {
  return removeItem(getWorkspaceScopedKey(key, userId, workspaceId));
}

// --- One-time migration: global → user-scoped ---

/**
 * Migrates old global data (no userId in key) to the user-scoped keys.
 * Runs once per user; no-op if migration marker already set.
 */
export function migrateGlobalToUser(userId) {
  const migrationKey = getScopedKey('_migrated', userId);
  if (getItem(migrationKey)) return; // Already migrated

  const dataKeys = ['trades', 'watchlist', 'notes', 'settings', 'cashflows', 'dividends', 'marketPrices'];
  for (const key of dataKeys) {
    const globalData = getItem(key); // read from old global key
    if (globalData != null) {
      // Only write scoped if the user doesn't already have data there
      const existing = getScopedItem(key, userId);
      if (existing == null || (Array.isArray(existing) && existing.length === 0)) {
        setScopedItem(key, userId, globalData);
      }
    }
  }

  // Clear global keys so they don't bleed into other users
  for (const key of dataKeys) {
    removeItem(key);
  }

  // Mark migration done
  setItem(migrationKey, true);
}

export function migrateUserScopeToWorkspaceScope(userId) {
  const migrationKey = getScopedKey('_workspace_migrated', userId);
  if (getItem(migrationKey)) return;

  const dataKeys = ['trades', 'watchlist', 'notes', 'settings', 'cashflows', 'dividends', 'marketPrices'];
  for (const key of dataKeys) {
    const existingWorkspaceValue = getWorkspaceScopedItem(key, userId, null);
    if (existingWorkspaceValue != null) continue;

    const scopedValue = getScopedItem(key, userId);
    if (scopedValue != null) {
      setWorkspaceScopedItem(key, userId, null, scopedValue);
    }
  }

  setItem(migrationKey, true);
}

export function migrateWorkspaceScopeToUserScope(userId) {
  const migrationKey = getScopedKey('_workspace_to_user_migrated', userId);
  if (getItem(migrationKey)) return;

  const dataKeys = ['trades', 'watchlist', 'notes', 'settings', 'cashflows', 'dividends', 'marketPrices'];
  for (const key of dataKeys) {
    const existingUserValue = getScopedItem(key, userId);
    if (existingUserValue != null) continue;

    const workspaceScopedValue = getWorkspaceScopedItem(key, userId, null);
    if (workspaceScopedValue != null) {
      setScopedItem(key, userId, workspaceScopedValue);
    }
  }

  setItem(migrationKey, true);
}

// --- Export / Import / Clear (user-scoped) ---

export function exportAllData(userId) {
  const data: any = {};
  const keys = ['trades', 'watchlist', 'notes', 'settings', 'cashflows', 'dividends', 'marketPrices'];
  if (userId) {
    for (const key of keys) {
      data[key] = getScopedItem(key, userId);
    }
  } else {
    // Fallback: export from global keys (legacy)
    for (const key of keys) {
      data[key] = getItem(key);
    }
  }
  data.exportDate = new Date().toISOString();
  data.version = '1.0';
  return data;
}

export function importAllData(data, userId) {
  if (!data || !data.version) throw new Error('Format data tidak valid');
  const keys = ['trades', 'watchlist', 'notes', 'settings', 'cashflows', 'dividends', 'marketPrices'];
  for (const key of keys) {
    if (data[key] != null) {
      if (userId) {
        setScopedItem(key, userId, data[key]);
      } else {
        setItem(key, data[key]);
      }
    }
  }
}

export function clearAllData(userId) {
  const keys = ['trades', 'watchlist', 'notes', 'settings', 'cashflows', 'dividends', 'marketPrices'];
  if (userId) {
    for (const key of keys) {
      removeScopedItem(key, userId);
    }
  } else {
    for (const key of keys) {
      removeItem(key);
    }
  }
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
