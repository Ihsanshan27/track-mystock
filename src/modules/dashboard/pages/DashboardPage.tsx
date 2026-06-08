import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import { calculateStats, calculateTradePnL, calculateUnrealizedPnL, calculateEquityCurve, calculateMonthlyPnL, calculateDailyPnL, calculatePortfolioBalance, calculateAchievements } from '@/modules/trades/calculations';
import { formatRupiah, formatUSD, formatPercent, formatDate, formatNumber } from '@/modules/shared/utils/formatters';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import * as Icons from 'lucide-react';

interface StatCardProps {
  icon: React.ComponentType<any> | null;
  label: string;
  value: string;
  subValue?: string;
  colorClass?: string;
  bgColor?: string;
}

function StatCard({ icon: Icon, label, value, subValue, colorClass, bgColor }: StatCardProps) {
  return (
    <div className="bento-card" style={{ justifyContent: 'center', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        {Icon && (
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            background: bgColor || 'var(--accent-blue-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colorClass === 'text-profit' ? 'var(--accent-green)' : colorClass === 'text-loss' ? 'var(--accent-red)' : 'var(--text-secondary)'
          }}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className={`font-mono ${colorClass || ''}`} style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
        {value}
      </div>
      {subValue && (
        <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {subValue}
        </div>
      )}
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatValue?: (val: number) => string;
}

function CustomTooltip({ active, payload, label, formatValue }: CustomTooltipProps) {
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
      <div style={{ fontWeight: 700, color: Number(payload[0].value) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
        {formatValue ? formatValue(Number(payload[0].value)) : payload[0].value}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { trades, cashflows, dividends, settings, marketPrices } = useData();
  const [activeTab, setActiveTab] = useState<'ID' | 'US'>('ID');

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
    .sort((a, b) => new Date(b.dateSell).getTime() - new Date(a.dateSell).getTime())
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
        <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--text-muted)' }}>
          <Icons.LayoutDashboard size={48} />
        </div>
        <div className="empty-state-title">Selamat Datang di Jurnal Saham</div>
        <div className="empty-state-desc">
          Mulai catat transaksi trading Anda untuk melihat dashboard performa di sini.
        </div>
        <Link to="/trades/new" className="btn btn-primary btn-lg" style={{ marginTop: 16 }}>
          Catat Transaksi Pertama
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border-color)' }}>
        <button 
          className={`tab-btn ${activeTab === 'ID' ? 'active' : ''}`}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'ID' ? '2px solid var(--accent-green)' : '2px solid transparent', color: activeTab === 'ID' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}
          onClick={() => setActiveTab('ID')}
        >
          Pasar Indonesia
        </button>
        <button 
          className={`tab-btn ${activeTab === 'US' ? 'active' : ''}`}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'US' ? '2px solid var(--accent-green)' : '2px solid transparent', color: activeTab === 'US' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}
          onClick={() => setActiveTab('US')}
        >
          Pasar Amerika
        </button>
      </div>

      {filteredTrades.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--text-muted)' }}>
            <Icons.LayoutDashboard size={48} />
          </div>
          <div className="empty-state-title">Belum ada transaksi di Pasar {isUS ? 'Amerika' : 'Indonesia'}</div>
          <div className="empty-state-desc">Catat transaksi pertama Anda untuk mulai memonitor performa.</div>
          <Link to="/trades/new" className="btn btn-primary" style={{ marginTop: 16 }}>
            Catat Transaksi Baru
          </Link>
        </div>
      ) : (
        <>
          {/* Stat Cards - Bento Grid (Asymmetric layout) */}
          <div className="bento-grid">
            {/* Row 1 */}
            <div className="bento-col-6">
              <StatCard
                icon={Icons.Wallet}
                label="Total Portfolio (Equity)"
                value={formatMoney(balance.realizedEquity)}
                subValue={`Modal Aktif: ${formatMoney(balance.totalCapital)}`}
                bgColor="var(--accent-blue-dim)"
              />
            </div>
            <div className="bento-col-3">
              <StatCard
                icon={stats.totalPnL >= 0 ? Icons.TrendingUp : Icons.TrendingDown}
                label="Total Realized P/L"
                value={formatMoney(stats.totalPnL)}
                subValue={balance.totalCapital > 0 ? formatPercent(stats.totalPnL / balance.totalCapital * 100) : '0%'}
                colorClass={stats.totalPnL >= 0 ? 'text-profit' : 'text-loss'}
                bgColor={stats.totalPnL >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)'}
              />
            </div>
            <div className="bento-col-3">
              <StatCard
                icon={Icons.Target}
                label="Win Rate"
                value={`${stats.winRate.toFixed(1)}%`}
                subValue={`${stats.winCount}W / ${stats.lossCount}L`}
                colorClass={stats.winRate >= 50 ? 'text-profit' : 'text-loss'}
                bgColor="var(--accent-purple-dim)"
              />
            </div>

            {/* Row 2 */}
            <div className="bento-col-4">
              <StatCard
                icon={Icons.Activity}
                label="Buying Power"
                value={formatMoney(balance.buyingPower)}
                subValue={`Posisi Terbuka: ${balance.openPositionsCount}`}
                colorClass="text-profit"
                bgColor="rgba(16, 185, 129, 0.1)"
              />
            </div>
            <div className="bento-col-4">
              <StatCard
                icon={totalFloating >= 0 ? Icons.Layers : Icons.TrendingDown}
                label="Total Floating P/L"
                value={formatMoney(totalFloating)}
                subValue={balance.investedAmount > 0 ? formatPercent(totalFloating / balance.investedAmount * 100) : '0%'}
                colorClass={totalFloating >= 0 ? 'text-profit' : 'text-loss'}
                bgColor={totalFloating >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)'}
              />
            </div>
            <div className="bento-col-4">
              <StatCard
                icon={Icons.FileText}
                label="Total Transaksi"
                value={formatNumber(stats.totalTrades)}
                subValue={`${openTrades.length} posisi terbuka`}
                bgColor="var(--accent-yellow-dim)"
              />
            </div>
          </div>

          {/* Achievements Horizontal Scroll */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icons.Award size={18} style={{ color: 'var(--accent-yellow)' }} />
              Pencapaian Anda ({isUS ? 'US' : 'ID'})
            </h3>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
              {achievements.map(ach => {
                const AchIcon = (Icons as any)[ach.icon] || Icons.Award;
                return (
                  <div key={ach.id} className="bento-card" style={{ 
                    minWidth: 220, 
                    flex: '0 0 auto', 
                    padding: 20, 
                    opacity: ach.unlocked ? 1 : 0.5,
                    border: ach.unlocked ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                    background: ach.unlocked ? 'rgba(16, 185, 129, 0.03)' : 'var(--bg-card)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%', 
                        background: ach.unlocked ? 'var(--accent-green-dim)' : 'var(--bg-input)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: ach.unlocked ? 'var(--accent-green)' : 'var(--text-muted)'
                      }}>
                        <AchIcon size={20} />
                      </div>
                      <div>
                        {ach.unlocked ? (
                          <Icons.Unlock size={14} style={{ color: 'var(--accent-green)' }} />
                        ) : (
                          <Icons.Lock size={14} style={{ color: 'var(--text-muted)' }} />
                        )}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{ach.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{ach.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Charts Row - Bento styled columns */}
          <div className="bento-grid" style={{ marginBottom: 24 }}>
            {/* Equity Curve */}
            <div className="bento-card bento-col-8">
              <div className="bento-card-title">
                <Icons.TrendingUp size={18} style={{ color: 'var(--accent-green)' }} />
                <span>Equity Curve</span>
              </div>
              <div style={{ height: 280, marginTop: 8 }}>
                {equityCurve.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={equityCurve}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                      <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(v) => isUS ? formatMoney(v) : `${(v/1000000).toFixed(1)}Jt`} />
                      <Tooltip content={<CustomTooltip formatValue={formatMoney} />} />
                      <Line
                        type="monotone"
                        dataKey="equity"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#10b981' }}
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
            <div className="bento-card bento-col-4">
              <div className="bento-card-title">
                <Icons.Calendar size={18} style={{ color: 'var(--accent-green)' }} />
                <span>Kalender Performa ({now.toLocaleString('id-ID', { month: 'short' })})</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
                  {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((d, idx) => (
                    <div key={idx} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', padding: 4, fontWeight: 700 }}>
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
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16, fontSize: '0.7rem', color: 'var(--text-muted)', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)' }}></span>
                    <span>Profit</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-red)' }}></span>
                    <span>Loss</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(148, 163, 184, 0.1)' }}></span>
                    <span>No Trade</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly P&L */}
          {monthlyPnL.length > 0 && (
            <div className="bento-card" style={{ marginBottom: 24 }}>
              <div className="bento-card-title">
                <Icons.BarChart3 size={18} style={{ color: 'var(--accent-green)' }} />
                <span>Profit/Loss Bulanan</span>
              </div>
              <div style={{ height: 260, marginTop: 8 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyPnL}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                    <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(v) => isUS ? formatMoney(v) : `${(v/1000000).toFixed(1)}Jt`} />
                    <Tooltip content={<CustomTooltip formatValue={formatMoney} />} />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                      {monthlyPnL.map((entry, i) => (
                        <Cell key={i} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recent Trades */}
          {recentTrades.length > 0 && (
            <div className="bento-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div className="bento-card-title" style={{ marginBottom: 0 }}>
                  <Icons.History size={18} style={{ color: 'var(--accent-green)' }} />
                  <span>Transaksi Terakhir</span>
                </div>
                <Link to="/trades" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Lihat Semua</span>
                  <Icons.ArrowRight size={14} />
                </Link>
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
                          <td className="font-mono">{formatMoney(trade.buyPrice)}</td>
                          <td className="font-mono">{formatMoney(trade.sellPrice)}</td>
                          <td className="font-mono">{trade.lots}</td>
                          <td className={`${calc.pnl >= 0 ? 'text-profit' : 'text-loss'} font-mono`}>
                            <strong>{formatMoney(calc.pnl)}</strong>
                          </td>
                          <td className={`${calc.pnlPercent >= 0 ? 'text-profit' : 'text-loss'} font-mono`}>
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
