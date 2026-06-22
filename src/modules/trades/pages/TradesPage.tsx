import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { calculateTradePnL, calculateUnrealizedPnL, getTradeAssetTypeLabel, getTradeQuantityLabel } from '@/modules/trades/calculations';
import { formatRupiah, formatUSD, formatPercent, formatDate } from '@/modules/shared/utils/formatters';
import { STRATEGIES, EMOTIONS } from '@/modules/shared/utils/constants';

export default function TradesPage() {
  const { trades, deleteTrade, marketPrices, settings } = useData();
  const { confirm } = useDialog();
  
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
    }
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
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>📥 Export CSV</button>
          <Link to="/trades/new" className="btn btn-primary">➕ Catat Transaksi</Link>
        </div>
      </div>

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
                  let calc = calculateTradePnL(trade);
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

                  return (
                    <tr key={trade.id}>
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
    </div>
  );
}
