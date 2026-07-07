import { apiRequest, isApiConfigured } from '@/modules/shared/services/apiClient';

export async function loadSharedJournalData(ownerId) {
  if (!ownerId) throw new Error('Trader tidak valid.');
  if (!isApiConfigured) {
    throw new Error('API backend belum dikonfigurasi.');
  }

  const data = await apiRequest(`/users/${ownerId}/shared-journal`);
  return {
    owner: data?.owner || null,
    trades: Array.isArray(data?.trades) ? data.trades : [],
    watchlist: Array.isArray(data?.watchlist) ? data.watchlist : [],
    notes: Array.isArray(data?.notes) ? data.notes : [],
    cashflows: Array.isArray(data?.cashflows) ? data.cashflows : [],
    dividends: Array.isArray(data?.dividends) ? data.dividends : [],
    settings: data?.settings || {},
    marketPrices: data?.marketPrices || {},
  };
}
