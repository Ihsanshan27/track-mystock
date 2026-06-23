import { getScopedItem, setScopedItem } from '@/modules/shared/utils/storage';

export function normalizeSettings<T extends object>(settings: unknown, defaultSettings: T): T {
  return { ...defaultSettings, ...((settings as Partial<T>) || {}) };
}

type LoadLocalDataOptions = {
  defaultPortfolio: unknown;
  defaultSettings: any;
};

export function loadLocalData(userId: string, options: LoadLocalDataOptions) {
  const { defaultPortfolio, defaultSettings } = options;

  return {
    trades: getScopedItem('trades', userId) || [],
    watchlist: getScopedItem('watchlist', userId) || [],
    notes: getScopedItem('notes', userId) || [],
    cashflows: getScopedItem('cashflows', userId) || [],
    dividends: getScopedItem('dividends', userId) || [],
    settings: normalizeSettings(getScopedItem('settings', userId), defaultSettings),
    marketPrices: getScopedItem('marketPrices', userId) || {},
    portfolios: getScopedItem('portfolios', userId) || [defaultPortfolio],
    tradingPlans: getScopedItem('tradingPlans', userId) || [],
    ipoEvents: getScopedItem('ipoEvents', userId) || [],
    ipoEntries: getScopedItem('ipoEntries', userId) || [],
    ipoAccounts: getScopedItem('ipoAccounts', userId) || [],
    bsjpTrades: getScopedItem('bsjpTrades', userId) || [],
    financeAccounts: getScopedItem('financeAccounts', userId) || [],
    financeTransactions: getScopedItem('financeTransactions', userId) || [],
  };
}

export function cacheLocalData(userId: string, data: any, dataKeys: string[]) {
  if (!userId || !data) return;

  dataKeys.forEach((key) => {
    if (data[key] !== undefined) {
      setScopedItem(key, userId, data[key]);
    }
  });
}

export function hasStoredData(data: any, dataKeys: string[]) {
  return dataKeys.some((key) => {
    const value = data[key];
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return value != null;
  });
}
