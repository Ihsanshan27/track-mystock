import { apiRequest, isApiConfigured } from '@/modules/shared/services/apiClient';

export async function loadApiJournalSnapshot() {
  if (!isApiConfigured) return {};

  const [cashflows, dividends, watchlist, notes, trades, portfolios, financeAccounts, financeTransactions, ipoEvents, ipoAccounts, ipoEntries] = await Promise.all([
    apiRequest('/cashflows'),
    apiRequest('/dividends'),
    apiRequest('/watchlist'),
    apiRequest('/notes'),
    apiRequest('/trades'),
    apiRequest('/portfolios'),
    apiRequest('/finance-accounts'),
    apiRequest('/finance-transactions'),
    apiRequest('/ipo-events'),
    apiRequest('/ipo-accounts'),
    apiRequest('/ipo-entries'),
  ]);

  return {
    cashflows: cashflows || [],
    dividends: dividends || [],
    watchlist: watchlist || [],
    notes: notes || [],
    trades: trades || [],
    portfolios: portfolios || [],
    financeAccounts: financeAccounts || [],
    financeTransactions: financeTransactions || [],
    ipoEvents: ipoEvents || [],
    ipoAccounts: ipoAccounts || [],
    ipoEntries: ipoEntries || [],
  };
}

export async function getDashboardSummary(params = {}) {
  if (!isApiConfigured) return null;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return;
    searchParams.set(key, String(value));
  });
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return apiRequest(`/dashboard/summary${suffix}`);
}

export async function getAnalyticsSummary(params = {}) {
  if (!isApiConfigured) return null;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return;
    searchParams.set(key, String(value));
  });
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return apiRequest(`/analytics/summary${suffix}`);
}

export async function createPortfolioApi(payload) {
  if (!isApiConfigured) return null;
  return apiRequest('/portfolios', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePortfolioApi(id, payload) {
  if (!isApiConfigured) return null;
  return apiRequest(`/portfolios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deletePortfolioApi(id) {
  if (!isApiConfigured) return null;
  return apiRequest(`/portfolios/${id}`, {
    method: 'DELETE',
  });
}

export async function reorderPortfoliosApi(orderedIds) {
  if (!isApiConfigured) return null;
  return apiRequest('/portfolios/reorder', {
    method: 'PUT',
    body: JSON.stringify({ orderedIds }),
  });
}

export async function createTradeApi(payload) {
  if (!isApiConfigured) return null;
  return apiRequest('/trades', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTradeApi(id, payload) {
  if (!isApiConfigured) return null;
  return apiRequest(`/trades/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteTradeApi(id) {
  if (!isApiConfigured) return null;
  return apiRequest(`/trades/${id}`, {
    method: 'DELETE',
  });
}

export async function createWatchlistItemApi(payload) {
  if (!isApiConfigured) return null;
  return apiRequest('/watchlist', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateWatchlistItemApi(id, payload) {
  if (!isApiConfigured) return null;
  return apiRequest(`/watchlist/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteWatchlistItemApi(id) {
  if (!isApiConfigured) return null;
  return apiRequest(`/watchlist/${id}`, {
    method: 'DELETE',
  });
}

export async function createNoteApi(payload) {
  if (!isApiConfigured) return null;
  return apiRequest('/notes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateNoteApi(id, payload) {
  if (!isApiConfigured) return null;
  return apiRequest(`/notes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteNoteApi(id) {
  if (!isApiConfigured) return null;
  return apiRequest(`/notes/${id}`, {
    method: 'DELETE',
  });
}

export async function createCashflowApi(payload) {
  if (!isApiConfigured) return null;
  return apiRequest('/cashflows', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCashflowApi(id, payload) {
  if (!isApiConfigured) return null;
  return apiRequest(`/cashflows/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteCashflowApi(id) {
  if (!isApiConfigured) return null;
  return apiRequest(`/cashflows/${id}`, {
    method: 'DELETE',
  });
}

export async function createDividendApi(payload) {
  if (!isApiConfigured) return null;
  return apiRequest('/dividends', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDividendApi(id, payload) {
  if (!isApiConfigured) return null;
  return apiRequest(`/dividends/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteDividendApi(id) {
  if (!isApiConfigured) return null;
  return apiRequest(`/dividends/${id}`, {
    method: 'DELETE',
  });
}

export async function createFinanceAccountApi(payload) {
  if (!isApiConfigured) return null;
  return apiRequest('/finance-accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateFinanceAccountApi(id, payload) {
  if (!isApiConfigured) return null;
  return apiRequest(`/finance-accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteFinanceAccountApi(id) {
  if (!isApiConfigured) return null;
  return apiRequest(`/finance-accounts/${id}`, {
    method: 'DELETE',
  });
}

export async function createFinanceTransactionApi(payload) {
  if (!isApiConfigured) return null;
  return apiRequest('/finance-transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateFinanceTransactionApi(id, payload) {
  if (!isApiConfigured) return null;
  return apiRequest(`/finance-transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteFinanceTransactionApi(id) {
  if (!isApiConfigured) return null;
  return apiRequest(`/finance-transactions/${id}`, {
    method: 'DELETE',
  });
}

export async function createFinanceTransferApi(payload) {
  if (!isApiConfigured) return null;
  return apiRequest('/finance-transactions/transfer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createIpoEventApi(payload) {
  if (!isApiConfigured) return null;
  return apiRequest('/ipo-events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateIpoEventApi(id, payload) {
  if (!isApiConfigured) return null;
  return apiRequest(`/ipo-events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteIpoEventApi(id) {
  if (!isApiConfigured) return null;
  return apiRequest(`/ipo-events/${id}`, {
    method: 'DELETE',
  });
}

export async function createIpoAccountApi(payload) {
  if (!isApiConfigured) return null;
  return apiRequest('/ipo-accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateIpoAccountApi(id, payload) {
  if (!isApiConfigured) return null;
  return apiRequest(`/ipo-accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteIpoAccountApi(id) {
  if (!isApiConfigured) return null;
  return apiRequest(`/ipo-accounts/${id}`, {
    method: 'DELETE',
  });
}

export async function createIpoEntryApi(payload) {
  if (!isApiConfigured) return null;
  return apiRequest('/ipo-entries', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateIpoEntryApi(id, payload) {
  if (!isApiConfigured) return null;
  return apiRequest(`/ipo-entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteIpoEntryApi(id) {
  if (!isApiConfigured) return null;
  return apiRequest(`/ipo-entries/${id}`, {
    method: 'DELETE',
  });
}
