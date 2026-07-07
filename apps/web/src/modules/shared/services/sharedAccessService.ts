import { apiRequest, isApiConfigured } from '@/modules/shared/services/apiClient';

const TABLE_NAME = 'shared_access';
export const ACCESS_LEVELS = ['read', 'review', 'admin'];

export async function listOwnedSharedAccess(ownerId) {
  if (isApiConfigured) {
    const rows = await apiRequest('/shared-access');
    return (rows || []).map(normalizeSharedAccessRow);
  }

  void ownerId;
  return [];
}

export async function listGrantedSharedAccess(granteeId) {
  if (isApiConfigured) {
    const rows = await apiRequest('/shared-access/received');
    return (rows || []).map(normalizeReceivedSharedAccessRow);
  }

  void granteeId;
  return [];
}

export async function upsertSharedAccess({ ownerId, granteeId, accessLevel, expiresAt = null }) {
  if (!ACCESS_LEVELS.includes(accessLevel)) throw new Error('Level akses tidak valid.');
  if (isApiConfigured) {
    return normalizeSharedAccessRow(await apiRequest('/shared-access', {
      method: 'POST',
      body: JSON.stringify({
        granteeUserId: granteeId,
        accessLevel,
        expiresAt: expiresAt || null,
      }),
    }));
  }

  void ownerId;
  void granteeId;
  void expiresAt;
  throw new Error('API backend belum dikonfigurasi.');
}

export async function revokeSharedAccess(shareId) {
  if (isApiConfigured) {
    await apiRequest(`/shared-access/${shareId}`, {
      method: 'DELETE',
    });
    return;
  }

  void shareId;
  throw new Error('API backend belum dikonfigurasi.');
}

function normalizeSharedAccessRow(row) {
  return {
    id: row.id,
    owner_id: row.ownerUserId,
    grantee_id: row.granteeUserId,
    access_level: row.accessLevel,
    expires_at: row.expiresAt,
    created_at: row.createdAt,
    grantee_name: row.granteeName || null,
    grantee_email: row.granteeEmail || null,
  };
}

function normalizeReceivedSharedAccessRow(row) {
  return {
    id: row.id,
    owner_id: row.ownerUserId,
    owner_name: row.ownerName || null,
    owner_email: row.ownerEmail || null,
    access_level: row.accessLevel,
    expires_at: row.expiresAt,
    created_at: row.createdAt,
  };
}
