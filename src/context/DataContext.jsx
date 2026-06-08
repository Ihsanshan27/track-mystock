import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getWorkspaceScopedItem,
  setWorkspaceScopedItem,
  generateId,
  migrateGlobalToUser,
  migrateUserScopeToWorkspaceScope,
} from '../utils/storage';
import { useAuth } from './AuthContext';
import { usePermissions } from './PermissionContext';
import { useWorkspace } from './WorkspaceContext';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { clearUserData, loadUserData, replaceAllUserData, saveUserData } from '../services/supabaseDataService';
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
  const { can, roleLabel } = usePermissions();
  const { activeWorkspace, activeWorkspaceId, workspaceLoading } = useWorkspace();
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

  const ensureWritable = useCallback(() => {
    if (can('journal:write')) return true;
    showToast(`Role ${roleLabel} hanya punya akses baca.`, 'error');
    return false;
  }, [can, roleLabel, showToast]);

  // Load user-scoped data (with one-time migration from global keys)
  useEffect(() => {
    if (!userId) {
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

    if (workspaceLoading) {
      setDataLoading(true);
      return;
    }

    let cancelled = false;

    async function loadData() {
      setDataLoading(true);
      setDataError('');
      setDatabaseSetupError('');
      try {
        if (isSupabaseConfigured) {
          const remoteData = await loadUserData(userId, activeWorkspaceId);
          const nextData = await migrateLocalDataToSupabase(userId, activeWorkspaceId, remoteData);
          if (cancelled) return;
          applyData(nextData);
        } else {
          migrateGlobalToUser(userId);
          migrateUserScopeToWorkspaceScope(userId);
          const localData = loadLocalData(userId, activeWorkspaceId);
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
  }, [userId, showToast, applyData, activeWorkspaceId, workspaceLoading]);

  const persistData = useCallback((key, value) => {
    if (!userId) return;
    if (isSupabaseConfigured) {
      saveUserData(key, value, userId, activeWorkspaceId)
        .catch((error) => {
          showToast(`Gagal menyimpan ${key}: ${error.message}`, 'error');
        });
    } else {
      setWorkspaceScopedItem(key, userId, activeWorkspaceId, value);
    }
  }, [userId, showToast, activeWorkspaceId]);

  // Persist trades
  const saveTrades = useCallback((newTrades) => {
    setTrades(newTrades);
    persistData('trades', newTrades);
    return newTrades;
  }, [persistData]);

  // === TRADE CRUD ===
  const addTrade = (trade) => {
    if (!ensureWritable()) return null;
    const newTrade = { ...trade, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newTrade, ...trades];
    saveTrades(updated);
    showToast('Transaksi berhasil ditambahkan');
    return newTrade;
  };

  const updateTrade = (id, updates) => {
    if (!ensureWritable()) return;
    const updated = trades.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
    saveTrades(updated);
    showToast('Transaksi berhasil diperbarui');
  };

  const deleteTrade = (id) => {
    if (!ensureWritable()) return;
    const updated = trades.filter(t => t.id !== id);
    saveTrades(updated);
    showToast('Transaksi berhasil dihapus');
  };

  const getTradeById = (id) => trades.find(t => t.id === id);

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
    const newCf = { ...cf, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newCf, ...cashflows];
    setCashflows(updated);
    persistData('cashflows', updated);
    showToast('Transaksi kas berhasil dicatat');
  };

  const deleteCashflow = (id) => {
    if (!ensureWritable()) return;
    const updated = cashflows.filter(c => c.id !== id);
    setCashflows(updated);
    persistData('cashflows', updated);
    showToast('Transaksi kas dibatalkan');
  };

  // === DIVIDENDS CRUD ===
  const addDividend = (div) => {
    if (!ensureWritable()) return;
    const newDiv = { ...div, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newDiv, ...dividends];
    setDividends(updated);
    persistData('dividends', updated);
    showToast('Catatan dividen ditambahkan');
  };

  const deleteDividend = (id) => {
    if (!ensureWritable()) return;
    const updated = dividends.filter(d => d.id !== id);
    setDividends(updated);
    persistData('dividends', updated);
    showToast('Catatan dividen dihapus');
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
    trades,
    watchlist,
    notes,
    cashflows,
    dividends,
    settings,
    marketPrices,
    exportDate: new Date().toISOString(),
    version: '2.0',
    workspaceId: activeWorkspaceId,
    workspaceName: activeWorkspace?.name || 'Personal',
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
    };

    applyData(nextData);

    if (isSupabaseConfigured) {
      await replaceAllUserData(nextData, userId, activeWorkspaceId);
    } else {
      Object.entries(nextData).forEach(([key, value]) => setWorkspaceScopedItem(key, userId, activeWorkspaceId, value));
    }
  };

  const clearData = async () => {
    if (!ensureWritable()) return;
    setTrades([]);
    setWatchlist([]);
    setNotes([]);
    setCashflows([]);
    setDividends([]);
    setSettings(DEFAULT_SETTINGS);
    setMarketPrices({});

    if (isSupabaseConfigured) {
      await clearUserData(userId, activeWorkspaceId);
    } else {
      setWorkspaceScopedItem('trades', userId, activeWorkspaceId, []);
      setWorkspaceScopedItem('watchlist', userId, activeWorkspaceId, []);
      setWorkspaceScopedItem('notes', userId, activeWorkspaceId, []);
      setWorkspaceScopedItem('cashflows', userId, activeWorkspaceId, []);
      setWorkspaceScopedItem('dividends', userId, activeWorkspaceId, []);
      setWorkspaceScopedItem('settings', userId, activeWorkspaceId, DEFAULT_SETTINGS);
      setWorkspaceScopedItem('marketPrices', userId, activeWorkspaceId, {});
    }
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
      canWrite: can('journal:write'),
    }}>
      {children}
    </DataContext.Provider>
  );
}

function normalizeSettings(settings) {
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

function loadLocalData(userId, workspaceId) {
  return {
    trades: getWorkspaceScopedItem('trades', userId, workspaceId) || [],
    watchlist: getWorkspaceScopedItem('watchlist', userId, workspaceId) || [],
    notes: getWorkspaceScopedItem('notes', userId, workspaceId) || [],
    cashflows: getWorkspaceScopedItem('cashflows', userId, workspaceId) || [],
    dividends: getWorkspaceScopedItem('dividends', userId, workspaceId) || [],
    settings: normalizeSettings(getWorkspaceScopedItem('settings', userId, workspaceId)),
    marketPrices: getWorkspaceScopedItem('marketPrices', userId, workspaceId) || {},
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

async function migrateLocalDataToSupabase(userId, workspaceId, remoteData) {
  const normalizedRemote = {
    ...remoteData,
    settings: normalizeSettings(remoteData.settings),
  };

  if (hasStoredData(remoteData)) return normalizedRemote;

  migrateGlobalToUser(userId);
  migrateUserScopeToWorkspaceScope(userId);
  const localData = loadLocalData(userId, workspaceId);
  if (!hasStoredData(localData)) return normalizedRemote;

  await replaceAllUserData(localData, userId, workspaceId);
  return localData;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
