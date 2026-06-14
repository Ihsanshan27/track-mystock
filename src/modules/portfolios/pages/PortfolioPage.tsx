import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import ReadOnlyNotice from '@/modules/shared/components/ReadOnlyNotice';
import MarketTabBar from '@/modules/shared/components/MarketTabBar';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { useData } from '@/modules/shared/context/DataContext';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import { useTableSort } from '@/modules/shared/hooks/useTableSort';
import { calculateUnrealizedPnL, calculatePortfolioBalance } from '@/modules/trades/calculations';
import { formatRupiah, formatUSD, formatPercent } from '@/modules/shared/utils/formatters';
import * as Icons from 'lucide-react';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#F43F5E', '#06B6D4', '#EC4899', '#84CC16'];

export default function PortfolioPage() {
  const { trades, cashflows, dividends, settings, updateSettings, activePortfolioId, marketPrices, updateMarketPrice, canWrite } = useData();
  const { isViewer } = usePermissions();
  const [activeTab, setActiveTab] = useState('ID');

  const isDefaultPort = activePortfolioId === 'default';
  const initialCap = isDefaultPort ? (activeTab === 'US' ? (settings.initialCapitalUS ?? 1000) : (settings.initialCapital ?? 10000000)) : 0;
  const balanceStats = calculatePortfolioBalance(
    trades,
    cashflows,
    dividends,
    initialCap,
    activeTab as 'ID' | 'US'
  );

  const openTrades = useMemo(() => {
    return trades
      .filter((trade) => (!trade.sellPrice || !trade.dateSell) && (trade.market === activeTab || (activeTab === 'ID' && !trade.market)))
      .map((trade) => {
        const isUS = activeTab === 'US';
        const shares = isUS ? trade.lots : trade.lots * 100;
        const totalBuy = trade.buyPrice * shares;
        const currentPrice = (marketPrices && marketPrices[trade.stockCode]) || trade.sellPrice || 0;

        let floatingPnL = 0;
        let floatingPnLPercent = 0;
        if (currentPrice > 0) {
          const unrealized = calculateUnrealizedPnL(trade.buyPrice, currentPrice, trade.lots, trade.buyFee, trade.market || 'ID');
          floatingPnL = unrealized.pnl;
          floatingPnLPercent = unrealized.pnlPercent;
        }

        return { ...trade, shares, totalBuy, currentPrice, floatingPnL, floatingPnLPercent };
      });
  }, [activeTab, marketPrices, trades]);

  const totalInvested = openTrades.reduce((sum, trade) => sum + trade.totalBuy, 0);
  const totalFloating = openTrades.reduce((sum, trade) => sum + trade.floatingPnL, 0);
  const tradingBalance = totalInvested + totalFloating;
  const pieData = openTrades.map((trade) => ({ name: trade.stockCode, value: trade.totalBuy }));
  const formatMoney = activeTab === 'US' ? formatUSD : formatRupiah;
  const { sortConfig, sortedItems: sortedOpenTrades, requestSort } = useTableSort(openTrades, {
    initialKey: 'stockCode',
    getValue: (trade: any, key: 'stockCode' | 'buyPrice' | 'lots' | 'totalBuy' | 'currentPrice' | 'floatingPnL' | 'allocationPercent') => {
      if (key === 'allocationPercent') return totalInvested > 0 ? (trade.totalBuy / totalInvested) * 100 : 0;
      return trade[key] || 0;
    },
  });

  const blurStyle = usePrivacyStyle();

  return (
    <div>
      {!canWrite ? (
        <ReadOnlyNotice description="Anda bisa melihat posisi dan alokasi portfolio, tetapi tidak bisa mengubah harga market atau membuka editor transaksi." />
      ) : null}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            Portfolio
            <button
              onClick={() => updateSettings({ privacyMode: !settings.privacyMode })}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                padding: 4,
                borderRadius: '50%',
                transition: 'background var(--transition-fast)'
              }}
              title={settings.privacyMode ? "Tampilkan Nominal" : "Sembunyikan Nominal"}
            >
              {settings.privacyMode ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
            </button>
          </h1>
          <p className="page-subtitle">{openTrades.length} posisi terbuka</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/history" className="btn btn-secondary">
            <Icons.History size={16} />
            <span>History</span>
          </Link>
          {canWrite ? (
            <Link to="/trades/new" className="btn btn-primary">
              <Icons.Plus size={16} />
              <span>Tambah Transaksi</span>
            </Link>
          ) : null}
        </div>
      </div>

      <MarketTabBar
        activeTab={activeTab as 'ID' | 'US'}
        onChange={(tab) => setActiveTab(tab)}
        accentColor="var(--accent-blue)"
      />

      {openTrades.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💼</div>
          <div className="empty-state-title">Tidak ada posisi terbuka di {activeTab === 'US' ? 'Pasar US' : 'Pasar Indonesia'}</div>
          <div className="empty-state-desc">
            {isViewer ? 'Tidak ada posisi terbuka pada data yang bisa Anda lihat.' : 'Semua transaksi sudah ditutup, atau belum ada transaksi'}
          </div>
          {canWrite ? <Link to="/trades/new" className="btn btn-secondary">Tambah Transaksi</Link> : null}
        </div>
      ) : (
        <>
          <div className="grid-stats" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: 'var(--accent-green-dim)' }}>
                <Icons.Wallet size={20} style={{ color: 'var(--accent-green)' }} />
              </div>
              <div className="stat-card-label">Buying Power</div>
              <div className="stat-card-value" style={{ color: 'var(--accent-green)', ...blurStyle }}>{formatMoney(balanceStats.buyingPower)}</div>
              <div className="stat-card-change" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Kas tersedia</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: 'var(--accent-blue-dim)' }}>
                <Icons.TrendingUp size={20} style={{ color: 'var(--accent-blue-light)' }} />
              </div>
              <div className="stat-card-label">Total Investasi</div>
              <div className="stat-card-value" style={blurStyle}>{formatMoney(totalInvested)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: totalFloating >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)' }}>
                {totalFloating >= 0
                  ? <Icons.TrendingUp size={20} style={{ color: 'var(--accent-green)' }} />
                  : <Icons.TrendingDown size={20} style={{ color: 'var(--accent-red)' }} />}
              </div>
              <div className="stat-card-label">Total Floating P/L</div>
              <div className={`stat-card-value ${totalFloating >= 0 ? 'text-profit' : 'text-loss'}`} style={blurStyle}>
                {totalFloating > 0 ? '+' : ''}{formatMoney(totalFloating)}
              </div>
              <div className={`stat-card-change ${totalFloating >= 0 ? 'positive' : 'negative'}`}>
                {totalInvested > 0 ? formatPercent((totalFloating / totalInvested) * 100) : '0%'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: 'var(--accent-yellow-dim)' }}>
                <Icons.Activity size={20} style={{ color: 'var(--accent-yellow)' }} />
              </div>
              <div className="stat-card-label">Trading Balance</div>
              <div className="stat-card-value" style={blurStyle}>{formatMoney(tradingBalance)}</div>
              <div className="stat-card-change" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Investasi + Floating P/L</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: 'var(--accent-purple-dim)' }}>
                <Icons.Layers size={20} style={{ color: 'var(--accent-purple)' }} />
              </div>
              <div className="stat-card-label">Jumlah Saham</div>
              <div className="stat-card-value">{openTrades.length}</div>
            </div>
          </div>

          <div className="grid-2" style={{ alignItems: 'start' }}>
            <div className="card">
              <div className="card-header"><h3 className="card-title">Posisi Terbuka</h3></div>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th><SortableTableHeader label="Kode" sortKey="stockCode" sortConfig={sortConfig} onSort={requestSort} /></th>
                      <th><SortableTableHeader label="Harga Beli" sortKey="buyPrice" sortConfig={sortConfig} onSort={requestSort} /></th>
                      <th><SortableTableHeader label="Qty" sortKey="lots" sortConfig={sortConfig} onSort={requestSort} /></th>
                      <th><SortableTableHeader label="Total Investasi" sortKey="totalBuy" sortConfig={sortConfig} onSort={requestSort} /></th>
                      <th style={{ width: 140 }}><SortableTableHeader label="Harga Saat Ini" sortKey="currentPrice" sortConfig={sortConfig} onSort={requestSort} /></th>
                      <th><SortableTableHeader label="Floating P/L" sortKey="floatingPnL" sortConfig={sortConfig} onSort={requestSort} /></th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOpenTrades.map((trade) => (
                      <tr key={trade.id}>
                        <td><strong>{trade.stockCode}</strong></td>
                        <td>
                          <span style={blurStyle}>{formatMoney(trade.buyPrice)}</span>
                        </td>
                        <td>{trade.lots}</td>
                        <td>
                          <span style={blurStyle}>{formatMoney(trade.totalBuy)}</span>
                          <br />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {totalInvested > 0 ? ((trade.totalBuy / totalInvested) * 100).toFixed(1) : '0.0'}% alokasi
                          </span>
                        </td>
                        <td>
                          <input
                            type="number"
                            step="any"
                            className="form-input"
                            style={{ padding: '4px 8px', height: 32, fontSize: '0.9rem', ...blurStyle }}
                            placeholder="Harga..."
                            value={trade.currentPrice || ''}
                            disabled={!canWrite}
                            onChange={(event) => updateMarketPrice(trade.stockCode, event.target.value)}
                          />
                        </td>
                        <td>
                          {trade.currentPrice > 0 ? (
                            <div style={{ textAlign: 'right', ...blurStyle }}>
                              <div className={trade.floatingPnL >= 0 ? 'text-profit' : 'text-loss'} style={{ fontWeight: 600 }}>
                                {trade.floatingPnL > 0 ? '+' : ''}{formatMoney(trade.floatingPnL)}
                              </div>
                              <div className={trade.floatingPnL >= 0 ? 'text-profit' : 'text-loss'} style={{ fontSize: '0.8rem' }}>
                                {formatPercent(trade.floatingPnLPercent)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td>
                          {canWrite ? <Link to={`/trades/${trade.id}`} className="btn btn-ghost btn-sm">Lihat</Link> : <span style={{ color: 'var(--text-muted)' }}>Read-only</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3 className="card-title">Alokasi Portfolio</h3></div>
              <div className="card-body" style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2}>
                      {pieData.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatMoney(value)} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.8rem' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px'}}>
                  {pieData.map((item, index) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[index % COLORS.length] }} />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
