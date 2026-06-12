import { useState, useEffect, useMemo } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import { WATCHLIST_STATUS, WATCHLIST_PRIORITY } from '@/modules/shared/utils/constants';
import { formatRupiah, formatDate, formatPercent } from '@/modules/shared/utils/formatters';
import { Eye, Plus, X, Trash2, Save, TrendingUp, TrendingDown, Edit3 } from 'lucide-react';
import { fetchQuotesBatch, fetchStockOHLCV } from '@/modules/shared/services/yahooFinanceService';
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';

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
              const data = await fetchStockOHLCV(ticker, '30d');
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
    return { stockCode: '', targetPrice: '', reason: '', status: 'waiting', priority: 'medium', categories: [] as string[] };
  });

  useEffect(() => {
    setWatchlistFormDraft({ form, showForm });
  }, [form, showForm, setWatchlistFormDraft]);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleCancelOrToggle = () => {
    if (showForm) {
      setShowForm(false);
      setForm({ stockCode: '', targetPrice: '', reason: '', status: 'waiting', priority: 'medium', categories: [] });
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
      reason: form.reason,
      status: form.status,
      priority: form.priority,
      categories: finalCategories,
    };

    if (editingId) {
      updateWatchlistItem(editingId, dataToSave);
      setEditingId(null);
    } else {
      addWatchlistItem(dataToSave);
    }

    setForm({ stockCode: '', targetPrice: '', reason: '', status: 'waiting', priority: 'medium', categories: [] });
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
      reason: item.reason || '',
      status: item.status || 'waiting',
      priority: item.priority || 'medium',
      categories: item.categories || [],
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
                    disabled={!!editingId}
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
                  <label className="form-label">Prioritas</label>
                  <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                    {WATCHLIST_PRIORITY.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
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
                    <th>Kode</th>
                    <th>Harga Pasar</th>
                    <th>Tren (30 H)</th>
                    <th>Target Beli</th>
                    <th>Jarak ke Target</th>
                    <th>Alasan</th>
                    <th>Prioritas</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWatchlist.map(item => {
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
                        <td>{item.targetPrice ? formatRupiah(item.targetPrice) : '-'}</td>
                        <td>
                          {item.targetPrice && marketData[item.stockCode]?.price ? (
                            (() => {
                              const currentPrice = marketData[item.stockCode].price;
                              const targetPrice = item.targetPrice;
                              const diffPct = ((targetPrice - currentPrice) / currentPrice) * 100;
                              
                              if (diffPct >= 0) {
                                return (
                                  <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                                    Buy Zone ({formatPercent(diffPct)})
                                  </span>
                                );
                              } else {
                                return (
                                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                    {diffPct.toFixed(1)}% lagi
                                  </span>
                                );
                              }
                            })()
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td style={{ maxWidth: 250, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.reason || '-'}</td>
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
