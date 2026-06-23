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
import { isSupabaseConfigured } from '@/modules/shared/services/supabaseClient';
import { clearUserData, loadUserData, replaceAllUserData, saveUserData } from '@/modules/shared/services/supabaseDataService';
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
  const [activePortfolioId, setActivePortfolioId] = useState('default');
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
      setActivePortfolioId(getScopedItem('active_portfolio', userId) || 'default');
    } else {
      setActivePortfolioId('default');
    }
  }, [userId]);

  const filteredTrades = useMemo(() => {
    return allTrades.filter(t => (t.portfolioId || 'default') === activePortfolioId);
  }, [allTrades, activePortfolioId]);

  const filteredCashflows = useMemo(() => {
    return allCashflows.filter(c => (c.portfolioId || 'default') === activePortfolioId);
  }, [allCashflows, activePortfolioId]);

  const filteredDividends = useMemo(() => {
    return allDividends.filter(d => (d.portfolioId || 'default') === activePortfolioId);
  }, [allDividends, activePortfolioId]);

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

      setDataLoading(true);
      setDataError('');
      setDatabaseSetupError('');
      try {
        if (isSupabaseConfigured) {
          if (hasCachedLocalData) {
            applyData(cachedLocalData);
            setDataLoading(false);
          }
          const remoteData = await loadUserData(userId);
          const nextData = await migrateLocalDataToSupabase(userId, remoteData);
          if (cancelled) return;
          applyData(nextData);
          cacheLocalData(userId, nextData, LOCAL_DATA_KEYS);
        } else {
          migrateGlobalToUser(userId);
          migrateWorkspaceScopeToUserScope(userId);
          const localData = loadLocalData(userId, {
            defaultPortfolio: DEFAULT_PORTFOLIO,
            defaultSettings: DEFAULT_SETTINGS,
          });
          applyData(localData);
        }
      } catch (error) {
        if (isMissingDatabaseSetupError(error)) {
          setDatabaseSetupError(error.message);
        } else {
          if (hasCachedLocalData) {
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
    if (isSupabaseConfigured) {
      saveUserData(key, value, userId)
        .catch((error) => {
          showToast(`Gagal menyimpan ${key}: ${error.message}`, 'error');
        });
    }
  }, [userId, showToast]);

  const [initialPricesFetched, setInitialPricesFetched] = useState(false);

  const fetchLivePrices = useCallback(async (stockCodes: string[]) => {
    if (!stockCodes || stockCodes.length === 0) return;
    try {
      console.log('[DataContext] Auto-fetching live prices for tickers:', stockCodes);
      const quotes = await fetchQuotesBatch(stockCodes);
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
      portfolioId: newTrade.portfolioId || 'default',
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
      portfolioId: updates.portfolioId || existingTrade.portfolioId || 'default',
      fieldsUpdated: Object.keys(updates || {}),
    });
    showToast('Transaksi berhasil diperbarui');
  };

  const deleteTrade = (id) => {
    if (!ensureWritable()) return;
    const existingTrade = allTrades.find(t => t.id === id);
    const updated = allTrades.filter(t => t.id !== id);
    saveTrades(updated);
    if (existingTrade) {
      logUserActivity('trade.deleted', 'trade', id, {
        stockCode: existingTrade.stockCode,
        market: existingTrade.market || 'ID',
        portfolioId: existingTrade.portfolioId || 'default',
      });
    }
    showToast('Transaksi berhasil dihapus');
  };

  const updateTrades = (ids, updates) => {
    if (!ensureWritable()) return;
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
      portfolioId: newCf.portfolioId || 'default',
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
      portfolioId: updates.portfolioId || existingCashflow.portfolioId || 'default',
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
      portfolioId: existingCashflow.portfolioId || 'default',
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
    return createCashflowRecord(cf);
  };

  const updateCashflow = (id, updates) => {
    if (!ensureWritable()) return null;
    return updateCashflowRecord(id, updates);
  };

  const deleteCashflow = (id) => {
    if (!ensureWritable()) return null;
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
      linkedPortfolioId: isRdnSync ? transaction.linkedPortfolioId || activePortfolioId || 'default' : (transaction.linkToCashflow ? transaction.linkedPortfolioId || activePortfolioId : undefined),
      linkToCashflow: isRdnSync ? true : transaction.linkToCashflow,
      linkedCashflowId: undefined,
      createdAt: new Date().toISOString(),
    };
    const finalTransaction = (baseTransaction.linkToCashflow || isRdnSync)
      ? upsertLinkedCashflowForFinanceTransaction(baseTransaction)
      : baseTransaction;

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
      portfolioId: newDiv.portfolioId || 'default',
    });
    showToast('Catatan dividen ditambahkan');
  };

  const deleteDividend = (id) => {
    if (!ensureWritable()) return;
    const existingDividend = allDividends.find(d => d.id === id);
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
    const newPort = {
      id: generateId(),
      name,
      description,
      financeAccountId: financeAccountId || '',
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
    if (id === 'default') {
      showToast('Portofolio utama tidak bisa dihapus', 'error');
      return;
    }
    const existingPortfolio = portfolios.find(p => p.id === id);
    const updatedPortfolios = portfolios.filter(p => p.id !== id);
    setPortfolios(updatedPortfolios);
    persistData('portfolios', updatedPortfolios);

    if (activePortfolioId === id) {
      selectPortfolio('default');
    }

    // Delete associated data
    const updatedTrades = allTrades.filter(t => (t.portfolioId || 'default') !== id);
    setAllTrades(updatedTrades);
    persistData('trades', updatedTrades);

    const updatedCashflows = allCashflows.filter(c => (c.portfolioId || 'default') !== id);
    setAllCashflows(updatedCashflows);
    persistData('cashflows', updatedCashflows);

    const updatedDividends = allDividends.filter(d => (d.portfolioId || 'default') !== id);
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
    setPortfolios(updatedPortfolios);
    persistData('portfolios', updatedPortfolios);
    showToast('Urutan dompet berhasil diperbarui');
    return updatedPortfolios;
  };

  const selectPortfolio = (id) => {
    const nextId = id || 'default';
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

    const deleteTradingPlan = (id) => {
      if (!ensureWritable()) return;
    const updated = tradingPlans.filter(p => p.id !== id);
    setTradingPlans(updated);
    persistData('tradingPlans', updated);
    logUserActivity('trading_plan.deleted', 'trading_plan', id);
    showToast('Rencana trading dihapus');
  };

  const {
    addIpoEvent,
    updateIpoEvent,
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
    storage: isSupabaseConfigured ? 'supabase' : 'localStorage',
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

    applyData(nextData);
    cacheLocalData(userId, nextData, LOCAL_DATA_KEYS);

    if (isSupabaseConfigured) {
      await replaceAllUserData(nextData, userId);
    } else {
      Object.entries(nextData).forEach(([key, value]) => setScopedItem(key, userId, value));
    }
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
    setActivePortfolioId('default');
    setTradingPlans([]);
    setIpoEvents([]);
    setIpoEntries([]);
    setIpoAccounts([]);
    setBsjpTrades([]);
    setFinanceAccounts([]);
    setFinanceTransactions([]);

    LOCAL_DATA_KEYS.forEach((key) => removeScopedItem(key, userId));
    removeScopedItem('active_portfolio', userId);

    if (isSupabaseConfigured) {
      await clearUserData(userId);
    } else {
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
      setScopedItem('active_portfolio', userId, 'default');
      setScopedItem('bsjpTrades', userId, []);
      setScopedItem('financeAccounts', userId, []);
      setScopedItem('financeTransactions', userId, []);
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
      deleteDividend,
      settings,
      updateSettings,
      marketPrices,
      updateMarketPrice,
      fetchLivePrices,
      portfolios,
      activePortfolioId,
      addPortfolio,
      updatePortfolio,
      deletePortfolio,
      reorderPortfolios,
      selectPortfolio,
      tradingPlans,
      addTradingPlan,
      deleteTradingPlan,
      ipoEvents,
      ipoEntries,
      ipoAccounts,
      addIpoEvent,
      updateIpoEvent,
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

async function migrateLocalDataToSupabase(userId, remoteData) {
  const normalizedRemote = {
    ...remoteData,
    settings: normalizeSettings(remoteData.settings, DEFAULT_SETTINGS),
  };

  if (hasStoredData(remoteData, LOCAL_DATA_KEYS)) return normalizedRemote;

  migrateGlobalToUser(userId);
  migrateWorkspaceScopeToUserScope(userId);
  const localData = loadLocalData(userId, {
    defaultPortfolio: DEFAULT_PORTFOLIO,
    defaultSettings: DEFAULT_SETTINGS,
  });
  if (!hasStoredData(localData, LOCAL_DATA_KEYS)) return normalizedRemote;

  await replaceAllUserData(localData, userId);
  return localData;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
