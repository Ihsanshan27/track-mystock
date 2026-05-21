import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getScopedItem, setScopedItem, generateId, migrateGlobalToUser } from '../utils/storage';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [trades, setTrades] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [notes, setNotes] = useState([]);
  const [cashflows, setCashflows] = useState([]);
  const [dividends, setDividends] = useState([]);
  const [settings, setSettings] = useState({
    initialCapital: 10000000,
    monthlyTarget: 5,
    defaultBuyFee: 0.15,
    defaultSellFee: 0.25,
    initialCapitalUS: 1000,
    defaultBuyFeeUS: 0,
    defaultSellFeeUS: 0,
  });
  const [marketPrices, setMarketPrices] = useState({});
  const [toasts, setToasts] = useState([]);

  // Load user-scoped data (with one-time migration from global keys)
  useEffect(() => {
    if (!userId) return;

    // Migrate old global data to this user's scoped keys (runs once)
    migrateGlobalToUser(userId);

    setTrades(getScopedItem('trades', userId) || []);
    setWatchlist(getScopedItem('watchlist', userId) || []);
    setNotes(getScopedItem('notes', userId) || []);
    setCashflows(getScopedItem('cashflows', userId) || []);
    setDividends(getScopedItem('dividends', userId) || []);
    const savedSettings = getScopedItem('settings', userId);
    if (savedSettings) setSettings(savedSettings);
    setMarketPrices(getScopedItem('marketPrices', userId) || {});
  }, [userId]);

  // Persist trades
  const saveTrades = useCallback((newTrades) => {
    setTrades(newTrades);
    setScopedItem('trades', userId, newTrades);
  }, [userId]);

  // Toast helper
  const showToast = useCallback((message, type = 'success') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

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
    setScopedItem('watchlist', userId, updated);
    showToast('Item watchlist ditambahkan');
  };

  const updateWatchlistItem = (id, updates) => {
    const updated = watchlist.map(w => w.id === id ? { ...w, ...updates } : w);
    setWatchlist(updated);
    setScopedItem('watchlist', userId, updated);
  };

  const deleteWatchlistItem = (id) => {
    const updated = watchlist.filter(w => w.id !== id);
    setWatchlist(updated);
    setScopedItem('watchlist', userId, updated);
    showToast('Item watchlist dihapus');
  };

  // === NOTES CRUD ===
  const addNote = (note) => {
    const newNote = { ...note, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newNote, ...notes];
    setNotes(updated);
    setScopedItem('notes', userId, updated);
    showToast('Catatan disimpan');
  };

  const updateNote = (id, updates) => {
    const updated = notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n);
    setNotes(updated);
    setScopedItem('notes', userId, updated);
  };

  const deleteNote = (id) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    setScopedItem('notes', userId, updated);
    showToast('Catatan dihapus');
  };

  // === CASHFLOW CRUD ===
  const addCashflow = (cf) => {
    const newCf = { ...cf, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newCf, ...cashflows];
    setCashflows(updated);
    setScopedItem('cashflows', userId, updated);
    showToast('Transaksi kas berhasil dicatat');
  };

  const deleteCashflow = (id) => {
    const updated = cashflows.filter(c => c.id !== id);
    setCashflows(updated);
    setScopedItem('cashflows', userId, updated);
    showToast('Transaksi kas dibatalkan');
  };

  // === DIVIDENDS CRUD ===
  const addDividend = (div) => {
    const newDiv = { ...div, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newDiv, ...dividends];
    setDividends(updated);
    setScopedItem('dividends', userId, updated);
    showToast('Catatan dividen ditambahkan');
  };

  const deleteDividend = (id) => {
    const updated = dividends.filter(d => d.id !== id);
    setDividends(updated);
    setScopedItem('dividends', userId, updated);
    showToast('Catatan dividen dihapus');
  };

  // === SETTINGS ===
  const updateSettings = (updates) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    setScopedItem('settings', userId, newSettings);
    showToast('Pengaturan disimpan');
  };

  const updateMarketPrice = (stockCode, price) => {
    const updated = { ...marketPrices, [stockCode]: parseFloat(price) || 0 };
    setMarketPrices(updated);
    setScopedItem('marketPrices', userId, updated);
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
      toasts,
      showToast,
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
