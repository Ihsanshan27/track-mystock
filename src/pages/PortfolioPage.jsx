import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { calculateUnrealizedPnL } from '../utils/calculations';
import { formatRupiah, formatUSD, formatPercent } from '../utils/formatters';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#F43F5E', '#06B6D4', '#EC4899', '#84CC16'];

export default function PortfolioPage() {
  const { trades, marketPrices, updateMarketPrice } = useData();
  const [activeTab, setActiveTab] = useState('ID'); // 'ID' or 'US'

  const openTrades = useMemo(() => {
    return trades
      .filter(t => (!t.sellPrice || !t.dateSell) && (t.market === activeTab || (activeTab === 'ID' && !t.market)))
      .map(t => {
        const isUS = activeTab === 'US';
        const shares = isUS ? t.lots : t.lots * 100;
        const totalBuy = t.buyPrice * shares;
        const fee = totalBuy * ((t.buyFee || 0) / 100);
        
        const currentPrice = (marketPrices && marketPrices[t.stockCode]) || t.sellPrice || 0;
        let floatingPnL = 0;
        let floatingPnLPercent = 0;
        
        if (currentPrice > 0) {
          const unrealized = calculateUnrealizedPnL(t.buyPrice, currentPrice, t.lots, t.buyFee, t.market || 'ID');
          floatingPnL = unrealized.pnl;
          floatingPnLPercent = unrealized.pnlPercent;
        }

        return { ...t, totalBuy, fee, shares, currentPrice, floatingPnL, floatingPnLPercent };
      });
  }, [trades, activeTab, marketPrices]);

  const totalInvested = openTrades.reduce((s, t) => s + t.totalBuy, 0);
  const totalFloating = openTrades.reduce((s, t) => s + t.floatingPnL, 0);

  const pieData = openTrades.map(t => ({
    name: t.stockCode,
    value: t.totalBuy,
  }));

  const formatMoney = activeTab === 'US' ? formatUSD : formatRupiah;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💼 Portfolio</h1>
          <p className="page-subtitle">{openTrades.length} posisi terbuka</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border-color)' }}>
        <button 
          className={`tab-btn ${activeTab === 'ID' ? 'active' : ''}`}
          style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'ID' ? '2px solid var(--accent-blue)' : '2px solid transparent', color: activeTab === 'ID' ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => setActiveTab('ID')}
        >
          🇮🇩 Pasar Indonesia
        </button>
        <button 
          className={`tab-btn ${activeTab === 'US' ? 'active' : ''}`}
          style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'US' ? '2px solid var(--accent-blue)' : '2px solid transparent', color: activeTab === 'US' ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => setActiveTab('US')}
        >
          🇺🇸 Pasar Amerika
        </button>
      </div>

      {openTrades.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💼</div>
          <div className="empty-state-title">Tidak ada posisi terbuka di {activeTab === 'US' ? 'Pasar US' : 'Pasar Indonesia'}</div>
          <div className="empty-state-desc">Semua transaksi sudah ditutup, atau belum ada transaksi</div>
          <Link to="/trades/new" className="btn btn-primary">➕ Catat Transaksi</Link>
        </div>
      ) : (
        <>
          <div className="grid-stats" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: 'var(--accent-blue-dim)' }}>💰</div>
              <div className="stat-card-label">Total Investasi</div>
              <div className="stat-card-value">{formatMoney(totalInvested)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: totalFloating >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)' }}>{totalFloating >= 0 ? '📈' : '📉'}</div>
              <div className="stat-card-label">Total Floating P/L</div>
              <div className={`stat-card-value ${totalFloating >= 0 ? 'text-profit' : 'text-loss'}`}>
                {totalFloating > 0 ? '+' : ''}{formatMoney(totalFloating)}
              </div>
              <div className={`stat-card-change ${totalFloating >= 0 ? 'positive' : 'negative'}`}>
                {totalInvested > 0 ? formatPercent((totalFloating / totalInvested) * 100) : '0%'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: 'var(--accent-purple-dim)' }}>📊</div>
              <div className="stat-card-label">Jumlah Saham</div>
              <div className="stat-card-value">{openTrades.length}</div>
            </div>
          </div>

          <div className="grid-2" style={{ alignItems: 'start' }}>
            {/* Table */}
            <div className="card">
              <div className="card-header"><h3 className="card-title">Posisi Terbuka</h3></div>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Harga Beli</th>
                      <th>Qty</th>
                      <th>Total Investasi</th>
                      <th style={{ width: 140 }}>Harga Saat Ini</th>
                      <th>Floating P/L</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openTrades.map(t => (
                      <tr key={t.id}>
                        <td><strong>{t.stockCode}</strong></td>
                        <td>{formatMoney(t.buyPrice)}</td>
                        <td>{t.lots}</td>
                        <td>{formatMoney(t.totalBuy)}<br/><span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{((t.totalBuy / totalInvested) * 100).toFixed(1)}% alokasi</span></td>
                        <td>
                          <input 
                            type="number" 
                            step="any"
                            className="form-input" 
                            style={{ padding: '4px 8px', height: 32, fontSize: '0.9rem' }}
                            placeholder="Harga..."
                            value={t.currentPrice || ''}
                            onChange={(e) => updateMarketPrice(t.stockCode, e.target.value)}
                          />
                        </td>
                        <td>
                          {t.currentPrice > 0 ? (
                            <div style={{ textAlign: 'right' }}>
                              <div className={t.floatingPnL >= 0 ? 'text-profit' : 'text-loss'} style={{ fontWeight: 600 }}>
                                {t.floatingPnL > 0 ? '+' : ''}{formatMoney(t.floatingPnL)}
                              </div>
                              <div className={t.floatingPnL >= 0 ? 'text-profit' : 'text-loss'} style={{ fontSize: '0.8rem' }}>
                                {formatPercent(t.floatingPnLPercent)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td><Link to={`/trades/${t.id}`} className="btn btn-ghost btn-sm">👁</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="card">
              <div className="card-header"><h3 className="card-title">Alokasi Portfolio</h3></div>
              <div className="card-body" style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatMoney(v)} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.8rem' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px', marginTop: 8 }}>
                  {pieData.map((item, i) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
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
