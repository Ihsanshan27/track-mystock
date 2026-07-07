import { getItem, getScopedItem } from '@/modules/shared/utils/storage';
import { getAuthSession } from '@/modules/auth/authSessionStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

export const isApiConfigured = Boolean(API_BASE_URL);

function getCurrentUserSession() {
  return getAuthSession() || getItem('session');
}

function getActiveWorkspaceId(userId) {
  if (!userId) return null;
  return getScopedItem('active_workspace', userId);
}

function buildHeaders() {
  const session = getCurrentUserSession();
  const userId = session?.id || null;
  const workspaceId = getActiveWorkspaceId(userId);
  const headers = {
    'Content-Type': 'application/json',
  };

  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  } else if (userId) {
    headers['x-user-id'] = userId;
  }
  if (workspaceId) {
    headers['x-workspace-id'] = workspaceId;
  }

  return headers;
}

export async function apiRequest(path, options = {}) {
  if (!isApiConfigured) {
    throw new Error('API backend belum dikonfigurasi.');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...buildHeaders(),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error?.message || `Request gagal (${response.status})`);
  }

  return payload?.data;
}
