import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  generateId,
  migrateGlobalToUser,
  migrateWorkspaceScopeToUserScope,
  getScopedItem,
  setScopedItem,
} from '@/modules/shared/utils/storage';
import { useAuth } from '@/modules/auth/AuthContext';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import { isSupabaseConfigured } from '@/modules/shared/services/supabaseClient';
import { clearUserData, loadUserData, replaceAllUserData, saveUserData } from '@/modules/shared/services/supabaseDataService';
import { isMissingDatabaseSetupError } from '@/modules/shared/utils/errorMessages';

const DataContext = createContext(null);
const DEFAULT_SETTINGS = {
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
};
const LOCAL_DATA_KEYS = ['trades', 'watchlist', 'notes', 'cashflows', 'dividends', 'settings', 'marketPrices', 'portfolios', 'tradingPlans', 'ipoEvents', 'ipoEntries', 'bsjpTrades'];

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
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [marketPrices, setMarketPrices] = useState({});
  const [portfolios, setPortfolios] = useState<any[]>([DEFAULT_PORTFOLIO]);
  const [activePortfolioId, setActivePortfolioId] = useState('default');
  const [tradingPlans, setTradingPlans] = useState([]);
  const [ipoEvents, setIpoEvents] = useState<any[]>([]);
  const [ipoEntries, setIpoEntries] = useState<any[]>([]);
  const [bsjpTrades, setBsjpTrades] = useState<any[]>([]);
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
    avg: { purchases: [{ price: '', lots: '' }, { price: '', lots: '' }] },
    avgdown: { currentAvg: '', currentLots: '', currentPrice: '', targetAvg: '' },
    rr: { entry: '', stopLoss: '', takeProfit: '', lots: '1' },
    position: { capital: '', risk: '2', entry: '', stopLoss: '' },
    target: { buyPrice: '', targetPct: '', buyFee: '0.15', sellFee: '0.25' },
    compound: { principal: '10000000', rate: '5', months: '12' },
    pension: { currentAge: '25', retireAge: '55', monthlyExpense: '5000000', currentSavings: '10000000', inflationPercent: '4', returnPercent: '10', swrPercent: '4' }
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [databaseSetupError, setDatabaseSetupError] = useState('');

  const applyData = useCallback((data) => {
    setAllTrades(data.trades || []);
    setWatchlist(data.watchlist || []);
    setNotes(data.notes || []);
    setAllCashflows(data.cashflows || []);
    setAllDividends(data.dividends || []);
    setSettings(normalizeSettings(data.settings));
    setMarketPrices(data.marketPrices || {});
    setPortfolios(data.portfolios && data.portfolios.length > 0 ? data.portfolios : [DEFAULT_PORTFOLIO]);
    setTradingPlans(data.tradingPlans || []);
    setIpoEvents(data.ipoEvents || []);
    setIpoEntries(data.ipoEntries || []);
    setBsjpTrades(data.bsjpTrades || []);
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
      setDataLoading(false);
      return;
    }

    let cancelled = false;

    async function loadData() {
      setDataLoading(true);
      setDataError('');
      setDatabaseSetupError('');
      try {
        if (isSupabaseConfigured) {
          const remoteData = await loadUserData(userId);
          const nextData = await migrateLocalDataToSupabase(userId, remoteData);
          if (cancelled) return;
          applyData(nextData);
        } else {
          migrateGlobalToUser(userId);
          migrateWorkspaceScopeToUserScope(userId);
          const localData = loadLocalData(userId);
          applyData(localData);
        }
      } catch (error) {
        if (isMissingDatabaseSetupError(error)) {
          setDatabaseSetupError(error.message);
        } else {
          setDataError(error.message);
          showToast(`Gagal memuat data: ${error.message}`, 'error');
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
    if (isSupabaseConfigured) {
      saveUserData(key, value, userId)
        .catch((error) => {
          showToast(`Gagal menyimpan ${key}: ${error.message}`, 'error');
        });
    } else {
      setScopedItem(key, userId, value);
    }
  }, [userId, showToast]);

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
    showToast('Transaksi berhasil ditambahkan');
    return newTrade;
  };

  const updateTrade = (id, updates) => {
    if (!ensureWritable()) return;
    const updated = allTrades.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
    saveTrades(updated);
    showToast('Transaksi berhasil diperbarui');
  };

  const deleteTrade = (id) => {
    if (!ensureWritable()) return;
    const updated = allTrades.filter(t => t.id !== id);
    saveTrades(updated);
    showToast('Transaksi berhasil dihapus');
  };

  const getTradeById = (id) => allTrades.find(t => t.id === id);

  // === WATCHLIST CRUD ===
  const addWatchlistItem = (item) => {
    if (!ensureWritable()) return;
    const newItem = { ...item, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newItem, ...watchlist];
    setWatchlist(updated);
    persistData('watchlist', updated);
    showToast('Item watchlist ditambahkan');
  };

  const updateWatchlistItem = (id, updates) => {
    if (!ensureWritable()) return;
    const updated = watchlist.map(w => w.id === id ? { ...w, ...updates } : w);
    setWatchlist(updated);
    persistData('watchlist', updated);
  };

  const deleteWatchlistItem = (id) => {
    if (!ensureWritable()) return;
    const updated = watchlist.filter(w => w.id !== id);
    setWatchlist(updated);
    persistData('watchlist', updated);
    showToast('Item watchlist dihapus');
  };

  // === NOTES CRUD ===
  const addNote = (note) => {
    if (!ensureWritable()) return;
    const newNote = { ...note, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newNote, ...notes];
    setNotes(updated);
    persistData('notes', updated);
    showToast('Catatan disimpan');
  };

  const updateNote = (id, updates) => {
    if (!ensureWritable()) return;
    const updated = notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n);
    setNotes(updated);
    persistData('notes', updated);
  };

  const deleteNote = (id) => {
    if (!ensureWritable()) return;
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    persistData('notes', updated);
    showToast('Catatan dihapus');
  };

  // === CASHFLOW CRUD ===
  const addCashflow = (cf) => {
    if (!ensureWritable()) return;
    const newCf = { 
      ...cf, 
      id: generateId(), 
      createdAt: new Date().toISOString(),
      portfolioId: activePortfolioId
    };
    const updated = [newCf, ...allCashflows];
    setAllCashflows(updated);
    persistData('cashflows', updated);
    showToast('Transaksi kas berhasil dicatat');
  };

  const deleteCashflow = (id) => {
    if (!ensureWritable()) return;
    const updated = allCashflows.filter(c => c.id !== id);
    setAllCashflows(updated);
    persistData('cashflows', updated);
    showToast('Transaksi kas dibatalkan');
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
    showToast('Catatan dividen ditambahkan');
  };

  const deleteDividend = (id) => {
    if (!ensureWritable()) return;
    const updated = allDividends.filter(d => d.id !== id);
    setAllDividends(updated);
    persistData('dividends', updated);
    showToast('Catatan dividen dihapus');
  };

  // === PORTFOLIO CRUD ===
  const addPortfolio = (name, description = '') => {
    if (!ensureWritable()) return null;
    const newPort = {
      id: generateId(),
      name,
      description,
      createdAt: new Date().toISOString()
    };
    const updated = [...portfolios, newPort];
    setPortfolios(updated);
    persistData('portfolios', updated);
    showToast('Portofolio berhasil dibuat');
    return newPort;
  };

  const updatePortfolio = (id, updates) => {
    if (!ensureWritable()) return;
    const updated = portfolios.map(p => p.id === id ? { ...p, ...updates } : p);
    setPortfolios(updated);
    persistData('portfolios', updated);
    showToast('Portofolio berhasil diperbarui');
  };

  const deletePortfolio = (id) => {
    if (!ensureWritable()) return;
    if (id === 'default') {
      showToast('Portofolio utama tidak bisa dihapus', 'error');
      return;
    }
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

    showToast('Portofolio beserta datanya berhasil dihapus');
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
      showToast('Rencana trading disimpan');
    };

    const deleteTradingPlan = (id) => {
      if (!ensureWritable()) return;
      const updated = tradingPlans.filter(p => p.id !== id);
      setTradingPlans(updated);
      persistData('tradingPlans', updated);
      showToast('Rencana trading dihapus');
    };

  // === IPO EVENTS CRUD ===
  const addIpoEvent = (event: any) => {
    if (!ensureWritable()) return;
    const newEvent = { ...event, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newEvent, ...ipoEvents];
    setIpoEvents(updated);
    persistData('ipoEvents', updated);
    showToast('IPO event berhasil dibuat');
    return newEvent;
  };

  const updateIpoEvent = (id: string, updates: any) => {
    if (!ensureWritable()) return;
    const updated = ipoEvents.map(e => e.id === id ? { ...e, ...updates } : e);
    setIpoEvents(updated);
    persistData('ipoEvents', updated);
    showToast('IPO event diperbarui');
  };

  const deleteIpoEvent = (id: string) => {
    if (!ensureWritable()) return;
    const updatedEvents = ipoEvents.filter(e => e.id !== id);
    setIpoEvents(updatedEvents);
    persistData('ipoEvents', updatedEvents);
    // Also delete all entries for this event
    const updatedEntries = ipoEntries.filter((e: any) => e.ipoEventId !== id);
    setIpoEntries(updatedEntries);
    persistData('ipoEntries', updatedEntries);
    showToast('IPO event dihapus');
  };

  // === IPO ENTRIES CRUD ===
  const addIpoEntry = (entry: any) => {
    if (!ensureWritable()) return;
    const newEntry = { ...entry, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [...ipoEntries, newEntry];
    setIpoEntries(updated);
    persistData('ipoEntries', updated);
    showToast('Entry akun ditambahkan');
    return newEntry;
  };

  const updateIpoEntry = (id: string, updates: any) => {
    if (!ensureWritable()) return;
    const updated = ipoEntries.map((e: any) => e.id === id ? { ...e, ...updates } : e);
    setIpoEntries(updated);
    persistData('ipoEntries', updated);
    showToast('Entry diperbarui');
  };

  const deleteIpoEntry = (id: string) => {
    if (!ensureWritable()) return;
    const updated = ipoEntries.filter((e: any) => e.id !== id);
    setIpoEntries(updated);
    persistData('ipoEntries', updated);
    showToast('Entry dihapus');
  };

  // Batch add — used for duplicating; avoids stale-state bug of calling addIpoEntry in a loop
  const batchAddIpoEntries = (entries: any[]) => {
    if (!ensureWritable()) return;
    const newEntries = entries.map(entry => ({
      ...entry,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }));
    const updated = [...ipoEntries, ...newEntries];
    setIpoEntries(updated);
    persistData('ipoEntries', updated);
    showToast(`${newEntries.length} entry berhasil disalin`);
  };

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
    showToast('Transaksi BSJP berhasil ditambahkan');
    return newTrade;
  };

  const updateBsjpTrade = (id, updates) => {
    if (!ensureWritable()) return;
    const updated = bsjpTrades.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
    setBsjpTrades(updated);
    persistData('bsjpTrades', updated);
    showToast('Transaksi BSJP berhasil diperbarui');
  };

  const deleteBsjpTrade = (id) => {
    if (!ensureWritable()) return;
    const updated = bsjpTrades.filter(t => t.id !== id);
    setBsjpTrades(updated);
    persistData('bsjpTrades', updated);
    showToast('Transaksi BSJP berhasil dihapus');
  };

  // === SETTINGS ===
  const updateSettings = (updates) => {
    if (!ensureWritable()) return;
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    persistData('settings', newSettings);
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
    bsjpTrades,
    exportDate: new Date().toISOString(),
    version: '2.0',
    storage: isSupabaseConfigured ? 'supabase' : 'localStorage',
  });

  const importData = async (data) => {
    if (!ensureWritable()) return;
    if (!data || !data.version) throw new Error('Format data tidak valid');
    const nextData = {
      trades: data.trades || [],
      watchlist: data.watchlist || [],
      notes: data.notes || [],
      cashflows: data.cashflows || [],
      dividends: data.dividends || [],
      settings: normalizeSettings(data.settings || settings),
      marketPrices: data.marketPrices || {},
      portfolios: data.portfolios || [DEFAULT_PORTFOLIO],
      bsjpTrades: data.bsjpTrades || [],
    };

    applyData(nextData);

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
    setBsjpTrades([]);

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
      setScopedItem('active_portfolio', userId, 'default');
      setScopedItem('bsjpTrades', userId, []);
    }
  };

  return (
    <DataContext.Provider value={{
      trades: filteredTrades,
      allTrades,
      addTrade,
      updateTrade,
      deleteTrade,
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
      deleteCashflow,
      dividends: filteredDividends,
      allDividends,
      addDividend,
      deleteDividend,
      settings,
      updateSettings,
      marketPrices,
      updateMarketPrice,
      portfolios,
      activePortfolioId,
      addPortfolio,
      updatePortfolio,
      deletePortfolio,
      selectPortfolio,
      tradingPlans,
      addTradingPlan,
      deleteTradingPlan,
      ipoEvents,
      ipoEntries,
      addIpoEvent,
      updateIpoEvent,
      deleteIpoEvent,
      addIpoEntry,
      updateIpoEntry,
      deleteIpoEntry,
      batchAddIpoEntries,
      bsjpTrades,
      addBsjpTrade,
      updateBsjpTrade,
      deleteBsjpTrade,
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

function normalizeSettings(settings) {
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

function loadLocalData(userId) {
  return {
    trades: getScopedItem('trades', userId) || [],
    watchlist: getScopedItem('watchlist', userId) || [],
    notes: getScopedItem('notes', userId) || [],
    cashflows: getScopedItem('cashflows', userId) || [],
    dividends: getScopedItem('dividends', userId) || [],
    settings: normalizeSettings(getScopedItem('settings', userId)),
    marketPrices: getScopedItem('marketPrices', userId) || {},
    tradingPlans: getScopedItem('tradingPlans', userId) || [],
    ipoEvents: getScopedItem('ipoEvents', userId) || [],
    ipoEntries: getScopedItem('ipoEntries', userId) || [],
    bsjpTrades: getScopedItem('bsjpTrades', userId) || [],
  };
}

function hasStoredData(data) {
  return LOCAL_DATA_KEYS.some((key) => {
    const value = data[key];
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return value != null;
  });
}

async function migrateLocalDataToSupabase(userId, remoteData) {
  const normalizedRemote = {
    ...remoteData,
    settings: normalizeSettings(remoteData.settings),
  };

  if (hasStoredData(remoteData)) return normalizedRemote;

  migrateGlobalToUser(userId);
  migrateWorkspaceScopeToUserScope(userId);
  const localData = loadLocalData(userId);
  if (!hasStoredData(localData)) return normalizedRemote;

  await replaceAllUserData(localData, userId);
  return localData;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
