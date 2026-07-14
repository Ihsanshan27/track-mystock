import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  generateId,
  migrateGlobalToUser,
  migrateWorkspaceScopeToUserScope,
  getScopedItem,
  setScopedItem,
  removeScopedItem,
} from '@/modules/shared/utils/storage';
import { useAuth } from '@/modules/auth/AuthContext';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import { isApiConfigured } from '@/modules/shared/services/apiClient';
import {
  createCashflowApi,
  createDividendApi,
  createFinanceAccountApi,
  createFinanceTransactionApi,
  createFinanceTransferApi,
  createIpoAccountApi,
  createIpoEntryApi,
  createIpoEventApi,
  createNoteApi,
  createPortfolioApi,
  createTradeApi,
  createWatchlistItemApi,
  deleteCashflowApi,
  deleteDividendApi,
  deleteFinanceAccountApi,
  deleteFinanceTransactionApi,
  deleteIpoAccountApi,
  deleteIpoEntryApi,
  deleteIpoEventApi,
  deleteNoteApi,
  deletePortfolioApi,
  deleteTradeApi,
  deleteWatchlistItemApi,
  loadApiJournalSnapshot,
  reorderPortfoliosApi,
  updateCashflowApi,
  updateDividendApi,
  updateNoteApi,
  updatePortfolioApi,
  updateWatchlistItemApi,
  updateFinanceAccountApi,
  updateFinanceTransactionApi,
  updateIpoAccountApi,
  updateIpoEntryApi,
  updateIpoEventApi,
  updateTradeApi,
} from '@/modules/shared/services/journalApiService';
import { isMissingDatabaseSetupError } from '@/modules/shared/utils/errorMessages';
import { createAuditLogSafe } from '@/modules/admin/services/auditLogService';
import { buildFinanceOverview, getFinanceAccountBalance, getFinanceTransactionDelta, isTransferTransaction } from '@/modules/finance/utils/finance';
import type { FinanceAccount, FinanceTransaction } from '@/modules/finance/types/finance';
import type { IpoAccount, IpoEntry, IpoEvent } from '@/modules/ipo/types/ipo';
import { fetchQuotesBatch } from '@/modules/shared/services/yahooFinanceService';
import { buildIpoDomain } from '@/modules/shared/context/dataContextIpoDomain';
import { migrateDataToCurrentVersion } from '@/modules/shared/utils/dataMigration';
import { normalizeIpoCollections } from '@/modules/shared/context/dataContextIpoUtils';
import {
  cacheLocalData,
  hasStoredData,
  loadLocalData,
  normalizeSettings,
} from '@/modules/shared/context/dataContextStorageUtils';
import type { AppSettings, Portfolio } from '@/modules/shared/types/index';

const DataContext = createContext(null);
const DEFAULT_SETTINGS: AppSettings = {
  initialCapital: 10000000,
  monthlyTarget: 5,
  defaultBuyFee: 0.15,
  defaultSellFee: 0.25,
  initialCapitalUS: 1000,
  defaultBuyFeeUS: 0,
  defaultSellFeeUS: 0,
  selectedBrokerID: 'Custom',
  selectedBrokerUS: 'Custom',
  customStrategies: [
    'Breakout',
    'Swing Trading',
    'Scalping',
    'Value Investing',
    'Momentum',
    'Mean Reversion',
    'Follow Trend',
    'Lainnya'
  ],
  customEmotions: [
    { value: 'calm', label: 'Tenang' },
    { value: 'confident', label: 'Percaya Diri' },
    { value: 'fearful', label: 'Takut' },
    { value: 'greedy', label: 'Serakah' },
    { value: 'revenge', label: 'Revenge Trading' },
    { value: 'doubtful', label: 'Ragu-ragu' },
    { value: 'fomo', label: 'FOMO' },
    { value: 'neutral', label: 'Netral' }
  ],
  usdToIdrRate: 16200,
  defaultRiskPercent: 2,
  defaultTargetRR: 2,
  themePreference: 'system',
  logRetentionDays: 90,
  privacyMode: false,
  behaviorDailyTradeLimitEnabled: false,
  behaviorDailyTradeLimit: 3,
  behaviorNegativeEmotionWarning: true,
  behaviorBlockNegativeEmotion: false,
  behaviorRequireStrategy: false,
  behaviorRequireReason: false,
  behaviorMaxPositionSizeWarning: true,
  behaviorMaxPositionSizePercent: 20,
  behaviorDoubleConfirmExit: true,
  profileIncludedFinanceAccountIds: [],
};
const LOCAL_DATA_KEYS = ['trades', 'watchlist', 'notes', 'cashflows', 'dividends', 'settings', 'marketPrices', 'portfolios', 'tradingPlans', 'ipoEvents', 'ipoEntries', 'ipoAccounts', 'bsjpTrades', 'financeAccounts', 'financeTransactions'];

const DEFAULT_PORTFOLIO = {
  id: 'default',
  name: 'Portofolio Utama',
  isDefault: true,
  createdAt: new Date().toISOString(),
};

