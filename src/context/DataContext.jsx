import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getScopedItem, setScopedItem, generateId, migrateGlobalToUser } from '../utils/storage';
import { useAuth } from './AuthContext';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { clearUserData, loadUserData, replaceAllUserData, saveUserData } from '../services/supabaseDataService';
import { devLog } from '../utils/devLogger';
import { isMissingDatabaseSetupError } from '../utils/errorMessages';

const DataContext = createContext(null);
const DEFAULT_SETTINGS = {
  initialCapital: 10000000,
  monthlyTarget: 5,
  defaultBuyFee: 0.15,
  defaultSellFee: 0.25,
  initialCapitalUS: 1000,
  defaultBuyFeeUS: 0,
  defaultSellFeeUS: 0,
};
const LOCAL_DATA_KEYS = ['trades', 'watchlist', 'notes', 'cashflows', 'dividends', 'settings', 'marketPrices'];

export function DataProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [trades, setTrades] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [notes, setNotes] = useState([]);
  const [cashflows, setCashflows] = useState([]);
  const [dividends, setDividends] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [marketPrices, setMarketPrices] = useState({});
  const [toasts, setToasts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [databaseSetupError, setDatabaseSetupError] = useState('');

  const applyData = useCallback((data) => {
    setTrades(data.trades || []);
    setWatchlist(data.watchlist || []);
    setNotes(data.notes || []);
    setCashflows(data.cashflows || []);
    setDividends(data.dividends || []);
    setSettings(normalizeSettings(data.settings));
    setMarketPrices(data.marketPrices || {});
  }, []);

  // Toast helper
  const showToast = useCallback((message, type = 'success') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // Load user-scoped data (with one-time migration from global keys)
  useEffect(() => {
    if (!userId) {
      devLog('data:reset-anonymous');
      setTrades([]);
      setWatchlist([]);
      setNotes([]);
      setCashflows([]);
      setDividends([]);
      setSettings(DEFAULT_SETTINGS);
      setMarketPrices({});
      setDataLoading(false);
      return;
    }

    let cancelled = false;

    async function loadData() {
      setDataLoading(true);
      setDataError('');
      setDatabaseSetupError('');
      devLog('data:load-start', { userId, storage: isSupabaseConfigured ? 'supabase' : 'localStorage' });
      try {
        if (isSupabaseConfigured) {
          const remoteData = await loadUserData(userId);
          const nextData = await migrateLocalDataToSupabase(userId, remoteData);
          if (cancelled) return;
          applyData(nextData);
          devLog('data:load-success', { userId, storage: 'supabase', summary: getDataSummary(nextData) });
        } else {
          migrateGlobalToUser(userId);
          const localData = loadLocalData(userId);
          applyData(localData);
          devLog('data:load-success', { userId, storage: 'localStorage', summary: getDataSummary(localData) });
        }
      } catch (error) {
        devLog('data:load-error', { userId, error: error.message });
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
    devLog('data:save-start', { key, userId, storage: isSupabaseConfigured ? 'supabase' : 'localStorage', size: getValueSize(value) });
    if (isSupabaseConfigured) {
      saveUserData(key, value, userId)
        .then(() => devLog('data:save-success', { key, userId, storage: 'supabase' }))
        .catch((error) => {
          devLog('data:save-error', { key, userId, error: error.message });
          showToast(`Gagal menyimpan ${key}: ${error.message}`, 'error');
        });
    } else {
      setScopedItem(key, userId, value);
      devLog('data:save-success', { key, userId, storage: 'localStorage' });
    }
  }, [userId, showToast]);

  // Persist trades
  const saveTrades = useCallback((newTrades) => {
    setTrades(newTrades);
    persistData('trades', newTrades);
  }, [persistData]);

  // === TRADE CRUD ===
  const addTrade = (trade) => {
    const newTrade = { ...trade, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newTrade, ...trades];
    saveTrades(updated);
    showToast('Transaksi berhasil ditambahkan');
    return newTrade;
  };

  const updateTrade = (id, updates) => {
    const updated = trades.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
    saveTrades(updated);
    showToast('Transaksi berhasil diperbarui');
  };

  const deleteTrade = (id) => {
    const updated = trades.filter(t => t.id !== id);
    saveTrades(updated);
    showToast('Transaksi berhasil dihapus');
  };

  const getTradeById = (id) => trades.find(t => t.id === id);

  // === WATCHLIST CRUD ===
  const addWatchlistItem = (item) => {
    const newItem = { ...item, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newItem, ...watchlist];
    setWatchlist(updated);
    persistData('watchlist', updated);
    showToast('Item watchlist ditambahkan');
  };

  const updateWatchlistItem = (id, updates) => {
    const updated = watchlist.map(w => w.id === id ? { ...w, ...updates } : w);
    setWatchlist(updated);
    persistData('watchlist', updated);
  };

  const deleteWatchlistItem = (id) => {
    const updated = watchlist.filter(w => w.id !== id);
    setWatchlist(updated);
    persistData('watchlist', updated);
    showToast('Item watchlist dihapus');
  };

  // === NOTES CRUD ===
  const addNote = (note) => {
    const newNote = { ...note, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newNote, ...notes];
    setNotes(updated);
    persistData('notes', updated);
    showToast('Catatan disimpan');
  };

  const updateNote = (id, updates) => {
    const updated = notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n);
    setNotes(updated);
    persistData('notes', updated);
  };

  const deleteNote = (id) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    persistData('notes', updated);
    showToast('Catatan dihapus');
  };

  // === CASHFLOW CRUD ===
  const addCashflow = (cf) => {
    const newCf = { ...cf, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newCf, ...cashflows];
    setCashflows(updated);
    persistData('cashflows', updated);
    showToast('Transaksi kas berhasil dicatat');
  };

  const deleteCashflow = (id) => {
    const updated = cashflows.filter(c => c.id !== id);
    setCashflows(updated);
    persistData('cashflows', updated);
    showToast('Transaksi kas dibatalkan');
  };

  // === DIVIDENDS CRUD ===
  const addDividend = (div) => {
    const newDiv = { ...div, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newDiv, ...dividends];
    setDividends(updated);
    persistData('dividends', updated);
    showToast('Catatan dividen ditambahkan');
  };

  const deleteDividend = (id) => {
    const updated = dividends.filter(d => d.id !== id);
    setDividends(updated);
    persistData('dividends', updated);
    showToast('Catatan dividen dihapus');
  };

  // === SETTINGS ===
  const updateSettings = (updates) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    persistData('settings', newSettings);
    showToast('Pengaturan disimpan');
  };

  const updateMarketPrice = (stockCode, price) => {
    const updated = { ...marketPrices, [stockCode]: parseFloat(price) || 0 };
    setMarketPrices(updated);
    persistData('marketPrices', updated);
  };

  const exportData = () => ({
    trades,
    watchlist,
    notes,
    cashflows,
    dividends,
    settings,
    marketPrices,
    exportDate: new Date().toISOString(),
    version: '2.0',
    storage: isSupabaseConfigured ? 'supabase' : 'localStorage',
  });

  const importData = async (data) => {
    if (!data || !data.version) throw new Error('Format data tidak valid');
    devLog('data:import-start', { userId, version: data.version });
    const nextData = {
      trades: data.trades || [],
      watchlist: data.watchlist || [],
      notes: data.notes || [],
      cashflows: data.cashflows || [],
      dividends: data.dividends || [],
      settings: normalizeSettings(data.settings || settings),
      marketPrices: data.marketPrices || {},
    };

    applyData(nextData);

    if (isSupabaseConfigured) {
      await replaceAllUserData(nextData, userId);
    } else {
      Object.entries(nextData).forEach(([key, value]) => setScopedItem(key, userId, value));
    }
    devLog('data:import-success', { userId, summary: getDataSummary(nextData) });
  };

  const clearData = async () => {
    devLog('data:clear-start', { userId, storage: isSupabaseConfigured ? 'supabase' : 'localStorage' });
    setTrades([]);
    setWatchlist([]);
    setNotes([]);
    setCashflows([]);
    setDividends([]);
    setSettings(DEFAULT_SETTINGS);
    setMarketPrices({});

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
    }
    devLog('data:clear-success', { userId });
  };

  return (
    <DataContext.Provider value={{
      trades, addTrade, updateTrade, deleteTrade, getTradeById,
      watchlist, addWatchlistItem, updateWatchlistItem, deleteWatchlistItem,
      notes, addNote, updateNote, deleteNote,
      cashflows, addCashflow, deleteCashflow,
      dividends, addDividend, deleteDividend,
      settings, updateSettings,
      marketPrices, updateMarketPrice,
      dataLoading,
      dataError,
      databaseSetupError,
      exportData, importData, clearData,
      toasts,
      showToast,
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
  const localData = loadLocalData(userId);
  if (!hasStoredData(localData)) return normalizedRemote;

  devLog('data:migrate-local-to-supabase-start', { userId, summary: getDataSummary(localData) });
  await replaceAllUserData(localData, userId);
  devLog('data:migrate-local-to-supabase-success', { userId });
  return localData;
}

function getValueSize(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value).length;
  return value == null ? 0 : 1;
}

function getDataSummary(data) {
  return {
    trades: data.trades?.length || 0,
    watchlist: data.watchlist?.length || 0,
    notes: data.notes?.length || 0,
    cashflows: data.cashflows?.length || 0,
    dividends: data.dividends?.length || 0,
    marketPrices: getValueSize(data.marketPrices),
    hasSettings: Boolean(data.settings),
  };
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
