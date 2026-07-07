import { apiRequest, isApiConfigured } from '@/modules/shared/services/apiClient';

const DEFAULT_ROLE = 'trader';
export const USER_ROLES = ['admin', 'mentor', 'trader', 'viewer'];

export async function loadProfile(user) {
  if (!user) return null;

  if (isApiConfigured) {
    const data = await apiRequest('/me');
    return normalizeApiMeProfile(data, user);
  }

  if (!isApiConfigured) {
    return createFallbackProfile(user);
  }
}

export async function ensureProfile(user) {
  if (!user) return null;
  return loadProfile(user);
}

export async function updateProfileName(user, displayName) {
  if (!user) throw new Error('User belum login');

  if (isApiConfigured) {
    const data = await apiRequest('/users/me/profile', {
      method: 'PATCH',
      body: JSON.stringify({ displayName }),
    });
    return normalizeApiProfile(data);
  }

  if (!isApiConfigured) {
    return {
      ...createFallbackProfile(user),
      displayName,
      username: displayName,
    };
  }
}

export async function listProfiles() {
  if (isApiConfigured) {
    const data = await apiRequest('/users');
    return (data || []).map(normalizeApiProfile);
  }

  return [];
}

export async function listProfilesByIds(profileIds) {
  const uniqueIds = Array.from(new Set(profileIds.filter(Boolean)));
  if (uniqueIds.length === 0) return [];

  if (isApiConfigured) {
    const data = await apiRequest(`/users/directory?ids=${encodeURIComponent(uniqueIds.join(','))}`);
    return (data || []).map(normalizeApiProfile);
  }

  return [];
}

export async function updateProfileRole(profileId, role) {
  if (!USER_ROLES.includes(role)) throw new Error('Role tidak valid');
  if (!isApiConfigured) throw new Error('API backend belum dikonfigurasi.');

  const data = await apiRequest(`/users/${profileId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
  return normalizeApiProfile(data);
}

function createFallbackProfile(user) {
  return {
    id: user.id,
    email: user.email || null,
    displayName: user.username || user.email || 'User',
    username: user.username || user.email || 'User',
    role: user.role || DEFAULT_ROLE,
    provider: user.provider || 'localStorage',
  };
}

function normalizeApiMeProfile(profile, user) {
  return {
    id: profile.id,
    email: profile.email || user.email || null,
    displayName: profile.profile?.displayName || user.username || user.email || 'User',
    username: profile.profile?.displayName || user.username || user.email || 'User',
    role: profile.profile?.defaultRole || user.role || DEFAULT_ROLE,
    provider: 'api',
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };
}

function normalizeApiProfile(profile) {
  return {
    id: profile.id,
    email: profile.email || null,
    displayName: profile.displayName || profile.email || 'User',
    username: profile.displayName || profile.email || 'User',
    role: profile.role || DEFAULT_ROLE,
    provider: 'api',
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}