export function DataProvider({ children }) {
  const { user } = useAuth();
  const { can, roleLabel } = usePermissions();
  const userId = user?.id;

  const [allTrades, setAllTrades] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [notes, setNotes] = useState([]);
  const [allCashflows, setAllCashflows] = useState([]);
  const [allDividends, setAllDividends] = useState([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [marketPrices, setMarketPrices] = useState({});
  const [portfolios, setPortfolios] = useState<Portfolio[]>([DEFAULT_PORTFOLIO]);
  const [activePortfolioId, setActivePortfolioId] = useState(DEFAULT_PORTFOLIO.id);
  const [tradingPlans, setTradingPlans] = useState([]);
  const [ipoEvents, setIpoEvents] = useState<IpoEvent[]>([]);
  const [ipoEntries, setIpoEntries] = useState<IpoEntry[]>([]);
  const [ipoAccounts, setIpoAccounts] = useState<IpoAccount[]>([]);
  const [bsjpTrades, setBsjpTrades] = useState<any[]>([]);
  const [financeAccounts, setFinanceAccounts] = useState<FinanceAccount[]>([]);
  const [financeTransactions, setFinanceTransactions] = useState<FinanceTransaction[]>([]);
  const [toasts, setToasts] = useState([]);
  const [tradeFormDraft, setTradeFormDraft] = useState<any>(null);
  const [tradeEditDraft, setTradeEditDraft] = useState<any>(null);
  const [noteFormDraft, setNoteFormDraft] = useState<any>(null);
  const [watchlistFormDraft, setWatchlistFormDraft] = useState<any>(null);
  const [cashflowFormDraft, setCashflowFormDraft] = useState<any>(null);
  const [dividendFormDraft, setDividendFormDraft] = useState<any>(null);
  const [calculatorActiveTab, setCalculatorActiveTab] = useState<string>('pnl');
  const [calculatorDrafts, setCalculatorDrafts] = useState<any>({
    pnl: { buyPrice: '', sellPrice: '', lots: '', buyFee: '0.15', sellFee: '0.25' },
    fee: { price: '', lots: '', buyFeeP: '0.15', sellFeeP: '0.15', ppn: '11' },
    araarb: { referencePrice: '', simulationDays: '3' },
    avg: { purchases: [{ price: '', lots: '' }, { price: '', lots: '' }] },
    avgdown: { currentAvg: '', currentLots: '', currentPrice: '', targetAvg: '' },
    rr: { entry: '', stopLoss: '', takeProfit: '', lots: '1' },
    position: { capital: '', risk: '2', entry: '', stopLoss: '' },
    target: { buyPrice: '', targetPct: '', buyFee: '0.15', sellFee: '0.25' },
    compound: { principal: '10000000', rate: '5', months: '12' },
    pension: { currentAge: '25', retireAge: '55', monthlyExpense: '5000000', currentSavings: '10000000', inflationPercent: '4', returnPercent: '10', swrPercent: '4' },
    zakat: { goldPrice: '1400000', cash: '', gold: '', portfolio: '', business: '', receivables: '', debts: '' }
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [databaseSetupError, setDatabaseSetupError] = useState('');

  const applyData = useCallback((data) => {
    const normalizedIpo = normalizeIpoCollections(data.ipoEntries || [], data.ipoAccounts || []);
    setAllTrades(data.trades || []);
    setWatchlist(data.watchlist || []);
    setNotes(data.notes || []);
    setAllCashflows(data.cashflows || []);
    setAllDividends(data.dividends || []);
    setSettings(normalizeSettings(data.settings, DEFAULT_SETTINGS));
    setMarketPrices(data.marketPrices || {});
    setPortfolios(data.portfolios && data.portfolios.length > 0 ? data.portfolios : [DEFAULT_PORTFOLIO]);
    setTradingPlans(data.tradingPlans || []);
    setIpoEvents(data.ipoEvents || []);
    setIpoEntries(normalizedIpo.entries);
    setIpoAccounts(normalizedIpo.accounts);
    setBsjpTrades(data.bsjpTrades || []);
    setFinanceAccounts(data.financeAccounts || []);
    setFinanceTransactions(data.financeTransactions || []);
  }, []);

  const defaultPortfolioId = useMemo(
    () => portfolios.find((portfolio: any) => portfolio.isDefault)?.id || portfolios[0]?.id || DEFAULT_PORTFOLIO.id,
    [portfolios],
  );

  // Toast helper
  const showToast = useCallback((message, type = 'success') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const ensureWritable = useCallback(() => {
    if (can('journal:write')) return true;
    showToast(`Role ${roleLabel} hanya punya akses baca.`, 'error');
    return false;
  }, [can, roleLabel, showToast]);

  const logUserActivity = useCallback((action, targetType, targetId, metadata = {}) => {
    if (!userId) return;

    createAuditLogSafe({
      actorId: userId,
      action,
      targetType,
      targetId,
      metadata,
    });
  }, [userId]);

  // Active Portfolio state initialization
  useEffect(() => {
    if (userId) {
      setActivePortfolioId(getScopedItem('active_portfolio', userId) || DEFAULT_PORTFOLIO.id);
    } else {
      setActivePortfolioId(DEFAULT_PORTFOLIO.id);
    }
  }, [userId]);

  useEffect(() => {
    if (!portfolios.some((portfolio: any) => portfolio.id === activePortfolioId)) {
      setActivePortfolioId(defaultPortfolioId);
    }
  }, [activePortfolioId, defaultPortfolioId, portfolios]);

  const filteredTrades = useMemo(() => {
    return allTrades.filter(t => (t.portfolioId || defaultPortfolioId) === activePortfolioId);
  }, [allTrades, activePortfolioId, defaultPortfolioId]);

  const filteredCashflows = useMemo(() => {
    return allCashflows.filter(c => (c.portfolioId || defaultPortfolioId) === activePortfolioId);
  }, [allCashflows, activePortfolioId, defaultPortfolioId]);

  const filteredDividends = useMemo(() => {
    return allDividends.filter(d => (d.portfolioId || defaultPortfolioId) === activePortfolioId);
  }, [allDividends, activePortfolioId, defaultPortfolioId]);

  // Load user-scoped data (with one-time migration from global keys)
  useEffect(() => {
    if (!userId) {
      setAllTrades([]);
      setWatchlist([]);
      setNotes([]);
      setAllCashflows([]);
      setAllDividends([]);
      setSettings(DEFAULT_SETTINGS);
      setMarketPrices({});
      setPortfolios([DEFAULT_PORTFOLIO]);
      setTradingPlans([]);
      setIpoEvents([]);
      setIpoEntries([]);
      setIpoAccounts([]);
      setBsjpTrades([]);
      setFinanceAccounts([]);
      setFinanceTransactions([]);
      setDataLoading(false);
      return;
    }

    let cancelled = false;

    async function loadData() {
      const cachedLocalData = loadLocalData(userId, {
        defaultPortfolio: DEFAULT_PORTFOLIO,
        defaultSettings: DEFAULT_SETTINGS,
      });
      const hasCachedLocalData = hasStoredData(cachedLocalData, LOCAL_DATA_KEYS);
      const requiresApiRead = isApiConfigured;

      setDataLoading(true);
      setDataError('');
      setDatabaseSetupError('');
      try {
        migrateGlobalToUser(userId);
        migrateWorkspaceScopeToUserScope(userId);
        const localData = loadLocalData(userId, {
          defaultPortfolio: DEFAULT_PORTFOLIO,
          defaultSettings: DEFAULT_SETTINGS,
        });
        const apiSnapshot = requiresApiRead ? await loadApiJournalSnapshot() : {};
        const mergedData = {
          ...localData,
          ...apiSnapshot,
        };
        if (cancelled) return;
        applyData(mergedData);
        cacheLocalData(userId, mergedData, LOCAL_DATA_KEYS);
      } catch (error) {
        if (isMissingDatabaseSetupError(error)) {
          setDatabaseSetupError(error.message);
        } else {
          if (hasCachedLocalData && !requiresApiRead) {
            showToast(`Koneksi ke server gagal, memakai cache lokal: ${error.message}`, 'error');
          } else {
            setDataError(error.message);
            showToast(`Gagal memuat data: ${error.message}`, 'error');
          }
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [userId, showToast, applyData]);

  const persistData = useCallback((key, value) => {
    if (!userId) return;
    setScopedItem(key, userId, value);
  }, [userId]);

  const [initialPricesFetched, setInitialPricesFetched] = useState(false);

  const fetchLivePrices = useCallback(async (stockCodes: string[], force = false) => {
    if (!stockCodes || stockCodes.length === 0) return;
    try {
      console.log(`[DataContext] Auto-fetching live prices for tickers:`, stockCodes, `force:`, force);
      const quotes = await fetchQuotesBatch(stockCodes, 150, force);
      let updated = false;
      const pricesToMerge: Record<string, number> = {};
      for (const ticker of stockCodes) {
        if (quotes[ticker] && quotes[ticker].price != null) {
          pricesToMerge[ticker] = quotes[ticker].price;
          updated = true;
        }
      }
      if (updated) {
        setMarketPrices((prev) => {
          const next = { ...prev, ...pricesToMerge };
          persistData('marketPrices', next);
          return next;
        });
      }
    } catch (e) {
      console.error('[DataContext] Failed to auto-fetch live prices:', e);
    }
  }, [persistData]);

  useEffect(() => {
    if (!userId) {
      setInitialPricesFetched(false);
      return;
    }
    if (dataLoading || initialPricesFetched) return;

    const openTrades = allTrades.filter(t => !t.sellPrice || !t.dateSell);
    const tickers = Array.from(new Set(openTrades.map(t => t.stockCode).filter(Boolean)));
    if (tickers.length > 0) {
      fetchLivePrices(tickers);
      setInitialPricesFetched(true);
    }
  }, [dataLoading, userId, allTrades, fetchLivePrices, initialPricesFetched]);

  // Persist trades
  const saveTrades = useCallback((newTrades) => {
    setAllTrades(newTrades);
    persistData('trades', newTrades);
    return newTrades;
  }, [persistData]);

  // === TRADE CRUD ===
  const addTrade = (trade) => {
    if (!ensureWritable()) return null;
    if (isApiConfigured) {
      createTradeApi({
        ...trade,
        portfolioId: trade.portfolioId || activePortfolioId,
      })
        .then((createdTrade) => {
          if (!createdTrade) return;
          const updated = [createdTrade, ...allTrades];
          setAllTrades(updated);
          setScopedItem('trades', userId, updated);
          logUserActivity('trade.created', 'trade', createdTrade.id, {
            stockCode: createdTrade.stockCode,
            market: createdTrade.market || 'ID',
            portfolioId: createdTrade.portfolioId || defaultPortfolioId,
            dateBuy: createdTrade.dateBuy,
            isClosed: Boolean(createdTrade.sellPrice && createdTrade.dateSell),
          });
          showToast('Transaksi berhasil ditambahkan');
        })
        .catch((error) => {
          showToast(`Gagal menambah transaksi: ${error.message}`, 'error');
        });
      return null;
    }

    const newTrade = { 
      ...trade, 
      id: generateId(), 
      createdAt: new Date().toISOString(),
      portfolioId: activePortfolioId
    };
    const updated = [newTrade, ...allTrades];
    saveTrades(updated);
    logUserActivity('trade.created', 'trade', newTrade.id, {
      stockCode: newTrade.stockCode,
      market: newTrade.market || 'ID',
      portfolioId: newTrade.portfolioId || defaultPortfolioId,
      dateBuy: newTrade.dateBuy,
      isClosed: Boolean(newTrade.sellPrice && newTrade.dateSell),
    });
    showToast('Transaksi berhasil ditambahkan');
    return newTrade;
  };

  const updateTrade = (id, updates) => {
    if (!ensureWritable()) return;
    const existingTrade = allTrades.find(t => t.id === id);
    if (!existingTrade) return;
    if (isApiConfigured) {
      updateTradeApi(id, updates)
        .then((updatedTrade) => {
          if (!updatedTrade) return;
          const updated = allTrades.map(t => t.id === id ? updatedTrade : t);
          setAllTrades(updated);
          setScopedItem('trades', userId, updated);
          logUserActivity('trade.updated', 'trade', id, {
            stockCode: updatedTrade.stockCode || existingTrade.stockCode,
            market: updatedTrade.market || existingTrade.market || 'ID',
            portfolioId: updatedTrade.portfolioId || existingTrade.portfolioId || defaultPortfolioId,
            fieldsUpdated: Object.keys(updates || {}),
          });
          showToast('Transaksi berhasil diperbarui');
        })
        .catch((error) => {
          showToast(`Gagal memperbarui transaksi: ${error.message}`, 'error');
        });
      return;
    }

    const auditEntry = {
      editedBy: user?.email || 'User',
      editedAt: new Date().toISOString(),
      before: { ...existingTrade },
      after: { ...existingTrade, ...updates }
    };
    delete auditEntry.before.history;
    delete auditEntry.after.history;

    const updated = allTrades.map(t => t.id === id ? {
      ...t,
      ...updates,
      history: [...(t.history || []), auditEntry],
      updatedAt: new Date().toISOString()
    } : t);

    saveTrades(updated);
    logUserActivity('trade.updated', 'trade', id, {
      stockCode: updates.stockCode || existingTrade.stockCode,
      market: updates.market || existingTrade.market || 'ID',
      portfolioId: updates.portfolioId || existingTrade.portfolioId || defaultPortfolioId,
      fieldsUpdated: Object.keys(updates || {}),
    });
    showToast('Transaksi berhasil diperbarui');
  };

  const deleteTrade = (id) => {
    if (!ensureWritable()) return;
    const existingTrade = allTrades.find(t => t.id === id);
    if (isApiConfigured) {
      deleteTradeApi(id)
        .then(() => {
          const updated = allTrades.filter(t => t.id !== id);
          setAllTrades(updated);
          setScopedItem('trades', userId, updated);
          if (existingTrade) {
            logUserActivity('trade.deleted', 'trade', id, {
              stockCode: existingTrade.stockCode,
              market: existingTrade.market || 'ID',
              portfolioId: existingTrade.portfolioId || defaultPortfolioId,
            });
          }
          showToast('Transaksi berhasil dihapus');
        })
        .catch((error) => {
          showToast(`Gagal menghapus transaksi: ${error.message}`, 'error');
        });
      return;
    }

    const updated = allTrades.filter(t => t.id !== id);
    saveTrades(updated);
    if (existingTrade) {
      logUserActivity('trade.deleted', 'trade', id, {
        stockCode: existingTrade.stockCode,
        market: existingTrade.market || 'ID',
        portfolioId: existingTrade.portfolioId || defaultPortfolioId,
      });
    }
    showToast('Transaksi berhasil dihapus');
  };

  const updateTrades = (ids, updates) => {
    if (!ensureWritable()) return;
    if (isApiConfigured) {
      Promise.all(ids.map((id) => updateTradeApi(id, updates)))
        .then((updatedTradesFromApi) => {
          const tradeMap = new Map(updatedTradesFromApi.filter(Boolean).map((trade) => [trade.id, trade]));
          const updated = allTrades.map((trade) => tradeMap.get(trade.id) || trade);
          setAllTrades(updated);
          setScopedItem('trades', userId, updated);
          logUserActivity('trade.batch_updated', 'trade', ids.join(','), {
            count: ids.length,
            fieldsUpdated: Object.keys(updates || {}),
          });
          showToast(`${ids.length} transaksi berhasil diperbarui`);
        })
        .catch((error) => {
          showToast(`Gagal memperbarui batch transaksi: ${error.message}`, 'error');
        });
      return;
    }

    const { tagsAppend, ...otherUpdates } = updates as any;
    const updated = allTrades.map(t => {
      if (ids.includes(t.id)) {
        const finalUpdates = { ...otherUpdates };
        if (tagsAppend && Array.isArray(tagsAppend)) {
          const existingTags = t.tags || [];
          finalUpdates.tags = Array.from(new Set([...existingTags, ...tagsAppend]));
        }

        const auditEntry = {
          editedBy: user?.email || 'User',
          editedAt: new Date().toISOString(),
          before: { ...t },
          after: { ...t, ...finalUpdates }
        };
        delete auditEntry.before.history;
        delete auditEntry.after.history;

        return {
          ...t,
          ...finalUpdates,
          history: [...(t.history || []), auditEntry],
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });

    saveTrades(updated);
    logUserActivity('trade.batch_updated', 'trade', ids.join(','), {
      count: ids.length,
      fieldsUpdated: Object.keys(updates || {}),
    });
    showToast(`${ids.length} transaksi berhasil diperbarui`);
  };

  const deleteTrades = (ids) => {
    if (!ensureWritable()) return;
    if (isApiConfigured) {
      Promise.all(ids.map((id) => deleteTradeApi(id)))
        .then(() => {
          const updated = allTrades.filter(t => !ids.includes(t.id));
          setAllTrades(updated);
          setScopedItem('trades', userId, updated);
          logUserActivity('trade.batch_deleted', 'trade', ids.join(','), {
            count: ids.length,
          });
          showToast(`${ids.length} transaksi berhasil dihapus`);
        })
        .catch((error) => {
          showToast(`Gagal menghapus batch transaksi: ${error.message}`, 'error');
        });
      return;
    }

    const updated = allTrades.filter(t => !ids.includes(t.id));
    saveTrades(updated);
    logUserActivity('trade.batch_deleted', 'trade', ids.join(','), {
      count: ids.length,
    });
    showToast(`${ids.length} transaksi berhasil dihapus`);
  };

  const getTradeById = (id) => allTrades.find(t => t.id === id);

  // === WATCHLIST CRUD ===
  const addWatchlistItem = (item) => {
    if (!ensureWritable()) return;
    if (isApiConfigured) {
      createWatchlistItemApi(item)
        .then((createdItem) => {
          if (!createdItem) return;
          const updated = [createdItem, ...watchlist];
          setWatchlist(updated);
          setScopedItem('watchlist', userId, updated);
          logUserActivity('watchlist.created', 'watchlist_item', createdItem.id, {
            stockCode: createdItem.stockCode || null,
            market: createdItem.market || 'ID',
          });
          showToast('Item watchlist ditambahkan');
        })
        .catch((error) => {
          showToast(`Gagal menambah watchlist: ${error.message}`, 'error');
        });
      return;
    }

    const newItem = { ...item, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newItem, ...watchlist];
    setWatchlist(updated);
    persistData('watchlist', updated);
    logUserActivity('watchlist.created', 'watchlist_item', newItem.id, {
      stockCode: newItem.stockCode || null,
      market: newItem.market || 'ID',
    });
    showToast('Item watchlist ditambahkan');
  };

  const updateWatchlistItem = (id, updates) => {
    if (!ensureWritable()) return;
    const existingItem = watchlist.find(w => w.id === id);
    if (isApiConfigured) {
      updateWatchlistItemApi(id, updates)
        .then((updatedItem) => {
          if (!updatedItem) return;
          const updated = watchlist.map(w => w.id === id ? updatedItem : w);
          setWatchlist(updated);
          setScopedItem('watchlist', userId, updated);
          if (existingItem) {
            logUserActivity('watchlist.updated', 'watchlist_item', id, {
              stockCode: updatedItem.stockCode || existingItem.stockCode || null,
              market: updatedItem.market || existingItem.market || 'ID',
              fieldsUpdated: Object.keys(updates || {}),
            });
          }
        })
        .catch((error) => {
          showToast(`Gagal memperbarui watchlist: ${error.message}`, 'error');
        });
      return;
    }

    const updated = watchlist.map(w => w.id === id ? { ...w, ...updates } : w);
    setWatchlist(updated);
    persistData('watchlist', updated);
    if (existingItem) {
      logUserActivity('watchlist.updated', 'watchlist_item', id, {
        stockCode: updates.stockCode || existingItem.stockCode || null,
        market: updates.market || existingItem.market || 'ID',
        fieldsUpdated: Object.keys(updates || {}),
      });
    }
  };

  const deleteWatchlistItem = (id) => {
    if (!ensureWritable()) return;
    const existingItem = watchlist.find(w => w.id === id);
    if (isApiConfigured) {
      deleteWatchlistItemApi(id)
        .then(() => {
          const updated = watchlist.filter(w => w.id !== id);
          setWatchlist(updated);
          setScopedItem('watchlist', userId, updated);
          if (existingItem) {
            logUserActivity('watchlist.deleted', 'watchlist_item', id, {
              stockCode: existingItem.stockCode || null,
              market: existingItem.market || 'ID',
            });
          }
          showToast('Item watchlist dihapus');
        })
        .catch((error) => {
          showToast(`Gagal menghapus watchlist: ${error.message}`, 'error');
        });
      return;
    }

    const updated = watchlist.filter(w => w.id !== id);
    setWatchlist(updated);
    persistData('watchlist', updated);
    if (existingItem) {
      logUserActivity('watchlist.deleted', 'watchlist_item', id, {
        stockCode: existingItem.stockCode || null,
        market: existingItem.market || 'ID',
      });
    }
    showToast('Item watchlist dihapus');
  };

  // === NOTES CRUD ===
  const addNote = (note) => {
    if (!ensureWritable()) return;
    if (isApiConfigured) {
      createNoteApi(note)
        .then((createdNote) => {
          if (!createdNote) return;
          const updated = [createdNote, ...notes];
          setNotes(updated);
          setScopedItem('notes', userId, updated);
          logUserActivity('note.created', 'note', createdNote.id, {
            title: createdNote.title || null,
          });
          showToast('Catatan disimpan');
        })
        .catch((error) => {
          showToast(`Gagal menyimpan catatan: ${error.message}`, 'error');
        });
      return;
    }

    const newNote = { ...note, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newNote, ...notes];
    setNotes(updated);
    persistData('notes', updated);
    logUserActivity('note.created', 'note', newNote.id, {
      title: newNote.title || null,
    });
    showToast('Catatan disimpan');
  };

  const updateNote = (id, updates) => {
    if (!ensureWritable()) return;
    const existingNote = notes.find(n => n.id === id);
    if (isApiConfigured) {
      updateNoteApi(id, updates)
        .then((updatedNote) => {
          if (!updatedNote) return;
          const updated = notes.map(n => n.id === id ? updatedNote : n);
          setNotes(updated);
          setScopedItem('notes', userId, updated);
          if (existingNote) {
            logUserActivity('note.updated', 'note', id, {
              title: updatedNote.title || existingNote.title || null,
              fieldsUpdated: Object.keys(updates || {}),
            });
          }
        })
        .catch((error) => {
          showToast(`Gagal memperbarui catatan: ${error.message}`, 'error');
        });
      return;
    }

    const updated = notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n);
    setNotes(updated);
    persistData('notes', updated);
    if (existingNote) {
      logUserActivity('note.updated', 'note', id, {
        title: updates.title || existingNote.title || null,
        fieldsUpdated: Object.keys(updates || {}),
      });
    }
  };

  const deleteNote = (id) => {
    if (!ensureWritable()) return;
    const existingNote = notes.find(n => n.id === id);
    if (isApiConfigured) {
      deleteNoteApi(id)
        .then(() => {
          const updated = notes.filter(n => n.id !== id);
          setNotes(updated);
          setScopedItem('notes', userId, updated);
          if (existingNote) {
            logUserActivity('note.deleted', 'note', id, {
              title: existingNote.title || null,
            });
          }
          showToast('Catatan dihapus');
        })
        .catch((error) => {
          showToast(`Gagal menghapus catatan: ${error.message}`, 'error');
        });
      return;
    }

    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    persistData('notes', updated);
    if (existingNote) {
      logUserActivity('note.deleted', 'note', id, {
        title: existingNote.title || null,
      });
    }
    showToast('Catatan dihapus');
  };

  const createCashflowRecord = useCallback((cf, options: any = {}) => {
    const {
      portfolioId = activePortfolioId,
      silent = false,
      action = 'cashflow.created',
      logMetadata = {},
    } = options;

    const newCf = {
      ...cf,
      id: generateId(),
      createdAt: new Date().toISOString(),
      portfolioId,
    };
    const updated = [newCf, ...allCashflows];
    setAllCashflows(updated);
    persistData('cashflows', updated);
    logUserActivity(action, 'cashflow', newCf.id, {
      type: newCf.type || null,
      amount: newCf.amount || null,
      market: newCf.market || 'ID',
      portfolioId: newCf.portfolioId || defaultPortfolioId,
      ...logMetadata,
    });
    if (!silent) {
      showToast('Transaksi kas berhasil dicatat');
    }
    return newCf;
  }, [activePortfolioId, allCashflows, logUserActivity, persistData, showToast]);

  const updateCashflowRecord = useCallback((id, updates, options: any = {}) => {
    const {
      silent = false,
      action = 'cashflow.updated',
      logMetadata = {},
    } = options;
    const existingCashflow = allCashflows.find(c => c.id === id);
    if (!existingCashflow) return null;

    const updated = allCashflows.map(c =>
      c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
    );
    const updatedItem = updated.find(c => c.id === id) || null;
    setAllCashflows(updated);
    persistData('cashflows', updated);
    logUserActivity(action, 'cashflow', id, {
      type: updates.type || existingCashflow.type || null,
      amount: updates.amount ?? existingCashflow.amount ?? null,
      market: updates.market || existingCashflow.market || 'ID',
      portfolioId: updates.portfolioId || existingCashflow.portfolioId || defaultPortfolioId,
      fieldsUpdated: Object.keys(updates || {}),
      ...logMetadata,
    });
    if (!silent) {
      showToast('Transaksi kas berhasil diperbarui');
    }
    return updatedItem;
  }, [allCashflows, logUserActivity, persistData, showToast]);

  const deleteCashflowRecord = useCallback((id, options: any = {}) => {
    const {
      silent = false,
      action = 'cashflow.deleted',
      logMetadata = {},
    } = options;
    const existingCashflow = allCashflows.find(c => c.id === id);
    if (!existingCashflow) return null;

    const updated = allCashflows.filter(c => c.id !== id);
    setAllCashflows(updated);
    persistData('cashflows', updated);
    logUserActivity(action, 'cashflow', id, {
      type: existingCashflow.type || null,
      amount: existingCashflow.amount || null,
      market: existingCashflow.market || 'ID',
      portfolioId: existingCashflow.portfolioId || defaultPortfolioId,
      ...logMetadata,
    });
    if (!silent) {
      showToast('Transaksi kas dibatalkan');
    }
    return existingCashflow;
  }, [allCashflows, logUserActivity, persistData, showToast]);

  // === CASHFLOW CRUD ===
  const addCashflow = (cf) => {
    if (!ensureWritable()) return null;
    if (isApiConfigured) {
      createCashflowApi({
        ...cf,
        portfolioId: cf.portfolioId || activePortfolioId,
      })
        .then((createdCashflow) => {
          if (!createdCashflow) return;
          const updated = [createdCashflow, ...allCashflows];
          setAllCashflows(updated);
          setScopedItem('cashflows', userId, updated);
          logUserActivity('cashflow.created', 'cashflow', createdCashflow.id, {
            type: createdCashflow.type || null,
            amount: createdCashflow.amount || null,
            market: createdCashflow.market || 'ID',
            portfolioId: createdCashflow.portfolioId || defaultPortfolioId,
          });
          showToast('Transaksi kas berhasil dicatat');
        })
        .catch((error) => {
          showToast(`Gagal mencatat transaksi kas: ${error.message}`, 'error');
        });
      return null;
    }

    return createCashflowRecord(cf);
  };

  const updateCashflow = (id, updates) => {
    if (!ensureWritable()) return null;
    if (isApiConfigured) {
      updateCashflowApi(id, updates)
        .then((updatedCashflow) => {
          if (!updatedCashflow) return;
          const existingCashflow = allCashflows.find(c => c.id === id);
          const updated = allCashflows.map(c => c.id === id ? updatedCashflow : c);
          setAllCashflows(updated);
          setScopedItem('cashflows', userId, updated);
          if (existingCashflow) {
            logUserActivity('cashflow.updated', 'cashflow', id, {
              type: updatedCashflow.type || existingCashflow.type || null,
              amount: updatedCashflow.amount ?? existingCashflow.amount ?? null,
              market: updatedCashflow.market || existingCashflow.market || 'ID',
              portfolioId: updatedCashflow.portfolioId || existingCashflow.portfolioId || defaultPortfolioId,
              fieldsUpdated: Object.keys(updates || {}),
            });
          }
          showToast('Transaksi kas berhasil diperbarui');
        })
        .catch((error) => {
          showToast(`Gagal memperbarui transaksi kas: ${error.message}`, 'error');
        });
      return null;
    }

    return updateCashflowRecord(id, updates);
  };

  const deleteCashflow = (id) => {
    if (!ensureWritable()) return null;
    if (isApiConfigured) {
      const existingCashflow = allCashflows.find(c => c.id === id);
      deleteCashflowApi(id)
        .then(() => {
          const updated = allCashflows.filter(c => c.id !== id);
          setAllCashflows(updated);
          setScopedItem('cashflows', userId, updated);
          if (existingCashflow) {
            logUserActivity('cashflow.deleted', 'cashflow', id, {
              type: existingCashflow.type || null,
              amount: existingCashflow.amount || null,
              market: existingCashflow.market || 'ID',
              portfolioId: existingCashflow.portfolioId || defaultPortfolioId,
            });
          }
          showToast('Transaksi kas dibatalkan');
        })
        .catch((error) => {
          showToast(`Gagal menghapus transaksi kas: ${error.message}`, 'error');
        });
      return null;
    }

    return deleteCashflowRecord(id);
  };

  const saveFinanceAccounts = useCallback((nextAccounts) => {
    setFinanceAccounts(nextAccounts);
    persistData('financeAccounts', nextAccounts);
    return nextAccounts;
  }, [persistData]);

  const saveFinanceTransactions = useCallback((nextTransactions) => {
    setFinanceTransactions(nextTransactions);
    persistData('financeTransactions', nextTransactions);
    return nextTransactions;
  }, [persistData]);

  const buildCashflowPayloadFromFinanceTransaction = useCallback((transaction) => {
    const delta = getFinanceTransactionDelta(transaction);
    const syncMode = transaction.cashflowSyncMode || 'mirror';
    const normalizedAmount = Math.abs(Number(transaction.amount) || 0);

    if (syncMode === 'transfer_to_portfolio') {
      return {
        type: 'deposit',
        amount: normalizedAmount,
        date: transaction.date,
        notes: transaction.description || 'Transfer dari finance tracker ke dompet trading',
        market: 'ID',
        linkedFinanceTransactionId: transaction.id,
      };
    }

    if (syncMode === 'transfer_from_portfolio') {
      return {
        type: 'withdraw',
        amount: normalizedAmount,
        date: transaction.date,
        notes: transaction.description || 'Transfer dari dompet trading ke finance tracker',
        market: 'ID',
        linkedFinanceTransactionId: transaction.id,
      };
    }

    return {
      type: delta >= 0 ? 'deposit' : 'withdraw',
      amount: Math.abs(delta),
      date: transaction.date,
      notes: transaction.description || 'Finance tracker linkage',
      market: 'ID',
      linkedFinanceTransactionId: transaction.id,
    };
  }, []);

  const upsertLinkedCashflowForFinanceTransaction = useCallback((transaction) => {
    if (!transaction.linkedPortfolioId) return transaction;

    const payload = buildCashflowPayloadFromFinanceTransaction(transaction);
    if (transaction.linkedCashflowId) {
      updateCashflowRecord(transaction.linkedCashflowId, payload, {
        silent: true,
        action: 'cashflow.synced_from_finance',
        logMetadata: { source: 'finance_tracker' },
      });
      return transaction;
    }

    const linkedCashflow = createCashflowRecord(payload, {
      portfolioId: transaction.linkedPortfolioId,
      silent: true,
      action: 'cashflow.synced_from_finance',
      logMetadata: { source: 'finance_tracker' },
    });
    return linkedCashflow
      ? { ...transaction, linkedCashflowId: linkedCashflow.id }
      : transaction;
  }, [buildCashflowPayloadFromFinanceTransaction, createCashflowRecord, updateCashflowRecord]);

  const removeLinkedCashflowForFinanceTransaction = useCallback((transaction) => {
    if (!transaction?.linkedCashflowId) return;
    deleteCashflowRecord(transaction.linkedCashflowId, {
      silent: true,
      action: 'cashflow.deleted_from_finance',
      logMetadata: { source: 'finance_tracker' },
    });
  }, [deleteCashflowRecord]);

  const getFinanceTransactionsByAccount = useCallback((accountId: string) => {
    return financeTransactions.filter((item: any) => item.accountId === accountId);
  }, [financeTransactions]);

  const getFinanceAccountCurrentBalance = useCallback((accountId: string) => {
    const account = financeAccounts.find((item: any) => item.id === accountId);
    if (!account) return 0;
    return getFinanceAccountBalance(account, financeTransactions);
  }, [financeAccounts, financeTransactions]);

  const getFinanceSummary = useCallback(() => {
    return buildFinanceOverview(financeAccounts, financeTransactions);
  }, [financeAccounts, financeTransactions]);

  // === FINANCE ACCOUNTS CRUD ===
  const addFinanceAccount = (account) => {
    if (!ensureWritable()) return null;
    if (isApiConfigured) {
      createFinanceAccountApi(account)
        .then((createdAccount) => {
          if (!createdAccount) return;
          const updatedAccounts = [createdAccount, ...financeAccounts];
          setFinanceAccounts(updatedAccounts);
          setScopedItem('financeAccounts', userId, updatedAccounts);
          logUserActivity('finance_account.created', 'finance_account', createdAccount.id, {
            type: createdAccount.type,
            institutionName: createdAccount.institutionName || null,
          });
          showToast('Rekening berhasil ditambahkan');
        })
        .catch((error) => {
          showToast(`Gagal menambah rekening: ${error.message}`, 'error');
        });
      return null;
    }

    const newAccount = {
      ...account,
      id: generateId(),
      currency: 'IDR',
      openingBalance: Number(account.openingBalance) || 0,
      isActive: account.isActive ?? true,
      createdAt: new Date().toISOString(),
    };
    saveFinanceAccounts([newAccount, ...financeAccounts]);
    logUserActivity('finance_account.created', 'finance_account', newAccount.id, {
      type: newAccount.type,
      institutionName: newAccount.institutionName || null,
    });
    showToast('Rekening berhasil ditambahkan');
    return newAccount;
  };

  const updateFinanceAccount = (id, updates) => {
    if (!ensureWritable()) return null;
    const existingAccount = financeAccounts.find((item: any) => item.id === id);
    if (!existingAccount) return null;
    if (isApiConfigured) {
      updateFinanceAccountApi(id, updates)
        .then((updatedAccount) => {
          if (!updatedAccount) return;
          const updatedAccounts = financeAccounts.map((item: any) => item.id === id ? updatedAccount : item);
          setFinanceAccounts(updatedAccounts);
          setScopedItem('financeAccounts', userId, updatedAccounts);
          logUserActivity('finance_account.updated', 'finance_account', id, {
            fieldsUpdated: Object.keys(updates || {}),
            type: updatedAccount?.type || existingAccount.type,
          });
          showToast('Rekening berhasil diperbarui');
        })
        .catch((error) => {
          showToast(`Gagal memperbarui rekening: ${error.message}`, 'error');
        });
      return null;
    }

    const updatedAccounts = financeAccounts.map((item: any) => (
      item.id === id
        ? {
            ...item,
            ...updates,
            openingBalance: updates.openingBalance != null ? Number(updates.openingBalance) || 0 : item.openingBalance,
            updatedAt: new Date().toISOString(),
          }
        : item
    ));
    const updatedAccount = updatedAccounts.find((item: any) => item.id === id) || null;
    saveFinanceAccounts(updatedAccounts);
    logUserActivity('finance_account.updated', 'finance_account', id, {
      fieldsUpdated: Object.keys(updates || {}),
      type: updatedAccount?.type || existingAccount.type,
    });
    showToast('Rekening berhasil diperbarui');
    return updatedAccount;
  };

  const toggleFinanceAccountActive = (id) => {
    if (!ensureWritable()) return null;
    const account = financeAccounts.find((item: any) => item.id === id);
    if (!account) return null;
    return updateFinanceAccount(id, { isActive: !account.isActive });
  };

  const reorderFinanceAccounts = (orderedIds: string[]) => {
    if (!ensureWritable()) return null;
    const orderMap = new Map(orderedIds.map((itemId, index) => [itemId, index]));
    const updatedAccounts = [...financeAccounts].sort((left: any, right: any) => {
      const leftIndex = orderMap.get(left.id);
      const rightIndex = orderMap.get(right.id);
      if (leftIndex == null && rightIndex == null) return 0;
      if (leftIndex == null) return 1;
      if (rightIndex == null) return -1;
      return leftIndex - rightIndex;
    });
    saveFinanceAccounts(updatedAccounts);
    showToast('Urutan rekening berhasil diperbarui');
    return updatedAccounts;
  };

  const deleteFinanceAccount = (id) => {
    if (!ensureWritable()) return null;
    const existingAccount = financeAccounts.find((item: any) => item.id === id);
    if (!existingAccount) return null;
    if (isApiConfigured) {
      const transactionIdsToDelete = new Set(
        financeTransactions
          .filter((item: any) => item.accountId === id || item.counterpartyAccountId === id)
          .map((item: any) => item.id),
      );
      const linkedCashflowIds = financeTransactions
        .filter((item: any) => item.accountId === id || item.counterpartyAccountId === id)
        .map((item: any) => item.linkedCashflowId)
        .filter(Boolean);

      deleteFinanceAccountApi(id)
        .then(() => {
          const updatedTransactions = financeTransactions.filter((item: any) => !transactionIdsToDelete.has(item.id));
          setFinanceTransactions(updatedTransactions);
          setScopedItem('financeTransactions', userId, updatedTransactions);

          const updatedAccounts = financeAccounts.filter((item: any) => item.id !== id);
          setFinanceAccounts(updatedAccounts);
          setScopedItem('financeAccounts', userId, updatedAccounts);

          if (linkedCashflowIds.length > 0) {
            const updatedCashflows = allCashflows.filter((cashflow: any) => !linkedCashflowIds.includes(cashflow.id));
            setAllCashflows(updatedCashflows);
            setScopedItem('cashflows', userId, updatedCashflows);
          }

          const linkedPortfolioCount = portfolios.filter((portfolio: any) => portfolio.financeAccountId === id).length;
          if (linkedPortfolioCount > 0) {
            const updatedPortfolios = portfolios.map((portfolio: any) => (
              portfolio.financeAccountId === id
                ? { ...portfolio, financeAccountId: '' }
                : portfolio
            ));
            setPortfolios(updatedPortfolios);
            setScopedItem('portfolios', userId, updatedPortfolios);
          }

          logUserActivity('finance_account.deleted', 'finance_account', id, {
            type: existingAccount.type,
            institutionName: existingAccount.institutionName || null,
            deletedTransactionCount: transactionIdsToDelete.size,
          });
          showToast('Rekening finance berhasil dihapus permanen');
        })
        .catch((error) => {
          showToast(`Gagal menghapus rekening: ${error.message}`, 'error');
        });
      return null;
    }

    const directTransactions = financeTransactions.filter((item: any) => item.accountId === id);
    const transferGroupIds = Array.from(
      new Set(
        directTransactions
          .map((item: any) => item.transferGroupId)
          .filter(Boolean)
      )
    );
    const transactionIdsToDelete = new Set(
      financeTransactions
        .filter((item: any) => item.accountId === id || (item.transferGroupId && transferGroupIds.includes(item.transferGroupId)))
        .map((item: any) => item.id)
    );

    financeTransactions
      .filter((item: any) => transactionIdsToDelete.has(item.id))
      .forEach((item: any) => removeLinkedCashflowForFinanceTransaction(item));

    const updatedTransactions = financeTransactions.filter((item: any) => !transactionIdsToDelete.has(item.id));
    saveFinanceTransactions(updatedTransactions);

    const updatedAccounts = financeAccounts.filter((item: any) => item.id !== id);
    saveFinanceAccounts(updatedAccounts);

    const linkedPortfolioCount = portfolios.filter((portfolio: any) => portfolio.financeAccountId === id).length;
    if (linkedPortfolioCount > 0) {
      const updatedPortfolios = portfolios.map((portfolio: any) => (
        portfolio.financeAccountId === id
          ? { ...portfolio, financeAccountId: '' }
          : portfolio
      ));
      setPortfolios(updatedPortfolios);
      persistData('portfolios', updatedPortfolios);
    }

    logUserActivity('finance_account.deleted', 'finance_account', id, {
      type: existingAccount.type,
      institutionName: existingAccount.institutionName || null,
      deletedTransactionCount: transactionIdsToDelete.size,
      unlinkedPortfolioCount: linkedPortfolioCount,
    });
    showToast('Rekening finance berhasil dihapus permanen');
    return existingAccount;
  };

  // === FINANCE TRANSACTIONS CRUD ===
  const addFinanceTransaction = (transaction) => {
    if (!ensureWritable()) return null;
    const normalizedAmount = transaction.type === 'adjustment'
      ? Number(transaction.amount) || 0
      : Math.abs(Number(transaction.amount) || 0);
    const isDepositRdn = transaction.category && transaction.category.trim().toLowerCase() === 'deposit rdn';
    const isWithdrawRdn = transaction.category && transaction.category.trim().toLowerCase() === 'withdraw rdn';
    const isRdnSync = isDepositRdn || isWithdrawRdn;
    const rdnSyncMode = isDepositRdn ? 'transfer_to_portfolio' : 'transfer_from_portfolio';

    const baseTransaction = {
      ...transaction,
      id: generateId(),
      amount: normalizedAmount,
      cashflowSyncMode: isRdnSync ? rdnSyncMode : (transaction.linkToCashflow ? (transaction.cashflowSyncMode || 'mirror') : undefined),
      linkedPortfolioId: isRdnSync ? transaction.linkedPortfolioId || activePortfolioId || defaultPortfolioId : (transaction.linkToCashflow ? transaction.linkedPortfolioId || activePortfolioId : undefined),
      linkToCashflow: isRdnSync ? true : transaction.linkToCashflow,
      linkedCashflowId: undefined,
      createdAt: new Date().toISOString(),
    };
    const finalTransaction = (baseTransaction.linkToCashflow || isRdnSync)
      ? upsertLinkedCashflowForFinanceTransaction(baseTransaction)
      : baseTransaction;

    if (isApiConfigured) {
      const createTransaction = async () => {
        let linkedCashflow = null;

        if (baseTransaction.linkToCashflow || isRdnSync) {
          const cashflowPayload = buildCashflowPayloadFromFinanceTransaction(baseTransaction);
          delete cashflowPayload.linkedFinanceTransactionId; // Prevent invalid UUID error in DB

          linkedCashflow = await createCashflowApi({
            ...cashflowPayload,
            portfolioId: baseTransaction.linkedPortfolioId || activePortfolioId,
          });
        }

        try {
          const createdTransaction = await createFinanceTransactionApi({
            ...baseTransaction,
            linkedCashflowId: linkedCashflow?.id,
            linkedPortfolioId: linkedCashflow ? baseTransaction.linkedPortfolioId : undefined,
            cashflowSyncMode: linkedCashflow ? baseTransaction.cashflowSyncMode : undefined,
          });
          if (!createdTransaction) return null;

          const nextTransaction = linkedCashflow
            ? { ...createdTransaction, linkedCashflowId: linkedCashflow.id }
            : createdTransaction;
          const updatedTransactions = [nextTransaction, ...financeTransactions];
          setFinanceTransactions(updatedTransactions);
          setScopedItem('financeTransactions', userId, updatedTransactions);

          if (linkedCashflow) {
            const updatedCashflows = [linkedCashflow, ...allCashflows];
            setAllCashflows(updatedCashflows);
            setScopedItem('cashflows', userId, updatedCashflows);
          }

          logUserActivity('finance_transaction.created', 'finance_transaction', nextTransaction.id, {
            accountId: nextTransaction.accountId,
            type: nextTransaction.type,
            amount: nextTransaction.amount,
            linkedCashflowId: nextTransaction.linkedCashflowId || null,
          });
          showToast('Transaksi finance berhasil dicatat');
          return nextTransaction;
        } catch (error) {
          if (linkedCashflow?.id) {
            await deleteCashflowApi(linkedCashflow.id).catch(() => undefined);
          }
          throw error;
        }
      };

      createTransaction().catch((error) => {
        showToast(`Gagal mencatat transaksi finance: ${error.message}`, 'error');
      });
      return null;
    }

    saveFinanceTransactions([finalTransaction, ...financeTransactions]);
    logUserActivity('finance_transaction.created', 'finance_transaction', finalTransaction.id, {
      accountId: finalTransaction.accountId,
      type: finalTransaction.type,
      amount: finalTransaction.amount,
      linkedCashflowId: finalTransaction.linkedCashflowId || null,
    });
    showToast('Transaksi finance berhasil dicatat');
    return finalTransaction;
  };

  const updateFinanceTransaction = (id, updates) => {
    if (!ensureWritable()) return null;
    const existingTransaction = financeTransactions.find((item: any) => item.id === id);
    if (!existingTransaction) return null;

    if (isTransferTransaction(existingTransaction.type)) {
      showToast('Transfer internal belum bisa diedit. Hapus lalu buat ulang jika perlu perubahan.', 'error');
      return null;
    }

    const nextType = updates.type || existingTransaction.type;
    const nextCategory = updates.category !== undefined ? updates.category : existingTransaction.category;
    const isDepositRdn = nextCategory && nextCategory.trim().toLowerCase() === 'deposit rdn';
    const isWithdrawRdn = nextCategory && nextCategory.trim().toLowerCase() === 'withdraw rdn';
    const isRdnSync = isDepositRdn || isWithdrawRdn;
    const rdnSyncMode = isDepositRdn ? 'transfer_to_portfolio' : 'transfer_from_portfolio';

    const normalizedAmount = updates.amount != null
      ? (nextType === 'adjustment' ? Number(updates.amount) || 0 : Math.abs(Number(updates.amount) || 0))
      : existingTransaction.amount;
    const wantsLink = isRdnSync ? true : (updates.linkToCashflow != null
      ? updates.linkToCashflow
      : Boolean(existingTransaction.linkedCashflowId));
    const linkedPortfolioId = wantsLink
      ? (updates.linkedPortfolioId || existingTransaction.linkedPortfolioId || activePortfolioId)
      : undefined;
    const cashflowSyncMode = wantsLink
      ? (isRdnSync ? rdnSyncMode : (updates.cashflowSyncMode || existingTransaction.cashflowSyncMode || 'mirror'))
      : undefined;

    let updatedTransaction = {
      ...existingTransaction,
      ...updates,
      amount: normalizedAmount,
      linkedPortfolioId,
      cashflowSyncMode,
      linkToCashflow: wantsLink,
      updatedAt: new Date().toISOString(),
    };

    if (wantsLink) {
      updatedTransaction = upsertLinkedCashflowForFinanceTransaction(updatedTransaction);
    } else if (existingTransaction.linkedCashflowId) {
      removeLinkedCashflowForFinanceTransaction(existingTransaction);
      updatedTransaction = {
        ...updatedTransaction,
        linkedCashflowId: undefined,
        linkedPortfolioId: undefined,
      };
    }

    if (isApiConfigured) {
      const updateTransaction = async () => {
        let linkedCashflowId = updatedTransaction.linkedCashflowId;

        if (wantsLink) {
          const cashflowPayload = buildCashflowPayloadFromFinanceTransaction(updatedTransaction);
          delete cashflowPayload.linkedFinanceTransactionId; // Prevent invalid UUID error in DB
          
          const fullCashflowPayload = {
            ...cashflowPayload,
            portfolioId: linkedPortfolioId,
          };
          if (existingTransaction.linkedCashflowId) {
            const updatedCashflow = await updateCashflowApi(existingTransaction.linkedCashflowId, fullCashflowPayload);
            linkedCashflowId = updatedCashflow?.id || existingTransaction.linkedCashflowId;
            if (updatedCashflow) {
              const updatedCashflows = allCashflows.map((item: any) => item.id === updatedCashflow.id ? updatedCashflow : item);
              setAllCashflows(updatedCashflows);
              setScopedItem('cashflows', userId, updatedCashflows);
            }
          } else {
            const createdCashflow = await createCashflowApi(fullCashflowPayload);
            linkedCashflowId = createdCashflow?.id;
            if (createdCashflow) {
              const updatedCashflows = [createdCashflow, ...allCashflows];
              setAllCashflows(updatedCashflows);
              setScopedItem('cashflows', userId, updatedCashflows);
            }
          }
        } else if (existingTransaction.linkedCashflowId) {
          await deleteCashflowApi(existingTransaction.linkedCashflowId).catch(() => undefined);
          const updatedCashflows = allCashflows.filter((item: any) => item.id !== existingTransaction.linkedCashflowId);
          setAllCashflows(updatedCashflows);
          setScopedItem('cashflows', userId, updatedCashflows);
        }

        const apiUpdatedTransaction = await updateFinanceTransactionApi(id, {
          ...updates,
          linkedCashflowId: linkedCashflowId || null,
          linkedPortfolioId: wantsLink ? linkedPortfolioId : null,
          cashflowSyncMode: wantsLink ? cashflowSyncMode : null,
        });
        if (!apiUpdatedTransaction) return null;

        const updatedTransactions = financeTransactions.map((item: any) => item.id === id ? apiUpdatedTransaction : item);
        setFinanceTransactions(updatedTransactions);
        setScopedItem('financeTransactions', userId, updatedTransactions);
        logUserActivity('finance_transaction.updated', 'finance_transaction', id, {
          accountId: apiUpdatedTransaction.accountId,
          type: apiUpdatedTransaction.type,
          fieldsUpdated: Object.keys(updates || {}),
          linkedCashflowId: apiUpdatedTransaction.linkedCashflowId || null,
        });
        showToast('Transaksi finance berhasil diperbarui');
        return apiUpdatedTransaction;
      };

      updateTransaction().catch((error) => {
        showToast(`Gagal memperbarui transaksi finance: ${error.message}`, 'error');
      });
      return null;
    }

    const updatedTransactions = financeTransactions.map((item: any) => item.id === id ? updatedTransaction : item);
    saveFinanceTransactions(updatedTransactions);
    logUserActivity('finance_transaction.updated', 'finance_transaction', id, {
      accountId: updatedTransaction.accountId,
      type: updatedTransaction.type,
      fieldsUpdated: Object.keys(updates || {}),
      linkedCashflowId: updatedTransaction.linkedCashflowId || null,
    });
    showToast('Transaksi finance berhasil diperbarui');
    return updatedTransaction;
  };

  const deleteFinanceTransaction = (id) => {
    if (!ensureWritable()) return null;
    const existingTransaction = financeTransactions.find((item: any) => item.id === id);
    if (!existingTransaction) return null;

    if (isApiConfigured) {
      const idsToDelete = existingTransaction.transferGroupId
        ? financeTransactions
            .filter((item: any) => item.transferGroupId === existingTransaction.transferGroupId)
            .map((item: any) => item.id)
        : [id];
      const linkedCashflowIds = financeTransactions
        .filter((item: any) => idsToDelete.includes(item.id))
        .map((item: any) => item.linkedCashflowId)
        .filter(Boolean);

      deleteFinanceTransactionApi(id)
        .then(() => {
          const updatedTransactions = financeTransactions.filter((item: any) => !idsToDelete.includes(item.id));
          setFinanceTransactions(updatedTransactions);
          setScopedItem('financeTransactions', userId, updatedTransactions);

          if (linkedCashflowIds.length > 0) {
            const updatedCashflows = allCashflows.filter((item: any) => !linkedCashflowIds.includes(item.id));
            setAllCashflows(updatedCashflows);
            setScopedItem('cashflows', userId, updatedCashflows);
          }

          logUserActivity('finance_transaction.deleted', 'finance_transaction', id, {
            accountId: existingTransaction.accountId,
            type: existingTransaction.type,
            linkedCashflowId: existingTransaction.linkedCashflowId || null,
            transferGroupId: existingTransaction.transferGroupId || null,
          });
          showToast(existingTransaction.transferGroupId ? 'Transfer internal berhasil dihapus' : 'Transaksi finance dihapus');
        })
        .catch((error) => {
          showToast(`Gagal menghapus transaksi finance: ${error.message}`, 'error');
        });
      return null;
    }

    const idsToDelete = existingTransaction.transferGroupId
      ? financeTransactions
          .filter((item: any) => item.transferGroupId === existingTransaction.transferGroupId)
          .map((item: any) => item.id)
      : [id];

    financeTransactions
      .filter((item: any) => idsToDelete.includes(item.id))
      .forEach((item: any) => removeLinkedCashflowForFinanceTransaction(item));

    const updatedTransactions = financeTransactions.filter((item: any) => !idsToDelete.includes(item.id));
    saveFinanceTransactions(updatedTransactions);
    logUserActivity('finance_transaction.deleted', 'finance_transaction', id, {
      accountId: existingTransaction.accountId,
      type: existingTransaction.type,
      linkedCashflowId: existingTransaction.linkedCashflowId || null,
      transferGroupId: existingTransaction.transferGroupId || null,
    });
    showToast(existingTransaction.transferGroupId ? 'Transfer internal berhasil dihapus' : 'Transaksi finance dihapus');
    return existingTransaction;
  };

  const createFinancePortfolioTransfer = (transfer) => {
    if (!ensureWritable()) return null;
    const amount = Math.abs(Number(transfer.amount) || 0);
    if (!amount) return null;

    const payload = {
      accountId: transfer.accountId,
      type: 'expense',
      amount,
      date: transfer.date,
      description: transfer.description || 'Transfer ke dompet trading',
      category: transfer.category || 'Transfer ke dompet',
      linkToCashflow: true,
      linkedPortfolioId: transfer.portfolioId || activePortfolioId,
      cashflowSyncMode: 'transfer_to_portfolio',
    };

    const createdTransaction = addFinanceTransaction(payload);
    if (createdTransaction) {
      logUserActivity('finance_portfolio_transfer.created', 'finance_transaction', createdTransaction.id, {
        accountId: transfer.accountId,
        portfolioId: payload.linkedPortfolioId || null,
        amount,
      });
    }
    return createdTransaction;
  };

  const createPortfolioToFinanceTransfer = (transfer) => {
    if (!ensureWritable()) return null;
    const amount = Math.abs(Number(transfer.amount) || 0);
    if (!amount) return null;

    const payload = {
      accountId: transfer.accountId,
      type: 'income',
      amount,
      date: transfer.date,
      description: transfer.description || 'Transfer dari dompet trading',
      category: transfer.category || 'Transfer dari dompet',
      linkToCashflow: true,
      linkedPortfolioId: transfer.portfolioId || activePortfolioId,
      cashflowSyncMode: 'transfer_from_portfolio',
    };

    const createdTransaction = addFinanceTransaction(payload);
    if (createdTransaction) {
      logUserActivity('portfolio_finance_transfer.created', 'finance_transaction', createdTransaction.id, {
        accountId: transfer.accountId,
        portfolioId: payload.linkedPortfolioId || null,
        amount,
      });
    }
    return createdTransaction;
  };

  const createFinanceTransfer = (transfer) => {
    if (!ensureWritable()) return null;
    const amount = Math.abs(Number(transfer.amount) || 0);
    if (!amount) return null;

    if (isApiConfigured) {
      createFinanceTransferApi({
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
        amount,
        date: transfer.date,
        description: transfer.description || 'Transfer internal',
      })
        .then((createdTransfer) => {
          if (!createdTransfer) return;
          const nextTransactions = [
            createdTransfer.sourceTransaction,
            createdTransfer.targetTransaction,
            ...financeTransactions,
          ];
          setFinanceTransactions(nextTransactions);
          setScopedItem('financeTransactions', userId, nextTransactions);
          logUserActivity('finance_transfer.created', 'finance_transaction', createdTransfer.transferGroupId, {
            fromAccountId: transfer.fromAccountId,
            toAccountId: transfer.toAccountId,
            amount,
          });
          showToast('Transfer antar rekening berhasil dicatat');
        })
        .catch((error) => {
          showToast(`Gagal membuat transfer: ${error.message}`, 'error');
        });
      return null;
    }

    const transferGroupId = generateId();
    const createdAt = new Date().toISOString();
    const description = transfer.description || 'Transfer internal';
    const sourceTransaction = {
      id: generateId(),
      accountId: transfer.fromAccountId,
      type: 'transfer_out',
      amount,
      date: transfer.date,
      description,
      counterpartyAccountId: transfer.toAccountId,
      transferGroupId,
      createdAt,
    };
    const targetTransaction = {
      id: generateId(),
      accountId: transfer.toAccountId,
      type: 'transfer_in',
      amount,
      date: transfer.date,
      description,
      counterpartyAccountId: transfer.fromAccountId,
      transferGroupId,
      createdAt,
    };

    saveFinanceTransactions([sourceTransaction, targetTransaction, ...financeTransactions]);
    logUserActivity('finance_transfer.created', 'finance_transaction', transferGroupId, {
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      amount,
    });
    showToast('Transfer antar rekening berhasil dicatat');
    return { transferGroupId, sourceTransaction, targetTransaction };
  };

  // === DIVIDENDS CRUD ===
  const addDividend = (div) => {
    if (!ensureWritable()) return;
    if (isApiConfigured) {
      createDividendApi({
        ...div,
        amountPerShare: Number(div.dividendPerShare) || 0,
        lots: Number(div.shareCount) || 0,
        totalAmount: Number(div.totalAmount) || 0,
        dateReceived: div.payDate ? new Date(div.payDate).toISOString() : new Date().toISOString(),
        market: div.market || 'ID',
        cumDate: div.cumDate ? new Date(div.cumDate).toISOString() : undefined,
        notes: div.notes || undefined,
        portfolioId: div.portfolioId || activePortfolioId,
      })
        .then((createdDividend) => {
          if (!createdDividend) return;
          const updated = [createdDividend, ...allDividends];
          setAllDividends(updated);
          setScopedItem('dividends', userId, updated);
          logUserActivity('dividend.created', 'dividend', createdDividend.id, {
            stockCode: createdDividend.stockCode || null,
            amount: createdDividend.totalAmount || null,
            market: createdDividend.market || 'ID',
            portfolioId: createdDividend.portfolioId || defaultPortfolioId,
          });
          showToast('Catatan dividen ditambahkan');
        })
        .catch((error) => {
          showToast(`Gagal menambah dividen: ${error.message}`, 'error');
        });
      return;
    }

    const newDiv = { 
      ...div, 
      id: generateId(), 
      createdAt: new Date().toISOString(),
      portfolioId: activePortfolioId
    };
    const updated = [newDiv, ...allDividends];
    setAllDividends(updated);
    persistData('dividends', updated);
    logUserActivity('dividend.created', 'dividend', newDiv.id, {
      stockCode: newDiv.stockCode || null,
      amount: newDiv.amount || null,
      market: newDiv.market || 'ID',
      portfolioId: newDiv.portfolioId || defaultPortfolioId,
    });
    showToast('Catatan dividen ditambahkan');
  };

  const updateDividend = (id, updates) => {
    if (!ensureWritable()) return;
    const existingDividend = allDividends.find(d => d.id === id);
    if (!existingDividend) return;
    if (isApiConfigured) {
      const apiUpdates = { ...updates };
      if (apiUpdates.dividendPerShare !== undefined) apiUpdates.amountPerShare = Number(apiUpdates.dividendPerShare) || 0;
      if (apiUpdates.shareCount !== undefined) apiUpdates.lots = Number(apiUpdates.shareCount) || 0;
      if (apiUpdates.totalAmount !== undefined) apiUpdates.totalAmount = Number(apiUpdates.totalAmount) || 0;
      if (apiUpdates.payDate !== undefined) apiUpdates.dateReceived = new Date(apiUpdates.payDate).toISOString();
      if (apiUpdates.cumDate !== undefined) apiUpdates.cumDate = apiUpdates.cumDate ? new Date(apiUpdates.cumDate).toISOString() : null;

      updateDividendApi(id, apiUpdates)
        .then((updatedDividend) => {
          if (!updatedDividend) return;
          const updated = allDividends.map(d => d.id === id ? updatedDividend : d);
          setAllDividends(updated);
          setScopedItem('dividends', userId, updated);
          logUserActivity('dividend.updated', 'dividend', id, {
            stockCode: updatedDividend.stockCode || existingDividend.stockCode || null,
            amount: updatedDividend.totalAmount || existingDividend.totalAmount || existingDividend.amount || null,
            market: updatedDividend.market || existingDividend.market || 'ID',
            fieldsUpdated: Object.keys(updates || {}),
          });
          showToast('Catatan dividen diperbarui');
        })
        .catch((error) => {
          showToast(`Gagal memperbarui dividen: ${error.message}`, 'error');
        });
      return;
    }

    const updated = allDividends.map(d => d.id === id ? {
      ...d,
      ...updates,
      updatedAt: new Date().toISOString(),
    } : d);
    setAllDividends(updated);
    persistData('dividends', updated);
    logUserActivity('dividend.updated', 'dividend', id, {
      stockCode: updates.stockCode || existingDividend.stockCode || null,
      amount: updates.totalAmount || updates.amount || existingDividend.totalAmount || existingDividend.amount || null,
      market: updates.market || existingDividend.market || 'ID',
      fieldsUpdated: Object.keys(updates || {}),
    });
    showToast('Catatan dividen diperbarui');
  };

  const deleteDividend = (id) => {
    if (!ensureWritable()) return;
    const existingDividend = allDividends.find(d => d.id === id);
    if (isApiConfigured) {
      deleteDividendApi(id)
        .then(() => {
          const updated = allDividends.filter(d => d.id !== id);
          setAllDividends(updated);
          setScopedItem('dividends', userId, updated);
          if (existingDividend) {
            logUserActivity('dividend.deleted', 'dividend', id, {
              stockCode: existingDividend.stockCode || null,
              amount: existingDividend.totalAmount || existingDividend.amount || null,
              market: existingDividend.market || 'ID',
            });
          }
          showToast('Catatan dividen dihapus');
        })
        .catch((error) => {
          showToast(`Gagal menghapus dividen: ${error.message}`, 'error');
        });
      return;
    }

    const updated = allDividends.filter(d => d.id !== id);
    setAllDividends(updated);
    persistData('dividends', updated);
    if (existingDividend) {
      logUserActivity('dividend.deleted', 'dividend', id, {
        stockCode: existingDividend.stockCode || null,
        amount: existingDividend.amount || null,
        market: existingDividend.market || 'ID',
      });
    }
    showToast('Catatan dividen dihapus');
  };

  // === PORTFOLIO CRUD ===
  const addPortfolio = (name, description = '', financeAccountId = '') => {
    if (!ensureWritable()) return null;

    if (isApiConfigured) {
      createPortfolioApi({
        name,
        description,
        financeAccountId: financeAccountId || '',
        displayOrder: portfolios.length,
      })
        .then((createdPortfolio) => {
          if (!createdPortfolio) return;
          const updated = [...portfolios, createdPortfolio];
          setPortfolios(updated);
          setScopedItem('portfolios', userId, updated);
          logUserActivity('portfolio.created', 'portfolio', createdPortfolio.id, {
            name: createdPortfolio.name,
          });
          showToast('Portofolio berhasil dibuat');
        })
        .catch((error) => {
          showToast(`Gagal membuat portofolio: ${error.message}`, 'error');
        });
      return null;
    }

    const newPort = {
      id: generateId(),
      name,
      description,
      financeAccountId: financeAccountId || '',
      displayOrder: portfolios.length,
      createdAt: new Date().toISOString()
    };
    const updated = [...portfolios, newPort];
    setPortfolios(updated);
    persistData('portfolios', updated);
    logUserActivity('portfolio.created', 'portfolio', newPort.id, {
      name: newPort.name,
    });
    showToast('Portofolio berhasil dibuat');
    return newPort;
  };

  const updatePortfolio = (id, updates) => {
    if (!ensureWritable()) return;

    if (isApiConfigured) {
      updatePortfolioApi(id, updates)
        .then((updatedPortfolio) => {
          if (!updatedPortfolio) return;
          const existingPortfolio = portfolios.find(p => p.id === id);
          const updated = portfolios.map(p => p.id === id ? { ...p, ...updatedPortfolio } : p);
          setPortfolios(updated);
          setScopedItem('portfolios', userId, updated);
          if (existingPortfolio) {
            logUserActivity('portfolio.updated', 'portfolio', id, {
              name: updates.name || existingPortfolio.name,
              fieldsUpdated: Object.keys(updates || {}),
            });
          }
          showToast('Portofolio berhasil diperbarui');
        })
        .catch((error) => {
          showToast(`Gagal memperbarui portofolio: ${error.message}`, 'error');
        });
      return;
    }

    const existingPortfolio = portfolios.find(p => p.id === id);
    const updated = portfolios.map(p => p.id === id ? { ...p, ...updates } : p);
    setPortfolios(updated);
    persistData('portfolios', updated);
    if (existingPortfolio) {
      logUserActivity('portfolio.updated', 'portfolio', id, {
        name: updates.name || existingPortfolio.name,
        fieldsUpdated: Object.keys(updates || {}),
      });
    }
    showToast('Portofolio berhasil diperbarui');
  };

  const deletePortfolio = (id) => {
    if (!ensureWritable()) return;
    const isPrimaryPortfolio = id === defaultPortfolioId || portfolios.find((portfolio: any) => portfolio.id === id)?.isDefault;
    if (isPrimaryPortfolio) {
      showToast('Portofolio utama tidak bisa dihapus', 'error');
      return;
    }

    if (isApiConfigured) {
      const existingPortfolio = portfolios.find(p => p.id === id);
      deletePortfolioApi(id)
        .then(() => {
          const updatedPortfolios = portfolios.filter(p => p.id !== id);
          setPortfolios(updatedPortfolios);
          setScopedItem('portfolios', userId, updatedPortfolios);

          if (activePortfolioId === id) {
            selectPortfolio(defaultPortfolioId);
          }

          const updatedTrades = allTrades.filter(t => (t.portfolioId || defaultPortfolioId) !== id);
          setAllTrades(updatedTrades);
          persistData('trades', updatedTrades);

          const updatedCashflows = allCashflows.filter(c => (c.portfolioId || defaultPortfolioId) !== id);
          setAllCashflows(updatedCashflows);
          persistData('cashflows', updatedCashflows);

          const updatedDividends = allDividends.filter(d => (d.portfolioId || defaultPortfolioId) !== id);
          setAllDividends(updatedDividends);
          persistData('dividends', updatedDividends);

          if (existingPortfolio) {
            logUserActivity('portfolio.deleted', 'portfolio', id, {
              name: existingPortfolio.name,
            });
          }
          showToast('Portofolio beserta datanya berhasil dihapus');
        })
        .catch((error) => {
          showToast(`Gagal menghapus portofolio: ${error.message}`, 'error');
        });
      return;
    }

    const existingPortfolio = portfolios.find(p => p.id === id);
    const updatedPortfolios = portfolios.filter(p => p.id !== id);
    setPortfolios(updatedPortfolios);
    persistData('portfolios', updatedPortfolios);

    if (activePortfolioId === id) {
      selectPortfolio(defaultPortfolioId);
    }

    // Delete associated data
    const updatedTrades = allTrades.filter(t => (t.portfolioId || defaultPortfolioId) !== id);
    setAllTrades(updatedTrades);
    persistData('trades', updatedTrades);

    const updatedCashflows = allCashflows.filter(c => (c.portfolioId || defaultPortfolioId) !== id);
    setAllCashflows(updatedCashflows);
    persistData('cashflows', updatedCashflows);

    const updatedDividends = allDividends.filter(d => (d.portfolioId || defaultPortfolioId) !== id);
    setAllDividends(updatedDividends);
    persistData('dividends', updatedDividends);

    if (existingPortfolio) {
      logUserActivity('portfolio.deleted', 'portfolio', id, {
        name: existingPortfolio.name,
      });
    }
    showToast('Portofolio beserta datanya berhasil dihapus');
  };

  const reorderPortfolios = (orderedIds: string[]) => {
    if (!ensureWritable()) return null;
    const orderMap = new Map(orderedIds.map((itemId, index) => [itemId, index]));
    const updatedPortfolios = [...portfolios].sort((left: any, right: any) => {
      const leftIndex = orderMap.get(left.id);
      const rightIndex = orderMap.get(right.id);
      if (leftIndex == null && rightIndex == null) return 0;
      if (leftIndex == null) return 1;
      if (rightIndex == null) return -1;
      return leftIndex - rightIndex;
    });
    const normalizedUpdatedPortfolios = updatedPortfolios.map((portfolio: any, index: number) => ({
      ...portfolio,
      displayOrder: index,
    }));

    if (isApiConfigured) {
      reorderPortfoliosApi(orderedIds)
        .then((serverPortfolios) => {
          const nextPortfolios = serverPortfolios || normalizedUpdatedPortfolios;
          setPortfolios(nextPortfolios);
          setScopedItem('portfolios', userId, nextPortfolios);
          showToast('Urutan dompet berhasil diperbarui');
        })
        .catch((error) => {
          showToast(`Gagal mengubah urutan dompet: ${error.message}`, 'error');
        });
      return normalizedUpdatedPortfolios;
    }

    setPortfolios(normalizedUpdatedPortfolios);
    persistData('portfolios', normalizedUpdatedPortfolios);
    showToast('Urutan dompet berhasil diperbarui');
    return normalizedUpdatedPortfolios;
  };

  const selectPortfolio = (id) => {
    const nextId = id || defaultPortfolioId;
    setActivePortfolioId(nextId);
      if (userId) {
        setScopedItem('active_portfolio', userId, nextId);
      }
    };

    // === TRADING PLANS CRUD ===
    const addTradingPlan = (plan) => {
      if (!ensureWritable()) return;
      const newPlan = { ...plan, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newPlan, ...tradingPlans];
    setTradingPlans(updated);
    persistData('tradingPlans', updated);
    logUserActivity('trading_plan.created', 'trading_plan', newPlan.id, {
      stockCode: newPlan.stockCode || null,
      market: newPlan.market || 'ID',
    });
    showToast('Rencana trading disimpan');
  };

    const updateTradingPlan = (id, updates) => {
      if (!ensureWritable()) return;
      const existingPlan = tradingPlans.find((plan) => plan.id === id);
      if (!existingPlan) return;
      const updatedPlan = {
        ...existingPlan,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      const updated = tradingPlans.map((plan) => (plan.id === id ? updatedPlan : plan));
      setTradingPlans(updated);
      persistData('tradingPlans', updated);
      logUserActivity('trading_plan.updated', 'trading_plan', id, {
        stockCode: updatedPlan.stockCode || null,
        market: updatedPlan.market || 'ID',
        fieldsUpdated: Object.keys(updates || {}),
      });
      showToast('Rencana trading diperbarui');
    };

    const deleteTradingPlan = (id) => {
      if (!ensureWritable()) return;
    const updated = tradingPlans.filter(p => p.id !== id);
    setTradingPlans(updated);
    persistData('tradingPlans', updated);
    logUserActivity('trading_plan.deleted', 'trading_plan', id);
    showToast('Rencana trading dihapus');
  };

  const {
    addIpoAccount,
    addIpoEvent,
    updateIpoAccount,
    updateIpoEvent,
    deleteIpoAccount,
    deleteIpoEvent,
    addIpoEntry,
    updateIpoEntry,
    deleteIpoEntry,
    batchAddIpoEntries,
    batchDeleteIpoEntries,
    batchUpdateIpoEntries,
  } = useMemo(() => buildIpoDomain({
    ensureWritable,
    ipoAccounts,
    ipoEntries,
    ipoEvents,
    logUserActivity,
    persistData,
    cacheLocalState: (key, value) => {
      if (!userId) return;
      setScopedItem(key, userId, value);
    },
    setIpoAccounts,
    setIpoEntries,
    setIpoEvents,
    showToast,
  }), [
    ensureWritable,
    ipoAccounts,
    ipoEntries,
    ipoEvents,
    logUserActivity,
    persistData,
    showToast,
  ]);

  // Batch add — used for duplicating; avoids stale-state bug of calling addIpoEntry in a loop
  // === BSJP CRUD ===
  const addBsjpTrade = (trade) => {
    if (!ensureWritable()) return null;
    const newTrade = {
      ...trade,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    const updated = [newTrade, ...bsjpTrades];
    setBsjpTrades(updated);
    persistData('bsjpTrades', updated);
    logUserActivity('bsjp_trade.created', 'bsjp_trade', newTrade.id, {
      stockCode: newTrade.stockCode || null,
      date: newTrade.date || null,
    });
    showToast('Transaksi BSJP berhasil ditambahkan');
    return newTrade;
  };

  const updateBsjpTrade = (id, updates) => {
    if (!ensureWritable()) return;
    const existingTrade = bsjpTrades.find(t => t.id === id);
    const updated = bsjpTrades.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
    setBsjpTrades(updated);
    persistData('bsjpTrades', updated);
    if (existingTrade) {
      logUserActivity('bsjp_trade.updated', 'bsjp_trade', id, {
        stockCode: updates.stockCode || existingTrade.stockCode || null,
        fieldsUpdated: Object.keys(updates || {}),
      });
    }
    showToast('Transaksi BSJP berhasil diperbarui');
  };

  const deleteBsjpTrade = (id) => {
    if (!ensureWritable()) return;
    const existingTrade = bsjpTrades.find(t => t.id === id);
    const updated = bsjpTrades.filter(t => t.id !== id);
    setBsjpTrades(updated);
    persistData('bsjpTrades', updated);
    if (existingTrade) {
      logUserActivity('bsjp_trade.deleted', 'bsjp_trade', id, {
        stockCode: existingTrade.stockCode || null,
      });
    }
    showToast('Transaksi BSJP berhasil dihapus');
  };

  // === SETTINGS ===
  const updateSettings = (updates) => {
    if (!ensureWritable()) return;
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    persistData('settings', newSettings);
    logUserActivity('settings.updated', 'settings', userId, {
      fieldsUpdated: Object.keys(updates || {}),
    });
    showToast('Pengaturan disimpan');
  };

  const updateMarketPrice = (stockCode, price) => {
    if (!ensureWritable()) return;
    const updated = { ...marketPrices, [stockCode]: parseFloat(price) || 0 };
    setMarketPrices(updated);
    persistData('marketPrices', updated);
  };

  const exportData = () => ({
    trades: allTrades,
    watchlist,
    notes,
    cashflows: allCashflows,
    dividends: allDividends,
    settings,
    marketPrices,
    portfolios,
    tradingPlans,
    ipoEvents,
    ipoEntries,
    ipoAccounts,
    bsjpTrades,
    financeAccounts,
    financeTransactions,
    exportDate: new Date().toISOString(),
    version: '2.2',
    storage: isApiConfigured ? 'api' : 'localStorage',
  });

  const importData = async (data) => {
    if (!ensureWritable()) return;
    
    // Validasi dan Migrasi Data ke versi terbaru (2.2)
    const migratedData = migrateDataToCurrentVersion(data);
    
    const nextData = {
      trades: migratedData.trades || [],
      watchlist: migratedData.watchlist || [],
      notes: migratedData.notes || [],
      cashflows: migratedData.cashflows || [],
      dividends: migratedData.dividends || [],
      settings: normalizeSettings(migratedData.settings || settings, DEFAULT_SETTINGS),
      marketPrices: migratedData.marketPrices || {},
      portfolios: migratedData.portfolios || [DEFAULT_PORTFOLIO],
      tradingPlans: migratedData.tradingPlans || [],
      ipoEvents: migratedData.ipoEvents || [],
      ipoEntries: migratedData.ipoEntries || [],
      ipoAccounts: migratedData.ipoAccounts || [],
      bsjpTrades: migratedData.bsjpTrades || [],
      financeAccounts: migratedData.financeAccounts || [],
      financeTransactions: migratedData.financeTransactions || [],
    };

    if (isApiConfigured) {
      const financeAccountIdMap = new Map<string, string>();
      const portfolioIdMap = new Map<string, string>();
      const cashflowIdMap = new Map<string, string>();
      const financeTransactionIdMap = new Map<string, string>();
      const ipoEventIdMap = new Map<string, string>();
      const ipoAccountIdMap = new Map<string, string>();

      const snapshotDefaultPortfolioId = defaultPortfolioId;
      const hasPersistedDefaultPortfolio =
        typeof snapshotDefaultPortfolioId === 'string'
        && snapshotDefaultPortfolioId.trim().length > 0
        && snapshotDefaultPortfolioId !== DEFAULT_PORTFOLIO.id;
      let runtimeDefaultPortfolioId = snapshotDefaultPortfolioId;

      await clearData();

      for (const financeAccount of nextData.financeAccounts) {
        const createdAccount = await createFinanceAccountApi(financeAccount);
        if (createdAccount && financeAccount?.id) {
          financeAccountIdMap.set(String(financeAccount.id), createdAccount.id);
        }
      }

      const importedPortfolios = Array.isArray(nextData.portfolios) && nextData.portfolios.length > 0
        ? nextData.portfolios
        : [DEFAULT_PORTFOLIO];
      let defaultPortfolioPatched = false;

      for (const [index, portfolio] of importedPortfolios.entries()) {
        const sourcePortfolioId = String(portfolio?.id || '').trim() || 'default';
        const mappedFinanceAccountId = portfolio?.financeAccountId
          ? financeAccountIdMap.get(String(portfolio.financeAccountId)) || ''
          : '';
        const isImportedDefault = Boolean(portfolio?.isDefault) || sourcePortfolioId === 'default';

        if (!defaultPortfolioPatched && isImportedDefault) {
          let ensuredDefaultPortfolio = null;

          if (hasPersistedDefaultPortfolio) {
            try {
              ensuredDefaultPortfolio = await updatePortfolioApi(snapshotDefaultPortfolioId, {
                name: portfolio?.name || DEFAULT_PORTFOLIO.name,
                description: portfolio?.description || '',
                financeAccountId: mappedFinanceAccountId,
                displayOrder: Number(portfolio?.displayOrder ?? index),
                isDefault: true,
              });
            } catch {
              ensuredDefaultPortfolio = null;
            }
          }

          if (!ensuredDefaultPortfolio) {
            ensuredDefaultPortfolio = await createPortfolioApi({
              name: portfolio?.name || DEFAULT_PORTFOLIO.name,
              description: portfolio?.description || '',
              financeAccountId: mappedFinanceAccountId,
              displayOrder: Number(portfolio?.displayOrder ?? index),
              isDefault: true,
            });
          }

          runtimeDefaultPortfolioId = ensuredDefaultPortfolio?.id || runtimeDefaultPortfolioId;
          portfolioIdMap.set(sourcePortfolioId, runtimeDefaultPortfolioId);
          defaultPortfolioPatched = true;
          continue;
        }

        const createdPortfolio = await createPortfolioApi({
          name: portfolio?.name || 'Portofolio',
          description: portfolio?.description || '',
          financeAccountId: mappedFinanceAccountId,
          displayOrder: Number(portfolio?.displayOrder ?? index),
        });
        if (createdPortfolio) {
          portfolioIdMap.set(sourcePortfolioId, createdPortfolio.id);
        }
      }

      if (!defaultPortfolioPatched) {
        if (!hasPersistedDefaultPortfolio) {
          const createdDefaultPortfolio = await createPortfolioApi({
            name: DEFAULT_PORTFOLIO.name,
            description: '',
            displayOrder: 0,
            isDefault: true,
          });
          runtimeDefaultPortfolioId = createdDefaultPortfolio?.id || runtimeDefaultPortfolioId;
        }
        portfolioIdMap.set('default', runtimeDefaultPortfolioId);
      }

      for (const trade of nextData.trades) {
        await createTradeApi({
          ...trade,
          portfolioId: portfolioIdMap.get(String(trade?.portfolioId || 'default')) || runtimeDefaultPortfolioId,
        });
      }

      for (const cashflow of nextData.cashflows) {
        const createdCashflow = await createCashflowApi({
          ...cashflow,
          portfolioId: portfolioIdMap.get(String(cashflow?.portfolioId || 'default')) || runtimeDefaultPortfolioId,
          linkedFinanceTransactionId: undefined,
        });
        if (createdCashflow && cashflow?.id) {
          cashflowIdMap.set(String(cashflow.id), createdCashflow.id);
        }
      }

      for (const dividend of nextData.dividends) {
        await createDividendApi({
          ...dividend,
          portfolioId: portfolioIdMap.get(String(dividend?.portfolioId || 'default')) || runtimeDefaultPortfolioId,
        });
      }

      for (const item of nextData.watchlist) {
        await createWatchlistItemApi(item);
      }

      for (const note of nextData.notes) {
        await createNoteApi(note);
      }

      for (const transaction of nextData.financeTransactions) {
        const createdTransaction = await createFinanceTransactionApi({
          ...transaction,
          accountId: financeAccountIdMap.get(String(transaction?.accountId || '')) || transaction.accountId,
          counterpartyAccountId: transaction?.counterpartyAccountId
            ? financeAccountIdMap.get(String(transaction.counterpartyAccountId)) || undefined
            : undefined,
          linkedCashflowId: transaction?.linkedCashflowId
            ? cashflowIdMap.get(String(transaction.linkedCashflowId)) || undefined
            : undefined,
          linkedPortfolioId: transaction?.linkedPortfolioId
            ? portfolioIdMap.get(String(transaction.linkedPortfolioId)) || runtimeDefaultPortfolioId
            : undefined,
        });
        if (createdTransaction && transaction?.id) {
          financeTransactionIdMap.set(String(transaction.id), createdTransaction.id);
        }
      }

      for (const cashflow of nextData.cashflows) {
        if (!cashflow?.linkedFinanceTransactionId || !cashflow?.id) continue;
        const mappedCashflowId = cashflowIdMap.get(String(cashflow.id));
        const mappedFinanceTransactionId = financeTransactionIdMap.get(String(cashflow.linkedFinanceTransactionId));
        if (mappedCashflowId && mappedFinanceTransactionId) {
          await updateCashflowApi(mappedCashflowId, {
            linkedFinanceTransactionId: mappedFinanceTransactionId,
          });
        }
      }

      for (const ipoEvent of nextData.ipoEvents) {
        const createdEvent = await createIpoEventApi(ipoEvent);
        if (createdEvent && ipoEvent?.id) {
          ipoEventIdMap.set(String(ipoEvent.id), createdEvent.id);
        }
      }

      for (const ipoAccount of nextData.ipoAccounts) {
        const createdAccount = await createIpoAccountApi(ipoAccount);
        if (createdAccount && ipoAccount?.id) {
          ipoAccountIdMap.set(String(ipoAccount.id), createdAccount.id);
        }
      }

      for (const ipoEntry of nextData.ipoEntries) {
        await createIpoEntryApi({
          ...ipoEntry,
          ipoEventId: ipoEventIdMap.get(String(ipoEntry?.ipoEventId || '')) || ipoEntry.ipoEventId,
          ipoAccountId: ipoEntry?.ipoAccountId
            ? ipoAccountIdMap.get(String(ipoEntry.ipoAccountId)) || undefined
            : undefined,
        });
      }

      const apiSnapshot = await loadApiJournalSnapshot();
      const mergedData = {
        ...nextData,
        ...apiSnapshot,
        settings: nextData.settings,
        marketPrices: nextData.marketPrices,
        tradingPlans: nextData.tradingPlans,
        bsjpTrades: nextData.bsjpTrades,
      };

      applyData(mergedData);
      cacheLocalData(userId, mergedData, LOCAL_DATA_KEYS);
      Object.entries(mergedData).forEach(([key, value]) => setScopedItem(key, userId, value));
      setScopedItem('active_portfolio', userId, runtimeDefaultPortfolioId);
      setActivePortfolioId(runtimeDefaultPortfolioId);
      return;
    }

    applyData(nextData);
    cacheLocalData(userId, nextData, LOCAL_DATA_KEYS);
    Object.entries(nextData).forEach(([key, value]) => setScopedItem(key, userId, value));
  };

  const clearData = async () => {
    if (!ensureWritable()) return;
    setAllTrades([]);
    setWatchlist([]);
    setNotes([]);
    setAllCashflows([]);
    setAllDividends([]);
    setSettings(DEFAULT_SETTINGS);
    setMarketPrices({});
    setPortfolios([DEFAULT_PORTFOLIO]);
    setActivePortfolioId(DEFAULT_PORTFOLIO.id);
    setTradingPlans([]);
    setIpoEvents([]);
    setIpoEntries([]);
    setIpoAccounts([]);
    setBsjpTrades([]);
    setFinanceAccounts([]);
    setFinanceTransactions([]);

    LOCAL_DATA_KEYS.forEach((key) => removeScopedItem(key, userId));
    removeScopedItem('active_portfolio', userId);
    setScopedItem('trades', userId, []);
    setScopedItem('watchlist', userId, []);
    setScopedItem('notes', userId, []);
    setScopedItem('cashflows', userId, []);
    setScopedItem('dividends', userId, []);
    setScopedItem('settings', userId, DEFAULT_SETTINGS);
    setScopedItem('marketPrices', userId, {});
    setScopedItem('portfolios', userId, [DEFAULT_PORTFOLIO]);
    setScopedItem('tradingPlans', userId, []);
    setScopedItem('ipoEvents', userId, []);
    setScopedItem('ipoEntries', userId, []);
    setScopedItem('ipoAccounts', userId, []);
    setScopedItem('active_portfolio', userId, DEFAULT_PORTFOLIO.id);
    setScopedItem('bsjpTrades', userId, []);
    setScopedItem('financeAccounts', userId, []);
    setScopedItem('financeTransactions', userId, []);
    if (isApiConfigured) {
      const deletionTasks: Array<Promise<unknown>> = [];

      allTrades.forEach((trade) => {
        deletionTasks.push(deleteTradeApi(trade.id).catch(() => undefined));
      });
      watchlist.forEach((item) => {
        deletionTasks.push(deleteWatchlistItemApi(item.id).catch(() => undefined));
      });
      notes.forEach((note) => {
        deletionTasks.push(deleteNoteApi(note.id).catch(() => undefined));
      });
      allCashflows.forEach((cashflow) => {
        deletionTasks.push(deleteCashflowApi(cashflow.id).catch(() => undefined));
      });
      allDividends.forEach((dividend) => {
        deletionTasks.push(deleteDividendApi(dividend.id).catch(() => undefined));
      });
      financeTransactions.forEach((transaction) => {
        deletionTasks.push(deleteFinanceTransactionApi(transaction.id).catch(() => undefined));
      });
      ipoEntries.forEach((entry) => {
        deletionTasks.push(deleteIpoEntryApi(entry.id).catch(() => undefined));
      });
      ipoEvents.forEach((event) => {
        deletionTasks.push(deleteIpoEventApi(event.id).catch(() => undefined));
      });
      ipoAccounts.forEach((account) => {
        deletionTasks.push(deleteIpoAccountApi(account.id).catch(() => undefined));
      });
      financeAccounts.forEach((account) => {
        deletionTasks.push(deleteFinanceAccountApi(account.id).catch(() => undefined));
      });
      portfolios
        .filter((portfolio: any) => !(portfolio.isDefault || portfolio.id === defaultPortfolioId))
        .forEach((portfolio: any) => {
          deletionTasks.push(deletePortfolioApi(portfolio.id).catch(() => undefined));
        });

      await Promise.all(deletionTasks);
    }
  };

  return (
    <DataContext.Provider value={{
      trades: filteredTrades,
      allTrades,
      addTrade,
      updateTrade,
      deleteTrade,
      updateTrades,
      deleteTrades,
      getTradeById,
      watchlist,
      addWatchlistItem,
      updateWatchlistItem,
      deleteWatchlistItem,
      notes,
      addNote,
      updateNote,
      deleteNote,
      cashflows: filteredCashflows,
      allCashflows,
      addCashflow,
      updateCashflow,
      deleteCashflow,
      dividends: filteredDividends,
      allDividends,
      addDividend,
      updateDividend,
      deleteDividend,
      settings,
      updateSettings,
      marketPrices,
      updateMarketPrice,
      fetchLivePrices,
      portfolios,
      activePortfolioId,
      defaultPortfolioId,
      addPortfolio,
      updatePortfolio,
      deletePortfolio,
      reorderPortfolios,
      selectPortfolio,
      tradingPlans,
      addTradingPlan,
      updateTradingPlan,
      deleteTradingPlan,
      ipoEvents,
      ipoEntries,
      ipoAccounts,
      addIpoAccount,
      addIpoEvent,
      updateIpoAccount,
      updateIpoEvent,
      deleteIpoAccount,
      deleteIpoEvent,
      addIpoEntry,
      updateIpoEntry,
      deleteIpoEntry,
      batchAddIpoEntries,
      batchDeleteIpoEntries,
      batchUpdateIpoEntries,
      bsjpTrades,
      addBsjpTrade,
      updateBsjpTrade,
      deleteBsjpTrade,
      financeAccounts,
      financeTransactions,
      addFinanceAccount,
      updateFinanceAccount,
      toggleFinanceAccountActive,
      deleteFinanceAccount,
      reorderFinanceAccounts,
      addFinanceTransaction,
      updateFinanceTransaction,
      deleteFinanceTransaction,
      createFinanceTransfer,
      createFinancePortfolioTransfer,
      createPortfolioToFinanceTransfer,
      getFinanceTransactionsByAccount,
      getFinanceAccountCurrentBalance,
      getFinanceSummary,
      dataLoading,
      dataError,
      databaseSetupError,
      exportData,
      importData,
      clearData,
      toasts,
      showToast,
      tradeFormDraft,
      setTradeFormDraft,
      tradeEditDraft,
      setTradeEditDraft,
      noteFormDraft,
      setNoteFormDraft,
      watchlistFormDraft,
      setWatchlistFormDraft,
      cashflowFormDraft,
      setCashflowFormDraft,
      dividendFormDraft,
      setDividendFormDraft,
      calculatorActiveTab,
      setCalculatorActiveTab,
      calculatorDrafts,
      setCalculatorDrafts,
      canWrite: can('journal:write'),
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
