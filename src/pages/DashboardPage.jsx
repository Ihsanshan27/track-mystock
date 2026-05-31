import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { calculateStats, calculateTradePnL, calculateUnrealizedPnL, calculateEquityCurve, calculateMonthlyPnL, calculateDailyPnL, calculatePortfolioBalance, calculateAchievements } from '../utils/calculations';
import { formatRupiah, formatUSD, formatPercent, formatDate, formatNumber } from '../utils/formatters';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

function StatCard({ icon, label, value, subValue, colorClass, bgColor }) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: bgColor || 'var(--accent-blue-dim)' }}>
        {icon}
      </div>
      <div className="stat-card-label">{label}</div>
      <div className={`stat-card-value ${colorClass || ''}`}>{value}</div>
      {subValue && <div className={`stat-card-change ${colorClass === 'text-profit' ? 'positive' : colorClass === 'text-loss' ? 'negative' : ''}`}>{subValue}</div>}
    </div>
  );
}

function CustomTooltip({ active, payload, label, formatValue }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 14px',
      fontSize: '0.8rem',
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: payload[0].value >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
        {formatValue ? formatValue(payload[0].value) : payload[0].value}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { trades, cashflows, dividends, settings, marketPrices } = useData();
  const [activeTab, setActiveTab] = useState('ID'); // 'ID' or 'US'

  const filteredTrades = useMemo(() => trades.filter(t => t.market === activeTab || (!t.market && activeTab === 'ID')), [trades, activeTab]);
  const filteredCashflows = useMemo(() => cashflows.filter(c => c.market === activeTab || (!c.market && activeTab === 'ID')), [cashflows, activeTab]);
  const filteredDividends = useMemo(() => dividends.filter(d => d.market === activeTab || (!d.market && activeTab === 'ID')), [dividends, activeTab]);

  const initialCap = activeTab === 'US' ? (settings.initialCapitalUS || 1000) : settings.initialCapital;
  const isUS = activeTab === 'US';
  const formatMoney = isUS ? formatUSD : formatRupiah;

  const stats = useMemo(() => calculateStats(filteredTrades), [filteredTrades]);
  const equityCurve = useMemo(() => calculateEquityCurve(filteredTrades, initialCap), [filteredTrades, initialCap]);
  const monthlyPnL = useMemo(() => calculateMonthlyPnL(filteredTrades), [filteredTrades]);
  const dailyPnL = useMemo(() => calculateDailyPnL(filteredTrades), [filteredTrades]);
  const balance = useMemo(() => calculatePortfolioBalance(filteredTrades, filteredCashflows, filteredDividends, initialCap), [filteredTrades, filteredCashflows, filteredDividends, initialCap]);
  const achievements = useMemo(() => calculateAchievements(filteredTrades, filteredDividends), [filteredTrades, filteredDividends]);

  const openTrades = filteredTrades.filter(t => !t.sellPrice || !t.dateSell);
  
  const totalFloating = useMemo(() => {
    return openTrades.reduce((sum, t) => {
      const currentPrice = (marketPrices && marketPrices[t.stockCode]) || t.sellPrice;
      if (currentPrice > 0) {
        const unrealized = calculateUnrealizedPnL(t.buyPrice, currentPrice, t.lots, t.buyFee, t.market || 'ID');
        return sum + unrealized.pnl;
      }
      return sum;
    }, 0);
  }, [openTrades, marketPrices]);

  const recentTrades = filteredTrades
    .filter(t => t.sellPrice && t.dateSell)
    .sort((a, b) => new Date(b.dateSell) - new Date(a.dateSell))
    .slice(0, 8);

  // Calendar heatmap for current month
  const now = useMemo(() => new Date(), []);
  const calendarDays = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const pnl = dailyPnL[dateStr] || 0;
      days.push({ day: d, date: dateStr, pnl });
    }
    return days;
  }, [dailyPnL, now]);

  if (trades.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">Selamat Datang di Jurnal Saham!</div>
        <div className="empty-state-desc">
          Mulai catat transaksi trading Anda untuk melihat dashboard performa di sini.
        </div>
        <Link to="/trades/new" className="btn btn-primary btn-lg">
          ➕ Catat Transaksi Pertama
        </Link>
      </div>
    );
  }

  return (
    <div>
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

      {filteredTrades.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">Belum ada transaksi di Pasar {isUS ? 'Amerika' : 'Indonesia'}</div>
          <div className="empty-state-desc">Catat transaksi pertama Anda untuk mulai memonitor performa.</div>
          <Link to="/trades/new" className="btn btn-primary" style={{ marginTop: 16 }}>
            ➕ Catat Transaksi Baru
          </Link>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid-stats">
            <StatCard
              icon="💰"
              label="Total Portfolio (Equity)"
              value={formatMoney(balance.realizedEquity)}
              subValue={`Modal Aktif: ${formatMoney(balance.totalCapital)}`}
              bgColor="var(--accent-blue-dim)"
            />
            <StatCard
              icon="💵"
              label="Buying Power"
              value={formatMoney(balance.buyingPower)}
              subValue={`Posisi Terbuka: ${balance.openPositionsCount}`}
              colorClass="text-profit"
              bgColor="rgba(16, 185, 129, 0.1)"
            />
            <StatCard
              icon={stats.totalPnL >= 0 ? '📈' : '📉'}
              label="Total Realized P/L"
              value={formatMoney(stats.totalPnL)}
              subValue={balance.totalCapital > 0 ? formatPercent(stats.totalPnL / balance.totalCapital * 100) : '0%'}
              colorClass={stats.totalPnL >= 0 ? 'text-profit' : 'text-loss'}
              bgColor={stats.totalPnL >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)'}
            />
            <StatCard
              icon={totalFloating >= 0 ? '🌊' : '📉'}
              label="Total Floating P/L"
              value={formatMoney(totalFloating)}
              subValue={balance.investedAmount > 0 ? formatPercent(totalFloating / balance.investedAmount * 100) : '0%'}
              colorClass={totalFloating >= 0 ? 'text-profit' : 'text-loss'}
              bgColor={totalFloating >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)'}
            />
            <StatCard
              icon="🎯"
              label="Win Rate"
              value={`${stats.winRate.toFixed(1)}%`}
              subValue={`${stats.winCount}W / ${stats.lossCount}L`}
              colorClass={stats.winRate >= 50 ? 'text-profit' : 'text-loss'}
              bgColor="var(--accent-purple-dim)"
            />
            <StatCard
              icon="📝"
              label="Total Transaksi"
              value={formatNumber(stats.totalTrades)}
              subValue={`${openTrades.length} posisi terbuka`}
              bgColor="var(--accent-yellow-dim)"
            />
          </div>

          {/* Achievements Horizontal Scroll */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🏅</span> Pencapaian Anda ({isUS ? 'US' : 'ID'})
            </h3>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
              {achievements.map(ach => (
                <div key={ach.id} className="card" style={{ 
                  minWidth: 200, 
                  flex: '0 0 auto', 
                  padding: 16, 
                  opacity: ach.unlocked ? 1 : 0.4,
                  border: ach.unlocked ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                  background: ach.unlocked ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-secondary)',
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8, filter: ach.unlocked ? 'none' : 'grayscale(100%)' }}>{ach.icon}</div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{ach.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ach.desc}</div>
                  {ach.unlocked && <div style={{ fontSize: '0.65rem', color: 'var(--accent-green)', marginTop: 8, fontWeight: 700 }}>✓ TERBUKA</div>}
                  {!ach.unlocked && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 8, fontWeight: 600 }}>🔒 TERKUNCI</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid-2" style={{ marginBottom: 24 }}>
            {/* Equity Curve */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">📈 Equity Curve</h3>
              </div>
              <div className="card-body" style={{ height: 280 }}>
                {equityCurve.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={equityCurve}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                      <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(v) => isUS ? formatMoney(v) : `${(v/1000000).toFixed(1)}Jt`} />
                      <Tooltip content={<CustomTooltip formatValue={formatMoney} />} />
                      <Line
                        type="monotone"
                        dataKey="equity"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#10B981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state" style={{ padding: 40 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Butuh minimal 2 transaksi untuk menampilkan grafik
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Calendar Heatmap */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">📅 Kalender {now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</h3>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
                  {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', padding: 4 }}>
                      {d}
                    </div>
                  ))}
                </div>
                <div className="heatmap-grid">
                  {calendarDays.map((cell, i) => (
                    <div
                      key={i}
                      className={`heatmap-cell ${cell ? (cell.pnl > 0 ? 'profit' : cell.pnl < 0 ? 'loss' : 'neutral') : ''}`}
                      title={cell ? `${cell.date}: ${formatMoney(cell.pnl)}` : ''}
                    >
                      {cell?.day || ''}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <span>🟢 Profit</span>
                  <span>🔴 Loss</span>
                  <span>⚫ Tidak ada trade</span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly P&L */}
          {monthlyPnL.length > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h3 className="card-title">📊 Profit/Loss Bulanan</h3>
              </div>
              <div className="card-body" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyPnL}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                    <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(v) => isUS ? formatMoney(v) : `${(v/1000000).toFixed(1)}Jt`} />
                    <Tooltip content={<CustomTooltip formatValue={formatMoney} />} />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                      {monthlyPnL.map((entry, i) => (
                        <Cell key={i} fill={entry.pnl >= 0 ? '#10B981' : '#F43F5E'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recent Trades */}
          {recentTrades.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">🕐 Transaksi Terakhir</h3>
                <Link to="/trades" className="btn btn-ghost btn-sm">Lihat Semua →</Link>
              </div>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Tanggal</th>
                      <th>Buy</th>
                      <th>Sell</th>
                      <th>Qty</th>
                      <th>P/L</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTrades.map(trade => {
                      const calc = calculateTradePnL(trade);
                      return (
                        <tr key={trade.id}>
                          <td><strong>{trade.stockCode}</strong></td>
                          <td style={{ color: 'var(--text-secondary)' }}>{formatDate(trade.dateSell)}</td>
                          <td>{formatMoney(trade.buyPrice)}</td>
                          <td>{formatMoney(trade.sellPrice)}</td>
                          <td>{trade.lots}</td>
                          <td className={calc.pnl >= 0 ? 'text-profit' : 'text-loss'}>
                            <strong>{formatMoney(calc.pnl)}</strong>
                          </td>
                          <td className={calc.pnlPercent >= 0 ? 'text-profit' : 'text-loss'}>
                            {formatPercent(calc.pnlPercent)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
