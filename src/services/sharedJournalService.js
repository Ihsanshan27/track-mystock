import { isSupabaseConfigured, supabase } from './supabaseClient';

const DATA_KEYS = ['trades', 'watchlist', 'notes', 'cashflows', 'dividends', 'settings', 'marketPrices'];

export async function loadSharedJournalData(ownerId) {
  if (!isSupabaseConfigured) throw new Error('Supabase belum dikonfigurasi.');
  if (!ownerId) throw new Error('Trader tidak valid.');

  const { data, error } = await supabase
    .from('journal_data')
    .select('workspace_id, data_key, data')
    .eq('user_id', ownerId)
    .in('data_key', DATA_KEYS);

  if (error) throw error;

  return reduceJournalRows(data || []);
}

function reduceJournalRows(rows) {
  const result = {
    trades: [],
    watchlist: [],
    notes: [],
    cashflows: [],
    dividends: [],
    settings: {},
    marketPrices: {},
  };

  for (const row of rows) {
    const workspaceId = row.workspace_id || null;
    const payload = row.data;

    if (row.data_key === 'settings' && payload && typeof payload === 'object' && !Array.isArray(payload)) {
      result.settings = { ...result.settings, ...payload };
      continue;
    }

    if (row.data_key === 'marketPrices' && payload && typeof payload === 'object' && !Array.isArray(payload)) {
      result.marketPrices = { ...result.marketPrices, ...payload };
      continue;
    }

    if (Array.isArray(payload)) {
      result[row.data_key] = [
        ...(result[row.data_key] || []),
        ...payload.map((item) => ({ ...item, workspaceId })),
      ];
    }
  }

  result.trades.sort((a, b) => new Date(b.dateBuy || b.createdAt || 0) - new Date(a.dateBuy || a.createdAt || 0));
  result.watchlist.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  result.notes.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  result.cashflows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  result.dividends.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return result;
}
