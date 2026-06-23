import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import ImportCSVModal from '../components/ImportCSVModal';
import { useDialog } from '@/modules/shared/context/DialogContext';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import ReconciliationNotice from '../components/ReconciliationNotice';
import { calculateTradePnL, calculateUnrealizedPnL, getTradeAssetTypeLabel, getTradeQuantityLabel } from '@/modules/trades/calculations';
import { formatRupiah, formatUSD, formatPercent, formatDate } from '@/modules/shared/utils/formatters';
import { STRATEGIES, EMOTIONS } from '@/modules/shared/utils/constants';
import * as Icons from 'lucide-react';

export default function TradesPage() {
  const { trades, deleteTrade, deleteTrades, updateTrades, marketPrices, settings, addTrade, fetchLivePrices, showToast } = useData();
  const { confirm } = useDialog();
  const [showImportModal, setShowImportModal] = useState(false);

  const [search, setSearch] = useState(() => sessionStorage.getItem('trades_filter_search') || '');
  const [filterStrategy, setFilterStrategy] = useState(() => sessionStorage.getItem('trades_filter_strategy') || '');
  const [filterStatus, setFilterStatus] = useState(() => sessionStorage.getItem('trades_filter_status') || '');
  const [sortBy, setSortBy] = useState(() => {
    const saved = sessionStorage.getItem('trades_sort_by') || 'dateBuy';
    if (saved === 'date') return 'dateBuy';
    if (saved === 'stock') return 'stockCode';
    return saved;
  });
  const [sortDir, setSortDir] = useState(() => sessionStorage.getItem('trades_sort_dir') || 'desc');
  const [page, setPage] = useState(() => parseInt(sessionStorage.getItem('trades_filter_page') || '1') || 1);

  // Checkbox selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Bulk Edit Modal states
  const [bulkModalType, setBulkModalType] = useState<'strategy' | 'tags' | null>(null);
  const [bulkStrategy, setBulkStrategy] = useState('');
  const [bulkTags, setBulkTags] = useState('');

  // Sync to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('trades_filter_search', search);
  }, [search]);

  useEffect(() => {
    sessionStorage.setItem('trades_filter_strategy', filterStrategy);
  }, [filterStrategy]);

  useEffect(() => {
    sessionStorage.setItem('trades_filter_status', filterStatus);
  }, [filterStatus]);

  useEffect(() => {
    sessionStorage.setItem('trades_sort_by', sortBy);
  }, [sortBy]);

  useEffect(() => {
    sessionStorage.setItem('trades_sort_dir', sortDir);
  }, [sortDir]);

  useEffect(() => {
    sessionStorage.setItem('trades_filter_page', String(page));
  }, [page]);
  const perPage = 15;

  const filtered = useMemo(() => {
    let result = [...trades];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(t => t.stockCode.toLowerCase().includes(s));
    }
    if (filterStrategy) {
      result = result.filter(t => t.strategy === filterStrategy);
    }
    if (filterStatus === 'open') {
      result = result.filter(t => !t.sellPrice || !t.dateSell);
    } else if (filterStatus === 'closed') {
      result = result.filter(t => t.sellPrice && t.dateSell);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'dateBuy') {
        cmp = new Date(a.dateBuy).getTime() - new Date(b.dateBuy).getTime();
      } else if (sortBy === 'stockCode') {
        cmp = a.stockCode.localeCompare(b.stockCode);
      } else if (sortBy === 'dateSell') {
        cmp = new Date(a.dateSell || 0).getTime() - new Date(b.dateSell || 0).getTime();
      } else if (sortBy === 'buyPrice') {
        cmp = a.buyPrice - b.buyPrice;
      } else if (sortBy === 'sellPrice') {
        cmp = (a.sellPrice || 0) - (b.sellPrice || 0);
      } else if (sortBy === 'lots') {
        cmp = a.lots - b.lots;
      } else if (sortBy === 'pnl') {
        const pa = calculateTradePnL(a).pnl;
        const pb = calculateTradePnL(b).pnl;
        cmp = pa - pb;
      } else if (sortBy === 'pnlPercent') {
        const pa = calculateTradePnL(a).pnlPercent;
        const pb = calculateTradePnL(b).pnlPercent;
        cmp = pa - pb;
      } else if (sortBy === 'strategy') {
        cmp = (a.strategy || '').localeCompare(b.strategy || '');
      } else if (sortBy === 'status') {
        const sa = !a.sellPrice || !a.dateSell ? 'open' : 'closed';
        const sb = !b.sellPrice || !b.dateSell ? 'open' : 'closed';
        cmp = sa.localeCompare(sb);
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [trades, search, filterStrategy, filterStatus, sortBy, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  // Clear page selection if paged is empty
  useEffect(() => {
    if (paged.length === 0 && page > 1) {
      setPage(1);
    }
  }, [paged, page]);

  const requestSort = (key: string) => {
    if (sortBy === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir(key === 'stockCode' || key === 'strategy' || key === 'status' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const handleDelete = async (id, stockCode) => {
    const isConfirmed = await confirm(`Apakah Anda yakin ingin menghapus transaksi ${stockCode}?`, {
      title: 'Hapus Transaksi',
      severity: 'danger',
      confirmText: 'Hapus'
    });
    if (isConfirmed) {
      deleteTrade(id);
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  // Bulk Actions handlers
  const isAllSelected = paged.length > 0 && paged.every(t => selectedIds.includes(t.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !paged.some(p => p.id === id)));
    } else {
      const newIds = paged.map(p => p.id).filter(id => !selectedIds.includes(id));
      setSelectedIds(prev => [...prev, ...newIds]);
    }
  };

  const handleBulkDelete = async () => {
    const isConfirmed = await confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} transaksi yang dipilih?`, {
      title: 'Hapus Transaksi Massal',
      severity: 'danger',
      confirmText: 'Hapus Semua'
    });
    if (isConfirmed) {
      deleteTrades(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleBulkUpdateLivePrice = async () => {
    const selectedTrades = trades.filter(t => selectedIds.includes(t.id));
    const tickers = Array.from(new Set(selectedTrades.map(t => t.stockCode).filter(Boolean)));
    if (tickers.length > 0) {
      fetchLivePrices(tickers);
      showToast(`Memperbarui harga live untuk ${tickers.length} ticker...`);
      setSelectedIds([]);
    }
  };

  const handleSaveBulkStrategy = () => {
    updateTrades(selectedIds, { strategy: bulkStrategy || undefined });
    setBulkModalType(null);
    setBulkStrategy('');
    setSelectedIds([]);
  };

  const handleSaveBulkTags = () => {
    if (!bulkTags.trim()) return;
    const tagsAppend = bulkTags.split(',').map(t => t.trim()).filter(Boolean);
    updateTrades(selectedIds, { tagsAppend });
    setBulkModalType(null);
    setBulkTags('');
    setSelectedIds([]);
  };

  const exportCSV = () => {
    const headers = ['Kode', 'Jenis', 'Pasar', 'Tgl Beli', 'Tgl Jual', 'Harga Beli', 'Harga Jual', 'Qty', 'P/L', '%', 'Strategi', 'Emosi'];
    const rows = trades.map(t => {
      const calc = calculateTradePnL(t);
      const em = EMOTIONS.find(e => e.value === t.emotion);
      return [
        t.stockCode, getTradeAssetTypeLabel(t), t.market || 'ID', t.dateBuy, t.dateSell || '', t.buyPrice, t.sellPrice || '', t.lots,
        calc.pnl, calc.pnlPercent.toFixed(2), t.strategy || '', em?.label || ''
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jurnal-saham-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📝 Daftar Transaksi</h1>
          <p className="page-subtitle">{filtered.length} transaksi ditemukan</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowImportModal(true)}>📥 Impor CSV</button>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>📥 Export CSV</button>
          <Link to="/trades/new" className="btn btn-primary">➕ Catat Transaksi</Link>
        </div>
      </div>

      {/* Warnings & Reconciliation Notice */}
      <ReconciliationNotice market="ID" />
      <ReconciliationNotice market="US" />

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <span className="search-bar-icon">🔍</span>
          <input placeholder="Cari kode saham..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="form-select" style={{ width: 160 }} value={filterStrategy} onChange={e => { setFilterStrategy(e.target.value); setPage(1); }}>
          <option value="">Semua Strategi</option>
          {(settings.customStrategies || STRATEGIES).map((s: string) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-select" style={{ width: 140 }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">Semua Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <select className="form-select" style={{ width: 140 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="dateBuy">Sort: Tanggal</option>
          <option value="stockCode">Sort: Kode</option>
          <option value="pnl">Sort: P/L</option>
        </select>
        <button className="btn btn-ghost btn-sm" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
          {sortDir === 'desc' ? '↓' : '↑'}
        </button>
      </div>

      {/* Table */}
      {paged.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">Belum ada transaksi</div>
          <div className="empty-state-desc">Mulai catat transaksi saham atau reksadana Anda</div>
          <Link to="/trades/new" className="btn btn-primary">➕ Catat Transaksi</Link>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th><SortableTableHeader label="Kode" sortKey="stockCode" sortConfig={{ key: sortBy as any, direction: sortDir as any }} onSort={requestSort as any} /></th>
                  <th><SortableTableHeader label="Tgl Beli" sortKey="dateBuy" sortConfig={{ key: sortBy as any, direction: sortDir as any }} onSort={requestSort as any} /></th>
                  <th><SortableTableHeader label="Tgl Jual" sortKey="dateSell" sortConfig={{ key: sortBy as any, direction: sortDir as any }} onSort={requestSort as any} /></th>
                  <th><SortableTableHeader label="Buy" sortKey="buyPrice" sortConfig={{ key: sortBy as any, direction: sortDir as any }} onSort={requestSort as any} /></th>
                  <th><SortableTableHeader label="Sell" sortKey="sellPrice" sortConfig={{ key: sortBy as any, direction: sortDir as any }} onSort={requestSort as any} /></th>
                  <th><SortableTableHeader label="Qty" sortKey="lots" sortConfig={{ key: sortBy as any, direction: sortDir as any }} onSort={requestSort as any} /></th>
                  <th><SortableTableHeader label="P/L" sortKey="pnl" sortConfig={{ key: sortBy as any, direction: sortDir as any }} onSort={requestSort as any} /></th>
                  <th><SortableTableHeader label="%" sortKey="pnlPercent" sortConfig={{ key: sortBy as any, direction: sortDir as any }} onSort={requestSort as any} /></th>
                  <th><SortableTableHeader label="Strategi" sortKey="strategy" sortConfig={{ key: sortBy as any, direction: sortDir as any }} onSort={requestSort as any} /></th>
                  <th><SortableTableHeader label="Status" sortKey="status" sortConfig={{ key: sortBy as any, direction: sortDir as any }} onSort={requestSort as any} /></th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(trade => {
                  const calc = calculateTradePnL(trade);
                  const isOpen = !trade.sellPrice || !trade.dateSell;
                  const isUS = trade.market === 'US';
                  const isMutualFund = trade.assetType === 'mutual_fund';
                  const formatMoney = isUS ? formatUSD : formatRupiah;
                  const quantityLabel = getTradeQuantityLabel(trade);

                  let displayPnL = calc.pnl;
                  let displayPnLPercent = calc.pnlPercent;
                  let isEstimasi = false;

                  if (isOpen && !trade.sellPrice && marketPrices && marketPrices[trade.stockCode]) {
                    const currentPrice = marketPrices[trade.stockCode];
                    const { pnl, pnlPercent } = calculateUnrealizedPnL(trade.buyPrice, currentPrice, trade.lots, trade.buyFee, trade.market || 'ID', trade.assetType || 'stock');
                    displayPnL = pnl;
                    displayPnLPercent = pnlPercent;
                    isEstimasi = true;
                  } else if (isOpen && trade.sellPrice) {
                    isEstimasi = true; // estimasi berdasarkan target sellPrice
                  }

                  const hasPnL = !isOpen || isEstimasi;
                  const isRowChecked = selectedIds.includes(trade.id);

                  return (
                    <tr key={trade.id} style={isRowChecked ? { background: 'rgba(59, 130, 246, 0.05)' } : undefined}>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <input
                          type="checkbox"
                          checked={isRowChecked}
                          onChange={() => {
                            setSelectedIds(prev =>
                              prev.includes(trade.id)
                                ? prev.filter(id => id !== trade.id)
                                : [...prev, trade.id]
                            );
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td>
                        <strong>{trade.stockCode}</strong> {isUS && <span style={{fontSize: '0.8em'}}>🇺🇸</span>}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{getTradeAssetTypeLabel(trade)}</div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDate(trade.dateBuy)}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{trade.dateSell ? formatDate(trade.dateSell) : '-'}</td>
                      <td>{formatMoney(trade.buyPrice)}</td>
                      <td>{trade.sellPrice ? formatMoney(trade.sellPrice) : (marketPrices && marketPrices[trade.stockCode] ? <span style={{color: 'var(--text-muted)'}}>{formatMoney(marketPrices[trade.stockCode])} (est)</span> : '-')}</td>
                      <td>{trade.lots} {isMutualFund ? 'unit' : quantityLabel}</td>
                      <td className={!hasPnL ? '' : displayPnL >= 0 ? 'text-profit' : 'text-loss'}>
                        <strong>{!hasPnL ? '-' : formatMoney(displayPnL)}</strong>
                      </td>
                      <td className={!hasPnL ? '' : displayPnLPercent >= 0 ? 'text-profit' : 'text-loss'}>
                        {!hasPnL ? '-' : formatPercent(displayPnLPercent)}
                      </td>
                      <td>
                        {trade.strategy ? <span className="badge badge-blue">{trade.strategy}</span> : '-'}
                      </td>
                      <td>
                        <span className={`badge ${isOpen ? 'badge-yellow' : 'badge-green'}`}>
                          {isOpen ? 'Open' : 'Closed'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Link to={`/trades/${trade.id}`} className="btn btn-ghost btn-sm" title="Detail">👁</Link>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(trade.id, trade.stockCode)} title="Hapus">🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`pagination-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                  {p}
                </button>
              ))}
              <button className="pagination-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          )}
        </>
      )}

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="floating-bulk-bar">
          <style>{`
            .floating-bulk-bar {
              position: fixed;
              bottom: 24px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(17, 24, 39, 0.85);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              border: 1px solid rgba(255, 255, 255, 0.1);
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
              padding: 12px 24px;
              border-radius: var(--radius-md, 8px);
              z-index: 100;
              animation: slideUpBulk 0.3s cubic-bezier(0.16, 1, 0.3, 1);
              width: max-content;
              max-width: 90vw;
            }
            @keyframes slideUpBulk {
              from { transform: translate(-50%, 40px); opacity: 0; }
              to { transform: translate(-50%, 0); opacity: 1; }
            }
            .floating-bulk-bar-content {
              display: flex;
              align-items: center;
              gap: 20px;
              flex-wrap: wrap;
            }
            .selected-count {
              font-size: 0.88rem;
              font-weight: 600;
              color: #F3F4F6;
            }
            .floating-bulk-actions {
              display: flex;
              align-items: center;
              gap: 8px;
              flex-wrap: wrap;
            }
            .btn-bulk {
              display: flex;
              align-items: center;
              gap: 6px;
            }
          `}</style>
          <div className="floating-bulk-bar-content">
            <span className="selected-count">{selectedIds.length} transaksi terpilih</span>
            <div className="floating-bulk-actions">
              <button className="btn btn-secondary btn-sm btn-bulk" onClick={() => setBulkModalType('strategy')}>
                <Icons.Bookmark size={14} />
                <span>Strategi</span>
              </button>
              <button className="btn btn-secondary btn-sm btn-bulk" onClick={() => setBulkModalType('tags')}>
                <Icons.Tag size={14} />
                <span>Tambah Tag</span>
              </button>
              <button className="btn btn-secondary btn-sm btn-bulk" onClick={handleBulkUpdateLivePrice}>
                <Icons.RefreshCw size={14} />
                <span>Update Harga</span>
              </button>
              <button className="btn btn-danger btn-sm btn-bulk" onClick={handleBulkDelete}>
                <Icons.Trash2 size={14} />
                <span>Hapus</span>
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedIds([])}
                style={{ color: 'var(--text-secondary)', padding: '0 8px', fontSize: '0.8rem' }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modals */}
      {bulkModalType && (
        <div className="modal-overlay" onClick={() => setBulkModalType(null)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="card-title">
                {bulkModalType === 'strategy' ? 'Ubah Strategi Massal' : 'Tambah Tag Massal'}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setBulkModalType(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '20px 0' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                Menerapkan perubahan ke <strong>{selectedIds.length}</strong> transaksi terpilih.
              </p>
              {bulkModalType === 'strategy' ? (
                <div className="form-group">
                  <label className="form-label" htmlFor="bulk-strategy-select">Pilih Strategi</label>
                  <select
                    id="bulk-strategy-select"
                    className="form-select"
                    value={bulkStrategy}
                    onChange={e => setBulkStrategy(e.target.value)}
                  >
                    <option value="">Kosongkan / Tanpa Strategi</option>
                    {(settings.customStrategies || STRATEGIES).map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label" htmlFor="bulk-tags-input">Tambahkan Tag (pisahkan dengan koma)</label>
                  <input
                    id="bulk-tags-input"
                    className="form-input"
                    placeholder="Misal: swing, bluechip"
                    value={bulkTags}
                    onChange={e => setBulkTags(e.target.value)}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Tag ini akan ditambahkan ke daftar tag yang sudah ada pada masing-masing transaksi.
                  </span>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setBulkModalType(null)}>Batal</button>
              <button
                className="btn btn-primary"
                onClick={bulkModalType === 'strategy' ? handleSaveBulkStrategy : handleSaveBulkTags}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      <ImportCSVModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {}}
        addTrade={addTrade}
        showToast={showToast}
      />
    </div>
  );
}
