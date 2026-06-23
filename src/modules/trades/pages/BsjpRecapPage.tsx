import { useState, useMemo, useEffect } from 'react'; // React hooks
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { calculateTradePnL, calculateUnrealizedPnL } from '@/modules/trades/calculations';
import { formatRupiah, formatUSD, formatPercent, formatDate } from '@/modules/shared/utils/formatters';
import * as Icons from 'lucide-react';

export default function BsjpRecapPage() {
  const { 
    bsjpTrades = [], 
    addBsjpTrade, 
    updateBsjpTrade, 
    deleteBsjpTrade, 
    marketPrices, 
    settings, 
    canWrite 
  } = useData();
  const { alert, confirm } = useDialog();

  const trades = bsjpTrades;
  
  // Filter states
  const [filterYear, setFilterYear] = useState<string>(() => sessionStorage.getItem('bsjp_filter_year') || '');
  const [filterMonth, setFilterMonth] = useState<string>(() => sessionStorage.getItem('bsjp_filter_month') || '');
  const [filterDate, setFilterDate] = useState<string>(() => sessionStorage.getItem('bsjp_filter_date') || '');
  const [filterBroker, setFilterBroker] = useState<string>(() => sessionStorage.getItem('bsjp_filter_broker') || '');
  
  // Sort states
  const [sortBy, setSortBy] = useState<string>(() => sessionStorage.getItem('bsjp_sort_by') || 'dateBuy');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() => (sessionStorage.getItem('bsjp_sort_dir') as 'asc' | 'desc') || 'desc');

  // Page pagination states
  const [page, setPage] = useState(() => parseInt(sessionStorage.getItem('bsjp_filter_page') || '1') || 1);
  const perPage = 20;

  // Sync to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('bsjp_filter_year', filterYear);
  }, [filterYear]);

  useEffect(() => {
    sessionStorage.setItem('bsjp_filter_month', filterMonth);
  }, [filterMonth]);

  useEffect(() => {
    sessionStorage.setItem('bsjp_filter_date', filterDate);
  }, [filterDate]);

  useEffect(() => {
    sessionStorage.setItem('bsjp_filter_broker', filterBroker);
  }, [filterBroker]);

  useEffect(() => {
    sessionStorage.setItem('bsjp_sort_by', sortBy);
  }, [sortBy]);

  useEffect(() => {
    sessionStorage.setItem('bsjp_sort_dir', sortDir);
  }, [sortDir]);

  useEffect(() => {
    sessionStorage.setItem('bsjp_filter_page', String(page));
  }, [page]);

  // Modal & form states
  const [showModal, setShowModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<any | null>(null);

  const [form, setForm] = useState({
    dateBuy: new Date().toISOString().split('T')[0],
    stockCode: '',
    lots: '',
    buyPrice: '',
    sellPrice: '',
    market: 'ID',
    sekuritas: ''
  });

  const handleOpenAdd = () => {
    setEditingTrade(null);
    setForm({
      dateBuy: new Date().toISOString().split('T')[0],
      stockCode: '',
      lots: '',
      buyPrice: '',
      sellPrice: '',
      market: 'ID',
      sekuritas: settings.selectedBrokerID || 'Custom'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (trade: any) => {
    setEditingTrade(trade);
    setForm({
      dateBuy: trade.dateBuy || new Date().toISOString().split('T')[0],
      stockCode: trade.stockCode || '',
      lots: String(trade.lots || ''),
      buyPrice: String(trade.buyPrice || ''),
      sellPrice: trade.sellPrice != null ? String(trade.sellPrice) : '',
      market: trade.market || 'ID',
      sekuritas: trade.sekuritas || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dateBuy || !form.stockCode || !form.lots || !form.buyPrice) {
      await alert('Mohon isi semua field wajib!', {
        title: 'Formulir Belum Lengkap',
        severity: 'warning'
      });
      return;
    }

    const payload = {
      dateBuy: form.dateBuy,
      stockCode: form.stockCode.toUpperCase(),
      lots: parseInt(form.lots) || 0,
      buyPrice: parseFloat(form.buyPrice) || 0,
      sellPrice: form.sellPrice ? parseFloat(form.sellPrice) : null,
      market: form.market as 'ID' | 'US',
      sekuritas: form.sekuritas || (form.market === 'US' ? (settings.selectedBrokerUS || 'Custom') : (settings.selectedBrokerID || 'Custom')),
      buyFee: form.market === 'US' ? (settings.defaultBuyFeeUS ?? 0) : (settings.defaultBuyFee ?? 0.15),
      sellFee: form.market === 'US' ? (settings.defaultSellFeeUS ?? 0) : (settings.defaultSellFee ?? 0.25)
    };

    if (editingTrade) {
      updateBsjpTrade(editingTrade.id, payload);
    } else {
      addBsjpTrade(payload);
    }
    setShowModal(false);
  };

  // Extract unique years for dropdown filter
  const availableYears = useMemo(() => {
    const yrs = new Set<string>();
    trades.forEach(t => {
      if (t.dateBuy) {
        const y = t.dateBuy.split('-')[0];
        if (y) yrs.add(y);
      }
    });
    return Array.from(yrs).sort((a, b) => b.localeCompare(a));
  }, [trades]);

  // Extract unique sekuritas names for filter
  const availableBrokers = useMemo(() => {
    const brks = new Set<string>();
    trades.forEach(t => {
      const broker = t.sekuritas || (t.market === 'US' ? 'Custom' : 'Custom');
      brks.add(broker);
    });
    return Array.from(brks).sort();
  }, [trades]);

  // Filter and sort the trades list
  const filteredAndSortedTrades = useMemo(() => {
    let result = [...trades];

    // Filter by year
    if (filterYear) {
      result = result.filter(t => t.dateBuy && t.dateBuy.startsWith(filterYear));
    }

    // Filter by month
    if (filterMonth) {
      const mStr = `-${filterMonth.padStart(2, '0')}-`;
      result = result.filter(t => t.dateBuy && t.dateBuy.includes(mStr));
    }

    // Filter by specific date
    if (filterDate) {
      result = result.filter(t => t.dateBuy === filterDate);
    }

    // Filter by broker
    if (filterBroker) {
      result = result.filter(t => t.sekuritas === filterBroker);
    }

    // Sort result
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'dateBuy') {
        cmp = new Date(a.dateBuy).getTime() - new Date(b.dateBuy).getTime();
      } else if (sortBy === 'emiten') {
        cmp = a.stockCode.localeCompare(b.stockCode);
      } else if (sortBy === 'lots') {
        cmp = a.lots - b.lots;
      } else if (sortBy === 'profit') {
        const pa = calculateTradePnL(a).pnl;
        const pb = calculateTradePnL(b).pnl;
        cmp = pa - pb;
      } else if (sortBy === 'buyPrice') {
        cmp = a.buyPrice - b.buyPrice;
      } else if (sortBy === 'sellPrice') {
        cmp = (a.sellPrice || 0) - (b.sellPrice || 0);
      } else if (sortBy === 'pnlPercent') {
        const pa = calculateTradePnL(a).pnlPercent;
        const pb = calculateTradePnL(b).pnlPercent;
        cmp = pa - pb;
      } else if (sortBy === 'totalKeluar') {
        const ca = calculateTradePnL(a).totalBuy;
        const cb = calculateTradePnL(b).totalBuy;
        cmp = ca - cb;
      } else if (sortBy === 'totalMasuk') {
        const calcA = calculateTradePnL(a);
        const calcB = calculateTradePnL(b);
        const ca = a.sellPrice ? calcA.totalSell - calcA.sellCommission : 0;
        const cb = b.sellPrice ? calcB.totalSell - calcB.sellCommission : 0;
        cmp = ca - cb;
      } else if (sortBy === 'sekuritas') {
        cmp = (a.sekuritas || '').localeCompare(b.sekuritas || '');
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [trades, filterYear, filterMonth, filterDate, filterBroker, sortBy, sortDir]);

  // Map trades to row data with full profit/loss calculations
  const rowData = useMemo(() => {
    return filteredAndSortedTrades.map((trade, idx) => {
      const calc = calculateTradePnL(trade);
      const isOpen = trade.sellPrice == null;
      const isUS = trade.market === 'US';
      const formatMoney = isUS ? formatUSD : formatRupiah;

      let displayPnL = calc.pnl;
      let displayPnLPercent = calc.pnlPercent;
      let isEstimasi = false;
      
      const totalKeluar = calc.totalBuy + calc.buyCommission;
      let totalMasuk = isOpen ? 0 : calc.totalSell - calc.sellCommission;

      if (isOpen) {
        if (marketPrices && marketPrices[trade.stockCode]) {
          const currentPrice = marketPrices[trade.stockCode];
          const { pnl, pnlPercent } = calculateUnrealizedPnL(
            trade.buyPrice,
            currentPrice,
            trade.lots,
            trade.buyFee ?? 0.15,
            trade.market || 'ID'
          );
          displayPnL = pnl;
          displayPnLPercent = pnlPercent;
          isEstimasi = true;
          totalMasuk = currentPrice * (isUS ? trade.lots : trade.lots * 100);
        }
      }

      const sekuritas = trade.sekuritas || (isUS 
        ? (settings.selectedBrokerUS || 'Custom') 
        : (settings.selectedBrokerID || 'Custom'));

      return {
        ...trade,
        no: idx + 1,
        calc,
        isOpen,
        isUS,
        displayPnL,
        displayPnLPercent,
        isEstimasi,
        totalMasuk,
        totalKeluar,
        sekuritas,
        formatMoney
      };
    });
  }, [filteredAndSortedTrades, marketPrices, settings]);

  // Aggregate global stats for the selected trades
  const stats = useMemo(() => {
    let totalLots = 0;
    let totalProfit = 0;
    let totalMasuk = 0;
    let totalKeluar = 0;
    let openCount = 0;
    let closedCount = 0;

    rowData.forEach(item => {
      totalLots += item.lots;
      totalProfit += item.displayPnL;
      totalKeluar += item.totalKeluar;
      if (!item.isOpen) {
        totalMasuk += item.totalMasuk;
        closedCount++;
      } else {
        openCount++;
      }
    });

    const avgReturnPct = totalKeluar > 0 ? (totalProfit / totalKeluar) * 100 : 0;

    return {
      totalLots,
      totalProfit,
      totalMasuk,
      totalKeluar,
      avgReturnPct,
      openCount,
      closedCount,
      totalCount: rowData.length
    };
  }, [rowData]);

  // Pagination slice
  const totalPages = Math.ceil(rowData.length / perPage);
  const pagedRows = rowData.slice((page - 1) * perPage, page * perPage);

  // Month labels
  const monthNames = [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilterYear('');
    setFilterMonth('');
    setFilterDate('');
    setFilterBroker('');
    setPage(1);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <Icons.Layers size={24} style={{ color: 'var(--accent-green)' }} />
            Rekap BSJP & Transaksi
          </h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0 0' }}>Rangkuman terperinci transaksi kas masuk, kas keluar, lot, dan sekuritas</p>
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icons.Plus size={16} /> Tambah Transaksi
          </button>
        )}
      </div>

      {/* Bento Stats Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          {
            label: 'Total Transaksi', value: `${stats.totalCount} posisi`,
            desc: `${stats.closedCount} selesai · ${stats.openCount} aktif`,
            icon: Icons.FileText, color: 'var(--accent-purple)', dim: 'var(--accent-purple-dim)'
          },
          {
            label: 'Total Lot Diputar', value: `${stats.totalLots.toLocaleString('id-ID')} lot`,
            desc: 'Akumulasi kuantitas',
            icon: Icons.Layers, color: 'var(--accent-blue)', dim: 'var(--accent-blue-dim)'
          },
          {
            label: 'Total Uang Keluar (Modal)', value: formatRupiah(stats.totalKeluar),
            desc: 'Pembelian + Komisi',
            icon: Icons.ArrowUpRight, color: 'var(--accent-red)', dim: 'var(--accent-red-dim)', valueColor: 'var(--accent-red)'
          },
          {
            label: 'Total Uang Masuk (Sell)', value: formatRupiah(stats.totalMasuk),
            desc: 'Penjualan bersih',
            icon: Icons.ArrowDownLeft, color: 'var(--accent-green)', dim: 'var(--accent-green-dim)', valueColor: 'var(--accent-green)'
          },
          {
            label: 'Total Keuntungan Bersih', value: `${stats.totalProfit >= 0 ? '+' : ''}${formatRupiah(stats.totalProfit)}`,
            desc: `${stats.avgReturnPct >= 0 ? '+' : ''}${stats.avgReturnPct.toFixed(2)}% avg return`,
            icon: stats.totalProfit >= 0 ? Icons.TrendingUp : Icons.TrendingDown,
            color: stats.totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            dim: stats.totalProfit >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)',
            valueColor: stats.totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
          }
        ].map((stat, i) => {
          const Ic = stat.icon;
          return (
            <div key={i} className="bento-card" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </span>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: stat.dim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ic size={14} style={{ color: stat.color }} />
                </div>
              </div>
              <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: stat.valueColor || 'var(--text-primary)' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                {stat.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and Sort Bar */}
      <div className="filter-bar" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {/* Year Filter */}
        <select 
          className="form-select" 
          style={{ width: 140 }} 
          value={filterYear} 
          onChange={e => { setFilterYear(e.target.value); setPage(1); }}
        >
          <option value="">Semua Tahun</option>
          {availableYears.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Month Filter */}
        <select 
          className="form-select" 
          style={{ width: 150 }} 
          value={filterMonth} 
          onChange={e => { setFilterMonth(e.target.value); setPage(1); }}
        >
          <option value="">Semua Bulan</option>
          {monthNames.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {/* Specific Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Tanggal Beli:</label>
          <input 
            type="date" 
            className="form-input" 
            style={{ width: 160, padding: '8px 12px' }} 
            value={filterDate} 
            onChange={e => { setFilterDate(e.target.value); setPage(1); }}
          />
        </div>

        {/* Broker Filter */}
        <select 
          className="form-select" 
          style={{ width: 160 }} 
          value={filterBroker} 
          onChange={e => { setFilterBroker(e.target.value); setPage(1); }}
        >
          <option value="">Semua Sekuritas</option>
          {availableBrokers.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {/* Clear Filter Button */}
        {(filterYear || filterMonth || filterDate || filterBroker) && (
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ padding: '8px 12px', height: '36px' }}
            onClick={handleClearFilters}
          >
            <Icons.RotateCcw size={13} /> Bersihkan
          </button>
        )}
      </div>

      {/* Recap Table */}
      {pagedRows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">Tidak ada transaksi terdaftar</div>
          <div className="empty-state-desc">Silakan sesuaikan penyaringan filter Anda atau tambahkan transaksi baru.</div>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">Tabel Rekapitulasi BSJP</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Menampilkan {pagedRows.length} dari {rowData.length} baris
              </span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-container" style={{ border: 'none', margin: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>NO</th>
                      <th onClick={() => handleSort('dateBuy')} style={{ cursor: 'pointer' }}>
                        TANGGAL BELI {sortBy === 'dateBuy' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                      </th>
                      <th onClick={() => handleSort('emiten')} style={{ cursor: 'pointer' }}>
                        EMITEN {sortBy === 'emiten' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                      </th>
                      <th onClick={() => handleSort('lots')} style={{ cursor: 'pointer' }}>
                        LOT {sortBy === 'lots' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                      </th>
                      <th><SortableTableHeader label="AVG BUY" sortKey="buyPrice" sortConfig={{ key: sortBy as any, direction: sortDir }} onSort={handleSort as any} /></th>
                      <th><SortableTableHeader label="AVG SELL" sortKey="sellPrice" sortConfig={{ key: sortBy as any, direction: sortDir }} onSort={handleSort as any} /></th>
                      <th><SortableTableHeader label="GAIN P/L" sortKey="pnlPercent" sortConfig={{ key: sortBy as any, direction: sortDir }} onSort={handleSort as any} /></th>
                      <th onClick={() => handleSort('profit')} style={{ cursor: 'pointer' }}>
                        TOTAL PROFIT {sortBy === 'profit' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                      </th>
                      <th><SortableTableHeader label="TOTAL MASUK" sortKey="totalMasuk" sortConfig={{ key: sortBy as any, direction: sortDir }} onSort={handleSort as any} /></th>
                      <th><SortableTableHeader label="TOTAL KELUAR" sortKey="totalKeluar" sortConfig={{ key: sortBy as any, direction: sortDir }} onSort={handleSort as any} /></th>
                      <th><SortableTableHeader label="SEKURITAS" sortKey="sekuritas" sortConfig={{ key: sortBy as any, direction: sortDir }} onSort={handleSort as any} /></th>
                      {canWrite && <th style={{ width: 100 }}>AKSI</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((row) => {
                      const isProfit = row.displayPnL > 0;
                      const isLoss = row.displayPnL < 0;
                      const showIncome = !row.isOpen;

                      return (
                        <tr key={row.id}>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            {row.no}
                          </td>
                          <td style={{ fontSize: '0.88rem' }}>
                            {formatDate(row.dateBuy)}
                          </td>
                          <td>
                            <strong>{row.stockCode}</strong> {row.isUS && <span style={{ fontSize: '0.78rem' }}>🇺🇸</span>}
                          </td>
                          <td className="font-mono">
                            {row.lots.toLocaleString('id-ID')}
                          </td>
                          <td className="font-mono">
                            {row.formatMoney(row.buyPrice)}
                          </td>
                          <td className="font-mono">
                            {row.sellPrice ? row.formatMoney(row.sellPrice) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                          <td className={`font-mono ${isProfit ? 'text-profit' : isLoss ? 'text-loss' : ''}`} style={{ fontWeight: 600 }}>
                            {row.isEstimasi && 'est '}{formatPercent(row.displayPnLPercent)}
                          </td>
                          <td className={`font-mono ${isProfit ? 'text-profit' : isLoss ? 'text-loss' : ''}`} style={{ fontWeight: 700 }}>
                            {row.isEstimasi && 'est '}{row.formatMoney(row.displayPnL)}
                          </td>
                          <td className="font-mono" style={{ color: showIncome ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {showIncome ? row.formatMoney(row.totalMasuk) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>hold posisi</span>}
                          </td>
                          <td className="font-mono">
                            {row.formatMoney(row.totalKeluar)}
                          </td>
                          <td>
                            <span className="badge badge-purple" style={{ padding: '4px 10px', fontWeight: 700 }}>
                              {row.sekuritas}
                            </span>
                          </td>
                          {canWrite && (
                            <td>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button 
                                  className="btn btn-secondary btn-sm" 
                                  style={{ padding: '6px 8px', height: 'auto', display: 'flex', alignItems: 'center' }}
                                  onClick={() => handleOpenEdit(row)}
                                >
                                  <Icons.Edit3 size={13} />
                                </button>
                                <button 
                                  className="btn btn-danger btn-sm" 
                                  style={{ padding: '6px 8px', height: 'auto', display: 'flex', alignItems: 'center', background: 'var(--accent-red-dim)', color: 'var(--accent-red)', border: 'none' }}
                                  onClick={async () => {
                                    const isConfirmed = await confirm(`Apakah Anda yakin ingin menghapus transaksi BSJP untuk ${row.stockCode}? Tindakan ini tidak dapat dibatalkan.`, {
                                      title: 'Hapus Transaksi',
                                      severity: 'danger',
                                      confirmText: 'Hapus'
                                    });
                                    if (isConfirmed) {
                                      deleteBsjpTrade(row.id);
                                    }
                                  }}
                                >
                                  <Icons.Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: 20 }}>
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>{editingTrade ? 'Edit Transaksi BSJP' : 'Tambah Transaksi BSJP'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <Icons.X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Pasar</label>
                    <select 
                      className="form-select" 
                      value={form.market} 
                      onChange={e => {
                        const m = e.target.value;
                        setForm(prev => ({
                          ...prev,
                          market: m,
                          sekuritas: m === 'US' ? (settings.selectedBrokerUS || 'Custom') : (settings.selectedBrokerID || 'Custom')
                        }));
                      }}
                    >
                      <option value="ID">Indonesia (IDR)</option>
                      <option value="US">Amerika (USD)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal Beli</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={form.dateBuy} 
                      onChange={e => setForm(prev => ({ ...prev, dateBuy: e.target.value }))}
                      required 
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Kode Emiten</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. BBRI atau AAPL"
                      value={form.stockCode} 
                      onChange={e => setForm(prev => ({ ...prev, stockCode: e.target.value.toUpperCase() }))}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jumlah Lot</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 10"
                      value={form.lots} 
                      onChange={e => setForm(prev => ({ ...prev, lots: e.target.value }))}
                      required 
                      min="1"
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Harga Beli Rata-Rata</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 4500"
                      value={form.buyPrice} 
                      onChange={e => setForm(prev => ({ ...prev, buyPrice: e.target.value }))}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Harga Jual Rata-Rata (Opsional)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="Kosongkan jika belum dijual"
                      value={form.sellPrice} 
                      onChange={e => setForm(prev => ({ ...prev, sellPrice: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Nama Sekuritas</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Ajaib, Gotrade, Mirae"
                    value={form.sekuritas} 
                    onChange={e => setForm(prev => ({ ...prev, sekuritas: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
