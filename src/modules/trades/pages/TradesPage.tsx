import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import { calculateTradePnL, calculateUnrealizedPnL } from '@/modules/trades/calculations';
import { formatRupiah, formatUSD, formatPercent, formatDate } from '@/modules/shared/utils/formatters';
import { STRATEGIES, EMOTIONS } from '@/modules/shared/utils/constants';

export default function TradesPage() {
  const { trades, deleteTrade, marketPrices, settings } = useData();
  const [search, setSearch] = useState('');
  const [filterStrategy, setFilterStrategy] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
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
      if (sortBy === 'date') {
        cmp = new Date(a.dateBuy).getTime() - new Date(b.dateBuy).getTime();
      } else if (sortBy === 'stock') {
        cmp = a.stockCode.localeCompare(b.stockCode);
      } else if (sortBy === 'pnl') {
        const pa = calculateTradePnL(a).pnl;
        const pb = calculateTradePnL(b).pnl;
        cmp = pa - pb;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [trades, search, filterStrategy, filterStatus, sortBy, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const handleDelete = (id, stockCode) => {
    if (window.confirm(`Hapus transaksi ${stockCode}?`)) {
      deleteTrade(id);
    }
  };

  const exportCSV = () => {
    const headers = ['Kode', 'Pasar', 'Tgl Beli', 'Tgl Jual', 'Harga Beli', 'Harga Jual', 'Qty', 'P/L', '%', 'Strategi', 'Emosi'];
    const rows = trades.map(t => {
      const calc = calculateTradePnL(t);
      const em = EMOTIONS.find(e => e.value === t.emotion);
      return [
        t.stockCode, t.market || 'ID', t.dateBuy, t.dateSell || '', t.buyPrice, t.sellPrice || '', t.lots,
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
          <option value="date">Sort: Tanggal</option>
          <option value="stock">Sort: Kode</option>
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
          <div className="empty-state-desc">Mulai catat transaksi trading Anda</div>
          <Link to="/trades/new" className="btn btn-primary">➕ Catat Transaksi</Link>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Tgl Beli</th>
                  <th>Tgl Jual</th>
                  <th>Buy</th>
                  <th>Sell</th>
                  <th>Qty</th>
                  <th>P/L</th>
                  <th>%</th>
                  <th>Strategi</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(trade => {
                  let calc = calculateTradePnL(trade);
                  const isOpen = !trade.sellPrice || !trade.dateSell;
                  const isUS = trade.market === 'US';
                  const formatMoney = isUS ? formatUSD : formatRupiah;
                  
                  let displayPnL = calc.pnl;
                  let displayPnLPercent = calc.pnlPercent;
                  let isEstimasi = false;

                  if (isOpen && !trade.sellPrice && marketPrices && marketPrices[trade.stockCode]) {
                    const currentPrice = marketPrices[trade.stockCode];
                    const { pnl, pnlPercent } = calculateUnrealizedPnL(trade.buyPrice, currentPrice, trade.lots, trade.buyFee, trade.market || 'ID');
                    displayPnL = pnl;
                    displayPnLPercent = pnlPercent;
                    isEstimasi = true;
                  } else if (isOpen && trade.sellPrice) {
                    isEstimasi = true; // estimasi berdasarkan target sellPrice
                  }

                  const hasPnL = !isOpen || isEstimasi;

                  return (
                    <tr key={trade.id}>
                      <td><strong>{trade.stockCode}</strong> {isUS && <span style={{fontSize: '0.8em'}}>🇺🇸</span>}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{formatDate(trade.dateBuy)}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{trade.dateSell ? formatDate(trade.dateSell) : '-'}</td>
                      <td>{formatMoney(trade.buyPrice)}</td>
                      <td>{trade.sellPrice ? formatMoney(trade.sellPrice) : (marketPrices && marketPrices[trade.stockCode] ? <span style={{color: 'var(--text-muted)'}}>{formatMoney(marketPrices[trade.stockCode])} (est)</span> : '-')}</td>
                      <td>{trade.lots}</td>
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
