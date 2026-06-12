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
  const [activeMarketTab, setActiveMarketTab] = useState<'ID' | 'US'>('ID');
  const blurStyle = usePrivacyStyle();
  const { formatMoney, isUS, formatPercent } = useMarketFormatter(activeMarketTab);
  const [activeChartTab, setActiveChartTab] = useState<'equity' | 'drawdown'>('equity');

  const filteredTrades = useMemo(() => trades.filter(trade => trade.market === activeMarketTab || (!trade.market && activeMarketTab === 'ID')), [trades, activeMarketTab]);
  const filteredCashflows = useMemo(() => cashflows.filter(cashflow => cashflow.market === activeMarketTab || (!cashflow.market && activeMarketTab === 'ID')), [cashflows, activeMarketTab]);
  const filteredDividends = useMemo(() => dividends.filter(dividend => dividend.market === activeMarketTab || (!dividend.market && activeMarketTab === 'ID')), [dividends, activeMarketTab]);

  const initialCapitalForMarket = activeMarketTab === 'US' ? (settings.initialCapitalUS || 1000) : settings.initialCapital;

  const stats = useMemo(() => calculateStats(filteredTrades), [filteredTrades]);
  const equityCurve = useMemo(() => calculateEquityCurve(filteredTrades, initialCapitalForMarket), [filteredTrades, initialCapitalForMarket]);
  const maxDrawdownPercent = useMemo(() => {
    return Math.max(...equityCurve.map((equityPoint: any) => equityPoint.drawdownPercent || 0), 0);
  }, [equityCurve]);
  const maxDrawdownAmount = useMemo(() => {
    return Math.max(...equityCurve.map((equityPoint: any) => equityPoint.drawdown || 0), 0);
  }, [equityCurve]);
  const monthlyPnL = useMemo(() => calculateMonthlyPnL(filteredTrades), [filteredTrades]);
  const dailyPnL = useMemo(() => calculateDailyPnL(filteredTrades), [filteredTrades]);
  const balance = useMemo(() => calculatePortfolioBalance(filteredTrades, filteredCashflows, filteredDividends, initialCapitalForMarket), [filteredTrades, filteredCashflows, filteredDividends, initialCapitalForMarket]);
  const achievements = useMemo(() => calculateAchievements(filteredTrades, filteredDividends), [filteredTrades, filteredDividends]);

  const allIndonesianTrades = useMemo(() => trades.filter(trade => trade.market !== 'US'), [trades]);
  const allUsTrades = useMemo(() => trades.filter(trade => trade.market === 'US'), [trades]);
  const allIndonesianCashflows = useMemo(() => cashflows.filter(cashflow => cashflow.market !== 'US'), [cashflows]);
  const allUsCashflows = useMemo(() => cashflows.filter(cashflow => cashflow.market === 'US'), [cashflows]);
  const allIndonesianDividends = useMemo(() => dividends.filter(dividend => dividend.market !== 'US'), [dividends]);
  const allUsDividends = useMemo(() => dividends.filter(dividend => dividend.market === 'US'), [dividends]);

  const indonesianMarketBalance = useMemo(() => calculatePortfolioBalance(allIndonesianTrades, allIndonesianCashflows, allIndonesianDividends, settings.initialCapital), [allIndonesianTrades, allIndonesianCashflows, allIndonesianDividends, settings.initialCapital]);
  const usMarketBalance = useMemo(() => calculatePortfolioBalance(allUsTrades, allUsCashflows, allUsDividends, settings.initialCapitalUS || 1000), [allUsTrades, allUsCashflows, allUsDividends, settings.initialCapitalUS]);

  const usdToIdrRate = settings.usdToIdrRate || 16200;
  const totalCombinedEquityInIdr = indonesianMarketBalance.realizedEquity + (usMarketBalance.realizedEquity * usdToIdrRate);

  const hasUsAssets = useMemo(() => {
    return trades.some(trade => trade.market === 'US') || cashflows.some(cashflow => cashflow.market === 'US') || dividends.some(dividend => dividend.market === 'US');
  }, [trades, cashflows, dividends]);

  const { openTrades, totalFloating, totalInvested, tradingBalance } = useOpenPositionMetrics(
    filteredTrades,
    { market: activeMarketTab, marketPrices: marketPrices as Record<string, number> }
  );

  const recentTrades = filteredTrades
    .filter(trade => trade.sellPrice && trade.dateSell)
    .sort((newerTrade, olderTrade) => new Date(olderTrade.dateSell).getTime() - new Date(newerTrade.dateSell).getTime())
    .slice(0, 8);

  const now = useMemo(() => new Date(), []);
  const calendarDays = useMemo(() => {
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const firstWeekdayOffset = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const calendarDayCells = [];

    for (let emptyCellIndex = 0; emptyCellIndex < firstWeekdayOffset; emptyCellIndex++) {
      calendarDayCells.push(null);
    }

    for (let dayNumber = 1; dayNumber <= totalDaysInMonth; dayNumber++) {
      const calendarDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
      const dayProfitLoss = dailyPnL[calendarDate] || 0;
      calendarDayCells.push({ day: dayNumber, date: calendarDate, pnl: dayProfitLoss });
    }

    return calendarDayCells;
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
      <MarketTabBar activeTab={activeMarketTab} onChange={setActiveMarketTab} />
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
          <div className="bento-grid">
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

          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icons.Award size={18} style={{ color: 'var(--accent-yellow)' }} />
              Pencapaian Anda ({isUS ? 'US' : 'ID'})
            </h3>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
              {achievements.map(achievement => {
                const AchievementIcon = (Icons as any)[achievement.icon] || Icons.Award;
                return (
                  <div key={achievement.id} className="bento-card" style={{
                    minWidth: 220,
                    flex: '0 0 auto',
                    padding: 20,
                    opacity: achievement.unlocked ? 1 : 0.5,
                    border: achievement.unlocked ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                    background: achievement.unlocked ? 'rgba(16, 185, 129, 0.03)' : 'var(--bg-card)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: achievement.unlocked ? 'var(--accent-green-dim)' : 'var(--bg-input)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: achievement.unlocked ? 'var(--accent-green)' : 'var(--text-muted)'
                      }}>
                        <AchievementIcon size={20} />
                      </div>
                      <div>
                        {achievement.unlocked ? (
                          <Icons.Unlock size={14} style={{ color: 'var(--accent-green)' }} />
                        ) : (
                          <Icons.Lock size={14} style={{ color: 'var(--text-muted)' }} />
                        )}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{achievement.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{achievement.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bento-grid" style={{ marginBottom: 24 }}>
            <div className="bento-card bento-col-8">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
                <div className="bento-card-title" style={{ margin: 0 }}>
                  <Icons.TrendingUp size={18} style={{ color: 'var(--accent-green)' }} />
                  <span>Grafik Performa</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setActiveChartTab('equity')}
                    className={`btn btn-sm ${activeChartTab === 'equity' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 10px', height: 28 }}
                  >
                    Pertumbuhan Modal
                  </button>
                  <button
                    onClick={() => setActiveChartTab('drawdown')}
                    className={`btn btn-sm ${activeChartTab === 'drawdown' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 10px', height: 28 }}
                  >
                    Drawdown (%)
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '4px 8px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>
                <div>Modal Awal: <strong>{formatMoney(initialCapitalForMarket)}</strong></div>
                <div style={{ color: 'var(--accent-red)' }}>
                  Max Drawdown: <strong>-{maxDrawdownPercent.toFixed(2)}%</strong> ({formatMoney(maxDrawdownAmount)})
                </div>
              </div>
              <div style={{ height: 280, marginTop: 8 }}>
                {equityCurve.length > 1 ? (
                  activeChartTab === 'equity' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={equityCurve}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                        <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(dateLabel) => dateLabel.slice(5)} />
                        <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(amount) => isUS ? formatMoney(amount) : `${(amount / 1000000).toFixed(1)}Jt`} />
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
                        <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(dateLabel) => dateLabel.slice(5)} />
                        <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(drawdownPercent) => `-${drawdownPercent.toFixed(1)}%`} />
                        <Tooltip content={<ChartTooltip formatValue={(drawdownPercent) => `-${drawdownPercent.toFixed(2)}%`} />} />
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

            <div className="bento-card bento-col-4">
              <div className="bento-card-title">
                <Icons.Calendar size={18} style={{ color: 'var(--accent-green)' }} />
                <span>Kalender Performa ({now.toLocaleString('id-ID', { month: 'short' })})</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
                  {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((dayLabel, dayLabelIndex) => (
                    <div key={dayLabelIndex} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', padding: 4, fontWeight: 700 }}>
                      {dayLabel}
                    </div>
                  ))}
                </div>
                <div className="heatmap-grid">
                  {calendarDays.map((calendarCell, calendarCellIndex) => (
                    <div
                      key={calendarCellIndex}
                      className={`heatmap-cell ${calendarCell ? (calendarCell.pnl > 0 ? 'profit' : calendarCell.pnl < 0 ? 'loss' : 'neutral') : ''}`}
                      title={calendarCell ? `${calendarCell.date}: ${formatMoney(calendarCell.pnl)}` : ''}
                    >
                      {calendarCell?.day || ''}
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
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(amount) => isUS ? formatMoney(amount) : `${(amount / 1000000).toFixed(1)}Jt`} />
                    <Tooltip content={<ChartTooltip formatValue={formatMoney} />} />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                      {monthlyPnL.map((monthlyEntry, monthlyEntryIndex) => (
                        <Cell key={monthlyEntryIndex} fill={monthlyEntry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

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
                      const tradePerformance = calculateTradePnL(trade);
                      return (
                        <tr key={trade.id}>
                          <td><strong>{trade.stockCode}</strong></td>
                          <td style={{ color: 'var(--text-secondary)' }}>{formatDate(trade.dateSell)}</td>
                          <td className="font-mono">{formatMoney(trade.buyPrice)}</td>
                          <td className="font-mono">{formatMoney(trade.sellPrice)}</td>
                          <td className="font-mono">{trade.lots}</td>
                          <td className={`${tradePerformance.pnl >= 0 ? 'text-profit' : 'text-loss'} font-mono`}>
                            <strong>{formatMoney(tradePerformance.pnl)}</strong>
                          </td>
                          <td className={`${tradePerformance.pnlPercent >= 0 ? 'text-profit' : 'text-loss'} font-mono`}>
                            {formatPercent(tradePerformance.pnlPercent)}
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
