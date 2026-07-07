import { apiRequest, isApiConfigured } from '@/modules/shared/services/apiClient';

const TABLE_NAME = 'report_shares';

export async function listReportShares(ownerId) {
  if (isApiConfigured) {
    const rows = await apiRequest('/report-shares');
    return (rows || []).map(normalizeReportShareRow);
  }

  void ownerId;
  return [];
}

export async function createReportShare(payload) {
  if (isApiConfigured) {
    return normalizeReportShareRow(await apiRequest('/report-shares', {
      method: 'POST',
      body: JSON.stringify({
        title: payload.title,
        shareType: 'custom',
        isPublic: payload.is_active ?? true,
        snapshot: payload.report_data ?? null,
      }),
    }));
  }

  void payload;
  throw new Error('API backend belum dikonfigurasi.');
}

export async function updateReportShare(shareId, payload) {
  if (isApiConfigured) {
    return normalizeReportShareRow(await apiRequest(`/report-shares/${shareId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: payload.title,
        shareType: payload.market ? 'custom' : undefined,
        isPublic: payload.is_active,
        snapshot: payload.report_data,
      }),
    }));
  }

  void shareId;
  void payload;
  throw new Error('API backend belum dikonfigurasi.');
}

export async function deleteReportShare(shareId) {
  if (isApiConfigured) {
    await apiRequest(`/report-shares/${shareId}`, {
      method: 'DELETE',
    });
    return;
  }

  void shareId;
  throw new Error('API backend belum dikonfigurasi.');
}

export async function loadPublicReportShare(shareId) {
  if (isApiConfigured) {
    const row = await apiRequest(`/report-shares/key/${shareId}`);
    return normalizeReportShareRow(row);
  }

  void shareId;
  throw new Error('API backend belum dikonfigurasi.');
}

function normalizeReportShareRow(row) {
  const snapshot = row.snapshot ?? row.report_data ?? null;
  const fallbackMarket = typeof row.shareType === 'string' && (row.shareType === 'US' || row.shareType === 'ID')
    ? row.shareType
    : 'ID';
  const market = snapshot?.market || row.market || fallbackMarket;

  return {
    id: row.id,
    share_key: row.shareKey || row.share_key || row.id,
    title: row.title,
    market,
    report_data: snapshot,
    is_active: row.isPublic ?? row.is_active ?? false,
    created_at: row.createdAt ?? row.created_at,
    updated_at: row.updatedAt ?? row.updated_at,
  };
}
