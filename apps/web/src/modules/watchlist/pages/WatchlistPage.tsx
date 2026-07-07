import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { useTableSort } from '@/modules/shared/hooks/useTableSort';
import { WATCHLIST_STATUS, WATCHLIST_PRIORITY } from '@/modules/shared/utils/constants';
import { formatRupiah, formatDate, formatPercent } from '@/modules/shared/utils/formatters';
import { Eye, Plus, X, Trash2, Save, TrendingUp, TrendingDown, Edit3 } from 'lucide-react';
import { fetchQuotesBatch, fetchStockOHLCV } from '@/modules/shared/services/yahooFinanceService';
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';
import { calculateIndicators, isMacdGoldenCross, isEmaGoldenCross, getLatestEmaValues } from '@/modules/shared/utils/technicalIndicators';

const MANUAL_RECOMMENDATIONS = [
  { value: 'NONE', label: 'Otomatis (Sinyal Teknikal)' },
  { value: 'BUY', label: 'Beli (Buy)' },
  { value: 'SELL', label: 'Jual (Sell)' },
  { value: 'HOLD', label: 'Tahan (Hold)' },
  { value: 'NEUTRAL', label: 'Netral' }
];

export default function WatchlistPage() {
  const { watchlist, addWatchlistItem, updateWatchlistItem, deleteWatchlistItem, watchlistFormDraft, setWatchlistFormDraft, showToast } = useData();
  const { confirm } = useDialog();

  const [marketData, setMarketData] = useState<Record<string, any>>({});
  const [ohlcvData, setOhlcvData] = useState<Record<string, any[]>>({});
  const [loadingMarket, setLoadingMarket] = useState(false);

  const watchlistTickersString = watchlist.map(item => `${item.stockCode}-${item.targetPrice}`).join(',');

  useEffect(() => {
    if (watchlist.length === 0) return;

    const loadMarketData = async () => {
      setLoadingMarket(true);
      try {
        const tickers = watchlist.map(item => item.stockCode);
        console.log('[WatchlistPage] Fetching quotes for tickers:', tickers);
        
        // Fetch current quotes in batch
        const quotes = await fetchQuotesBatch(tickers);
        console.log('[WatchlistPage] Fetched quotes result:', quotes);
        setMarketData(prev => ({ ...prev, ...quotes }));

        // Fetch OHLCV histories
        const ohlcvResults: Record<string, any[]> = {};
        await Promise.all(
          tickers.map(async (ticker) => {
            try {
              const data = await fetchStockOHLCV(ticker, '1y');
              ohlcvResults[ticker] = data;
            } catch (err) {
              console.error(`[WatchlistPage] Gagal mengambil OHLCV untuk ${ticker}:`, err);
            }
          })
        );
        console.log('[WatchlistPage] Fetched OHLCV data:', ohlcvResults);
        setOhlcvData(prev => ({ ...prev, ...ohlcvResults }));
      } catch (err) {
        console.error('[WatchlistPage] Gagal mengambil data pasar watchlist:', err);
      } finally {
        setLoadingMarket(false);
      }
    };

    loadMarketData();
  }, [watchlistTickersString]);

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');


  const [showForm, setShowForm] = useState(() => {
    if (watchlistFormDraft) return watchlistFormDraft.showForm;
    return false;
  });

  const [form, setForm] = useState(() => {
    if (watchlistFormDraft) return { categories: [] as string[], ...watchlistFormDraft.form };
    return { stockCode: '', targetPrice: '', targetSellPrice: '', reason: '', status: 'waiting', priority: 'medium', categories: [] as string[], manualRecommendation: 'NONE' };
  });

  useEffect(() => {
    setWatchlistFormDraft({ form, showForm });
  }, [form, showForm, setWatchlistFormDraft]);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleCancelOrToggle = () => {
    if (showForm) {
      setShowForm(false);
      setForm({ stockCode: '', targetPrice: '', targetSellPrice: '', reason: '', status: 'waiting', priority: 'medium', categories: [], manualRecommendation: 'NONE' });
      setWatchlistFormDraft(null);
      setEditingId(null);
      setTagInput('');
    } else {
      setShowForm(true);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.stockCode) return;

    // Save final tag input if any exists but wasn't committed with Enter
    let finalCategories = form.categories || [];
    const val = tagInput.trim().replace(/,/g, '');
    if (val && !finalCategories.includes(val)) {
      finalCategories = [...finalCategories, val];
    }

    const dataToSave = {
      stockCode: form.stockCode.toUpperCase(),
      targetPrice: parseFloat(form.targetPrice) || null,
      targetSellPrice: parseFloat(form.targetSellPrice) || null,
      reason: form.reason,
      status: form.status,
      priority: form.priority,
      categories: finalCategories,
      manualRecommendation: form.manualRecommendation || 'NONE'
    };

    if (editingId) {
      updateWatchlistItem(editingId, dataToSave);
      setEditingId(null);
    } else {
      addWatchlistItem(dataToSave);
    }

    setForm({ stockCode: '', targetPrice: '', targetSellPrice: '', reason: '', status: 'waiting', priority: 'medium', categories: [], manualRecommendation: 'NONE' });
    setShowForm(false);
    setWatchlistFormDraft(null);
    setTagInput('');
  };

  const toggleFormCategory = (cat: string) => {
    const currentCats = form.categories || [];
    let nextCats;
    if (currentCats.includes(cat)) {
      nextCats = currentCats.filter(c => c !== cat);
    } else {
      nextCats = [...currentCats, cat];
    }
    
    setForm(prev => ({
      ...prev,
      categories: nextCats
    }));
  };

  const removeCategoryTag = (cat: string) => {
    setForm(prev => ({
      ...prev,
      categories: (prev.categories || []).filter(c => c !== cat)
    }));
  };

  const deleteCategoryGlobally = async (cat: string) => {
    const isConfirmed = await confirm(`Apakah Anda yakin ingin menghapus kategori "${cat}" dari semua saham di watchlist? Tindakan ini tidak dapat dibatalkan.`, {
      title: 'Hapus Kategori Global',
      severity: 'danger',
      confirmText: 'Hapus'
    });
    if (isConfirmed) {
      watchlist.forEach(item => {
        if (item.categories?.includes(cat)) {
          const updatedCats = item.categories.filter((c: string) => c !== cat);
          updateWatchlistItem(item.id, { categories: updatedCats });
        }
      });
      // Remove from the current form selection as well
      setForm(prev => ({
        ...prev,
        categories: (prev.categories || []).filter(c => c !== cat)
      }));
      if (activeCategory === cat) {
        setActiveCategory('All');
      }
      if (showToast) {
        showToast(`Kategori "${cat}" telah dihapus secara global`);
      }
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/,/g, '');
      if (val && !form.categories?.includes(val)) {
        setForm(prev => ({
          ...prev,
          categories: [...(prev.categories || []), val]
        }));
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && form.categories?.length > 0) {
      setForm(prev => ({
        ...prev,
        categories: prev.categories.slice(0, -1)
      }));
    }
  };

  const handleStartEdit = (item: any) => {
    setForm({
      stockCode: item.stockCode,
      targetPrice: item.targetPrice ? String(item.targetPrice) : '',
      targetSellPrice: item.targetSellPrice ? String(item.targetSellPrice) : '',
      reason: item.reason || '',
      status: item.status || 'waiting',
      priority: item.priority || 'medium',
      categories: item.categories || [],
      manualRecommendation: item.manualRecommendation || 'NONE'
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm('Apakah Anda yakin ingin menghapus saham ini dari watchlist?', {
      title: 'Hapus Saham Watchlist',
      severity: 'danger',
      confirmText: 'Hapus'
    });
    if (isConfirmed) {
      deleteWatchlistItem(id);
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    updateWatchlistItem(id, { status });
  };

  // Extract unique categories from watchlist
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    watchlist.forEach(item => {
      item.categories?.forEach(cat => {
        if (cat) cats.add(cat);
      });
    });
    return Array.from(cats).sort();
  }, [watchlist]);

  // Filter watchlist based on active category
  const filteredWatchlist = useMemo(() => {
    if (activeCategory === 'All') return watchlist;
    if (activeCategory === 'Uncategorized') {
      return watchlist.filter(item => !item.categories || item.categories.length === 0);
    }
    return watchlist.filter(item => item.categories?.includes(activeCategory));
  }, [watchlist, activeCategory]);
  const { sortConfig, sortedItems: sortedWatchlist, requestSort } = useTableSort(filteredWatchlist, {
    initialKey: 'createdAt',
    initialDirection: 'desc',
    getValue: (item: any, key: 'stockCode' | 'marketPrice' | 'trend' | 'targetPrice' | 'distanceToTarget' | 'targetSellPrice' | 'distanceToSellTarget' | 'reason' | 'priority' | 'status' | 'createdAt') => {
      const quote = marketData[item.stockCode];
      if (key === 'marketPrice') return quote?.price ?? -1;
      if (key === 'trend') return quote?.changePct ?? -999;
      if (key === 'distanceToTarget') {
        if (!item.targetPrice || !quote?.price) return 999999;
        return ((item.targetPrice - quote.price) / quote.price) * 100;
      }
      if (key === 'targetSellPrice') return item.targetSellPrice ?? -1;
      if (key === 'distanceToSellTarget') {
        if (!item.targetSellPrice || !quote?.price) return 999999;
        return ((item.targetSellPrice - quote.price) / quote.price) * 100;
      }
      return item[key] || '';
    },
  });

  const renderTechnicalSignals = (item: any) => {
    const ticker = item.stockCode;
    
    let manualRecBadge = null;
    if (item.manualRecommendation && item.manualRecommendation !== 'NONE') {
      let manualStyle = { background: 'rgba(100, 116, 139, 0.12)', color: 'var(--text-secondary)' };
      let label = 'Neutral';
      if (item.manualRecommendation === 'BUY') {
        manualStyle = { background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' };
        label = 'BUY';
      } else if (item.manualRecommendation === 'SELL') {
        manualStyle = { background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)' };
        label = 'SELL';
      } else if (item.manualRecommendation === 'HOLD') {
        manualStyle = { background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' };
        label = 'HOLD';
      } else if (item.manualRecommendation === 'NEUTRAL') {
        manualStyle = { background: 'rgba(100, 116, 139, 0.15)', color: 'var(--text-secondary)' };
        label = 'NEUTRAL';
      }
      
      manualRecBadge = (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Manual:</span>
          <span
            className="badge"
            style={{
              fontSize: '0.68rem',
              padding: '2px 6px',
              fontWeight: 800,
              borderRadius: 4,
              ...manualStyle
            }}
          >
            {label}
          </span>
        </div>
      );
    }

    const ohlcv = ohlcvData[ticker];
    if (!ohlcv || ohlcv.length < 14) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.72rem' }}>
          {manualRecBadge}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Teknikal:</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{loadingMarket ? 'Loading...' : 'N/A'}</span>
          </div>
        </div>
      );
    }

    const ind = calculateIndicators(ohlcv);
    const latestRsi = ind.rsi?.length ? ind.rsi[ind.rsi.length - 1] : null;
    const rsiStatus = latestRsi !== null ? (latestRsi >= 70 ? 'Overbought' : latestRsi <= 30 ? 'Oversold' : 'Normal') : 'Normal';

    const macdVal = ind.macd;
    const isMacdBullish = isMacdGoldenCross(macdVal);

    const emaValues = getLatestEmaValues(ind.ema50, ind.ema200);
    const isEmaBullish = isEmaGoldenCross(ind.ema50, ind.ema200);

    const ema50Val = emaValues.ema50;
    const ema200Val = emaValues.ema200;

    let trendText = '';
    if (ema50Val && ema200Val) {
      trendText = ema50Val > ema200Val ? 'Bullish' : 'Bearish';
    }

    // Recommendation logic
    let recommendation: 'STRONG BUY' | 'BUY' | 'STRONG SELL' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
    let recStyle = { background: 'rgba(100, 116, 139, 0.12)', color: 'var(--text-secondary)' };

    if (latestRsi !== null) {
      if (latestRsi <= 30 && (isMacdBullish || isEmaBullish)) {
        recommendation = 'STRONG BUY';
        recStyle = { background: 'linear-gradient(135deg, #059669, #10B981)', color: '#ffffff' };
      } else if (latestRsi <= 30 || isMacdBullish || isEmaBullish) {
        recommendation = 'BUY';
        recStyle = { background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' };
      } else if (latestRsi >= 70 && trendText === 'Bearish') {
        recommendation = 'STRONG SELL';
        recStyle = { background: 'linear-gradient(135deg, #DC2626, #EF4444)', color: '#ffffff' };
      } else if (latestRsi >= 70) {
        recommendation = 'SELL';
        recStyle = { background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-red)' };
      } else if (trendText === 'Bullish' && latestRsi > 30 && latestRsi < 45) {
        // Pullback to support in uptrend
        recommendation = 'BUY';
        recStyle = { background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' };
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.72rem' }}>
        {manualRecBadge}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Teknikal:</span>
          <span
            className="badge"
            style={{
              fontSize: '0.68rem',
              padding: '2px 6px',
              fontWeight: 800,
              borderRadius: 4,
              ...recStyle
            }}
          >
            {recommendation}
          </span>
        </div>
        {latestRsi !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>RSI:</span>
            <span
              className={`badge ${rsiStatus === 'Oversold' ? 'badge-green' : rsiStatus === 'Overbought' ? 'badge-red' : 'badge-blue'}`}
              style={{ fontSize: '0.66rem', padding: '1px 5px', fontWeight: 700 }}
            >
              {latestRsi.toFixed(1)} {rsiStatus !== 'Normal' ? `(${rsiStatus})` : ''}
            </span>
          </div>
        )}
        {isMacdBullish && (
          <span className="badge badge-green" style={{ fontSize: '0.65rem', alignSelf: 'flex-start', padding: '1px 5px', fontWeight: 700 }}>
            MACD Golden Cross
          </span>
        )}
        {trendText && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <span
              style={{
                fontWeight: 700,
                color: trendText === 'Bullish' ? 'var(--accent-green)' : 'var(--accent-red)'
              }}
            >
              MA: {trendText}
            </span>
            {isEmaBullish && (
              <span className="badge badge-green" style={{ fontSize: '0.65rem', padding: '1px 5px', fontWeight: 700 }}>
                Golden Cross
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="text-zinc-600 dark:text-zinc-400">
            <Eye size={28} />
          </div>
          <div>
            <h1 className="page-title">Watchlist</h1>
            <p className="page-subtitle">{watchlist.length} saham dipantau</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleCancelOrToggle}>
          {showForm ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <X size={16} />
              Batal
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} />
              Tambah Saham
            </span>
          )}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, animation: 'fadeInUp 0.3s ease' }}>
          <div className="card-body">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
              {editingId ? `Edit Pantauan Saham: ${form.stockCode}` : 'Tambah Saham Baru ke Watchlist'}
            </h3>
            <form onSubmit={handleAdd}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Kode Saham *</label>
                  <input
                    className="form-input"
                    placeholder="BBCA"
                    value={form.stockCode}
                    onChange={e => set('stockCode', e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Harga Beli</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="8500"
                    value={form.targetPrice}
                    onChange={e => set('targetPrice', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Harga Jual</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="9500"
                    value={form.targetSellPrice}
                    onChange={e => set('targetSellPrice', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginTop: 12 }}>
                <div className="form-group">
                  <label className="form-label">Prioritas</label>
                  <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                    {WATCHLIST_PRIORITY.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                    {WATCHLIST_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Rekomendasi Manual</label>
                  <select className="form-select" value={form.manualRecommendation} onChange={e => set('manualRecommendation', e.target.value)}>
                    {MANUAL_RECOMMENDATIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Kategori</label>
                <div 
                  className="form-input" 
                  style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 6, 
                    alignItems: 'center', 
                    minHeight: 42,
                    padding: '6px 10px',
                    cursor: 'text'
                  }}
                  onClick={() => document.getElementById('tag-input-field')?.focus()}
                >
                  {form.categories && form.categories.map(cat => (
                    <span 
                      key={cat} 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: 6, 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        padding: '3px 8px', 
                        borderRadius: 'var(--radius-sm, 4px)', 
                        background: 'rgba(59, 130, 246, 0.15)', 
                        color: '#3B82F6', 
                        border: '1px solid rgba(59, 130, 246, 0.3)' 
                      }}
                    >
                      {cat}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCategoryTag(cat);
                        }}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#3B82F6', 
                          cursor: 'pointer', 
                          padding: 0, 
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          fontWeight: 800
                        }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    id="tag-input-field"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder={(!form.categories || form.categories.length === 0) ? "Ketik & tekan Enter untuk membuat kategori baru" : ""}
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      flex: 1,
                      minWidth: 120,
                      padding: 0,
                    }}
                  />
                </div>
                {allCategories.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
                      Pilih kategori yang sudah ada:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {allCategories.map(cat => {
                        const isSelected = form.categories?.includes(cat);
                        const style = isSelected ? {
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#3B82F6',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                        } : {
                          background: 'rgba(100, 116, 139, 0.08)',
                          color: 'var(--text-secondary)',
                          border: '1px solid rgba(100, 116, 139, 0.15)',
                        };
                        return (
                          <div 
                            key={cat} 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              borderRadius: 'var(--radius-sm, 4px)',
                              overflow: 'hidden',
                              ...style
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => toggleFormCategory(cat)}
                              style={{ 
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer', 
                                fontSize: '0.65rem',
                                padding: '3px 8px',
                                fontWeight: 600,
                                color: 'inherit',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {isSelected ? '✓ ' : '+ '} {cat}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCategoryGlobally(cat);
                              }}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: 'none',
                                borderLeft: '1px solid rgba(100, 116, 139, 0.15)',
                                cursor: 'pointer',
                                padding: '3px 6px',
                                display: 'flex',
                                alignItems: 'center',
                                color: 'var(--accent-red, #EF4444)',
                                height: '100%',
                              }}
                              title={`Hapus kategori "${cat}" secara global`}
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Alasan / Catatan</label>
                <textarea
                  className="form-textarea"
                  placeholder="Kenapa saham ini menarik?"
                  value={form.reason}
                  onChange={e => set('reason', e.target.value)}
                  style={{ minHeight: 60 }}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Save size={16} />
                  {editingId ? 'Simpan Perubahan' : 'Tambahkan'}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Watchlist Table */}
      {watchlist.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
            <Eye size={48} />
          </div>
          <div className="empty-state-title">Watchlist kosong</div>
          <div className="empty-state-desc">Tambahkan saham yang ingin Anda pantau</div>
        </div>
      ) : (
        <div>
          {/* Category Filters */}
          {allCategories.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
              <button
                className={`btn ${activeCategory === 'All' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                onClick={() => setActiveCategory('All')}
              >
                Semua ({watchlist.length})
              </button>
              {allCategories.map(cat => {
                const count = watchlist.filter(item => item.categories?.includes(cat)).length;
                return (
                  <button
                    key={cat}
                    className={`btn ${activeCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
              {watchlist.some(item => !item.categories || item.categories.length === 0) && (
                <button
                  className={`btn ${activeCategory === 'Uncategorized' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                  onClick={() => setActiveCategory('Uncategorized')}
                >
                  Tanpa Kategori ({watchlist.filter(item => !item.categories || item.categories.length === 0).length})
                </button>
              )}
            </div>
          )}

          {filteredWatchlist.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                <Eye size={36} />
              </div>
              <div className="empty-state-title" style={{ fontSize: '1.1rem' }}>Kategori "{activeCategory}" kosong</div>
              <div className="empty-state-desc" style={{ fontSize: '0.85rem' }}>Tidak ada saham dalam kategori ini.</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th><SortableTableHeader label="Kode" sortKey="stockCode" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th><SortableTableHeader label="Harga Pasar" sortKey="marketPrice" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th><SortableTableHeader label="Tren (30 H)" sortKey="trend" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th>Rekomendasi / Sinyal</th>
                    <th><SortableTableHeader label="Target Beli" sortKey="targetPrice" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th><SortableTableHeader label="Target Jual" sortKey="targetSellPrice" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th><SortableTableHeader label="Alasan" sortKey="reason" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th><SortableTableHeader label="Prioritas" sortKey="priority" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th><SortableTableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th><SortableTableHeader label="Tanggal" sortKey="createdAt" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedWatchlist.map(item => {
                    const priority = WATCHLIST_PRIORITY.find(p => p.value === item.priority);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div>
                            <strong>{item.stockCode}</strong>
                            {marketData[item.stockCode]?.name && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {marketData[item.stockCode].name}
                              </div>
                            )}
                            {item.categories && item.categories.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                {item.categories.map(cat => (
                                  <span key={cat} style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 5px', borderRadius: 'var(--radius-sm, 4px)', background: 'rgba(100,116,139,0.15)', color: 'var(--text-secondary)', border: '1px solid rgba(100,116,139,0.2)' }}>
                                    {cat}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          {marketData[item.stockCode] ? (
                            marketData[item.stockCode].price !== null ? (
                              <div>
                                <span style={{ fontWeight: 600 }}>{formatRupiah(marketData[item.stockCode].price)}</span>
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 2, 
                                  fontSize: '0.75rem', 
                                  fontWeight: 600, 
                                  color: (marketData[item.stockCode].changePct ?? 0) >= 0 ? '#10B981' : '#EF4444' 
                                }}>
                                  {(marketData[item.stockCode].changePct ?? 0) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                  {formatPercent(marketData[item.stockCode].changePct ?? 0)}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              {loadingMarket ? '...' : '-'}
                            </span>
                          )}
                        </td>
                        <td>
                          {ohlcvData[item.stockCode] && ohlcvData[item.stockCode].length > 0 ? (
                            <div style={{ width: 80, height: 32 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={ohlcvData[item.stockCode]}>
                                  <YAxis domain={['auto', 'auto']} hide />
                                  <Line 
                                    type="monotone" 
                                    dataKey="close" 
                                    stroke={(marketData[item.stockCode]?.changePct ?? 0) >= 0 ? '#10B981' : '#EF4444'} 
                                    strokeWidth={1.5} 
                                    dot={false} 
                                    isAnimationActive={false} 
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <div style={{ width: 80, height: 32, background: 'rgba(30,41,59,0.2)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                              {loadingMarket ? '...' : 'N/A'}
                            </div>
                          )}
                        </td>
                        <td>
                          {renderTechnicalSignals(item)}
                        </td>
                        <td>{item.targetPrice ? formatRupiah(item.targetPrice) : '-'}</td>
                        <td>{item.targetSellPrice ? formatRupiah(item.targetSellPrice) : '-'}</td>
                        <td style={{ maxWidth: 200, fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.reason}>{item.reason || '-'}</td>
                        <td><span className={`badge badge-${priority?.color || 'blue'}`}>{priority?.label || item.priority}</span></td>
                        <td>
                          <select
                            className="form-select"
                            style={{ width: 130, padding: '4px 10px', fontSize: '0.8rem' }}
                            value={item.status}
                            onChange={e => handleStatusChange(item.id, e.target.value)}
                          >
                            {WATCHLIST_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(item.createdAt)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-ghost btn-sm text-primary" onClick={() => handleStartEdit(item)} aria-label="Edit item watchlist">
                              <Edit3 size={14} />
                            </button>
                            <button className="btn btn-ghost btn-sm text-loss" onClick={() => handleDelete(item.id)} aria-label="Hapus dari watchlist">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
