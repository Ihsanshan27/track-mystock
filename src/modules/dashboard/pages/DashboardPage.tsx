import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import { calculateStats, calculateTradePnL, calculateEquityCurve, calculateMonthlyPnL, calculateDailyPnL, calculatePortfolioBalance, calculateAchievements } from '@/modules/trades/calculations';
import { formatRupiah, formatUSD, formatDate, formatNumber } from '@/modules/shared/utils/formatters';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, AreaChart, Area } from 'recharts';
import * as Icons from 'lucide-react';
import StatCard from '@/modules/shared/components/StatCard';
import ChartTooltip from '@/modules/shared/components/ChartTooltip';
import MarketTabBar from '@/modules/shared/components/MarketTabBar';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import { useMarketFormatter } from '@/modules/shared/hooks/useMarketFormatter';
import { useOpenPositionMetrics } from '@/modules/shared/hooks/useOpenPositionMetrics';



export default function DashboardPage() {
  const { trades, cashflows, dividends, settings, marketPrices } = useData();
  const [activeTab, setActiveTab] = useState<'ID' | 'US'>('ID');
  const blurStyle = usePrivacyStyle();
  const { formatMoney, isUS, formatPercent } = useMarketFormatter(activeTab);
  const [chartTab, setChartTab] = useState<'equity' | 'drawdown'>('equity');

  const filteredTrades = useMemo(() => trades.filter(t => t.market === activeTab || (!t.market && activeTab === 'ID')), [trades, activeTab]);
  const filteredCashflows = useMemo(() => cashflows.filter(c => c.market === activeTab || (!c.market && activeTab === 'ID')), [cashflows, activeTab]);
  const filteredDividends = useMemo(() => dividends.filter(d => d.market === activeTab || (!d.market && activeTab === 'ID')), [dividends, activeTab]);

  const initialCap = activeTab === 'US' ? (settings.initialCapitalUS || 1000) : settings.initialCapital;

  const stats = useMemo(() => calculateStats(filteredTrades), [filteredTrades]);
  const equityCurve = useMemo(() => calculateEquityCurve(filteredTrades, initialCap), [filteredTrades, initialCap]);
  const maxDrawdownPercent = useMemo(() => {
    return Math.max(...equityCurve.map((c: any) => c.drawdownPercent || 0), 0);
  }, [equityCurve]);
  const maxDrawdownAmount = useMemo(() => {
    return Math.max(...equityCurve.map((c: any) => c.drawdown || 0), 0);
  }, [equityCurve]);
  const monthlyPnL = useMemo(() => calculateMonthlyPnL(filteredTrades), [filteredTrades]);
  const dailyPnL = useMemo(() => calculateDailyPnL(filteredTrades), [filteredTrades]);
  const balance = useMemo(() => calculatePortfolioBalance(filteredTrades, filteredCashflows, filteredDividends, initialCap), [filteredTrades, filteredCashflows, filteredDividends, initialCap]);
  const achievements = useMemo(() => calculateAchievements(filteredTrades, filteredDividends), [filteredTrades, filteredDividends]);

  // Combined calculations
  const allTradesID = useMemo(() => trades.filter(t => t.market !== 'US'), [trades]);
  const allTradesUS = useMemo(() => trades.filter(t => t.market === 'US'), [trades]);
  const allCashflowsID = useMemo(() => cashflows.filter(c => c.market !== 'US'), [cashflows]);
  const allCashflowsUS = useMemo(() => cashflows.filter(c => c.market === 'US'), [cashflows]);
  const allDividendsID = useMemo(() => dividends.filter(d => d.market !== 'US'), [dividends]);
  const allDividendsUS = useMemo(() => dividends.filter(d => d.market === 'US'), [dividends]);

  const balanceID = useMemo(() => calculatePortfolioBalance(allTradesID, allCashflowsID, allDividendsID, settings.initialCapital), [allTradesID, allCashflowsID, allDividendsID, settings.initialCapital]);
  const balanceUS = useMemo(() => calculatePortfolioBalance(allTradesUS, allCashflowsUS, allDividendsUS, settings.initialCapitalUS || 1000), [allTradesUS, allCashflowsUS, allDividendsUS, settings.initialCapitalUS]);

  const usdToIdrRate = settings.usdToIdrRate || 16200;
  const totalCombinedEquityIDR = balanceID.realizedEquity + (balanceUS.realizedEquity * usdToIdrRate);

  const hasUSAssets = useMemo(() => {
    return trades.some(t => t.market === 'US') || cashflows.some(c => c.market === 'US') || dividends.some(d => d.market === 'US');
  }, [trades, cashflows, dividends]);

  const { openTrades, totalFloating, totalInvested, tradingBalance } = useOpenPositionMetrics(
    filteredTrades,
    { market: activeTab, marketPrices: marketPrices as Record<string, number> }
  );

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
      <MarketTabBar activeTab={activeTab} onChange={setActiveTab} />

      {hasUSAssets && (
        <div className="bento-card" style={{ marginBottom: 24, borderLeft: '4px solid var(--accent-blue)', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Estimasi Total Aset Gabungan (IDR + Converted USD)
              </div>
              <h2 className="font-mono text-profit" style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
                {formatRupiah(totalCombinedEquityIDR)}
              </h2>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div>IDR Equity: {formatRupiah(balanceID.realizedEquity)}</div>
              <div>USD Equity: {formatUSD(balanceUS.realizedEquity)} (Kurs: Rp {usdToIdrRate.toLocaleString('id-ID')})</div>
            </div>
          </div>
        </div>
      )}

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
                valueStyle={blurStyle}
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
                valueStyle={blurStyle}
              />
            </div>
            <div className="bento-col-3">
              <StatCard
                icon={Icons.Wallet}
                label="Trading Balance"
                value={formatMoney(tradingBalance)}
                subValue={`Investasi + Floating P/L`}
                bgColor="var(--accent-blue-dim)"
                valueStyle={blurStyle}
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
            <div className="bento-col-3">
              <StatCard
                icon={Icons.Activity}
                label="Buying Power"
                value={formatMoney(balance.buyingPower)}
                subValue={`Posisi Terbuka: ${balance.openPositionsCount}`}
                colorClass="text-profit"
                bgColor="rgba(16, 185, 129, 0.1)"
                valueStyle={blurStyle}
              />
            </div>
            <div className="bento-col-3">
              <StatCard
                icon={totalFloating >= 0 ? Icons.Layers : Icons.TrendingDown}
                label="Total Floating P/L"
                value={formatMoney(totalFloating)}
                subValue={balance.investedAmount > 0 ? formatPercent(totalFloating / balance.investedAmount * 100) : '0%'}
                colorClass={totalFloating >= 0 ? 'text-profit' : 'text-loss'}
                bgColor={totalFloating >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)'}
                valueStyle={blurStyle}
              />
            </div>
            <div className="bento-col-3">
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
            {/* Equity & Drawdown Curve */}
            <div className="bento-card bento-col-8">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
                <div className="bento-card-title" style={{ margin: 0 }}>
                  <Icons.TrendingUp size={18} style={{ color: 'var(--accent-green)' }} />
                  <span>Grafik Performa</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setChartTab('equity')}
                    className={`btn btn-sm ${chartTab === 'equity' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 10px', height: 28 }}
                  >
                    Pertumbuhan Modal
                  </button>
                  <button
                    onClick={() => setChartTab('drawdown')}
                    className={`btn btn-sm ${chartTab === 'drawdown' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 10px', height: 28 }}
                  >
                    Drawdown (%)
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '4px 8px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>
                <div>Modal Awal: <strong>{formatMoney(initialCap)}</strong></div>
                <div style={{ color: 'var(--accent-red)' }}>
                  Max Drawdown: <strong>-{maxDrawdownPercent.toFixed(2)}%</strong> ({formatMoney(maxDrawdownAmount)})
                </div>
              </div>
              <div style={{ height: 280, marginTop: 8 }}>
                {equityCurve.length > 1 ? (
                  chartTab === 'equity' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={equityCurve}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                        <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                        <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(v) => isUS ? formatMoney(v) : `${(v/1000000).toFixed(1)}Jt`} />
                        <Tooltip content={<ChartTooltip formatValue={formatMoney} />} />
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
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equityCurve}>
                        <defs>
                          <linearGradient id="colorDd" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                        <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                        <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(v) => `-${v.toFixed(1)}%`} />
                        <Tooltip content={<ChartTooltip formatValue={(val) => `-${val.toFixed(2)}%`} />} />
                        <Area
                          type="monotone"
                          dataKey="drawdownPercent"
                          stroke="#f43f5e"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorDd)"
                          activeDot={{ r: 4, fill: '#f43f5e' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )
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
                    <Tooltip content={<ChartTooltip formatValue={formatMoney} />} />
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
