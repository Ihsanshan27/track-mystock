import { useMemo } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import {
  calculateStats, calculateStrategyStats, calculateDayOfWeekPnL,
  calculateEmotionStats, calculateTopStocks, calculateMonthlyPnL, calculateTagStats
} from '@/modules/trades/calculations';
import { formatRupiah } from '@/modules/shared/utils/formatters';
import { EMOTIONS } from '@/modules/shared/utils/constants';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '0.8rem' }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: payload[0].value >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
        {formatRupiah(payload[0].value)}
      </div>
    </div>
  );
}

const EMOJI_MAP: Record<string, string> = {
  calm: '😌',
  confident: '😎',
  fearful: '😨',
  greedy: '🤑',
  revenge: '😡',
  doubtful: '🤔',
  fomo: '😱',
  neutral: '😐'
};

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#F43F5E', '#06B6D4', '#EC4899', '#84CC16'];

export default function AnalyticsPage() {
  const { trades, settings } = useData();

  const stats = useMemo(() => calculateStats(trades), [trades]);
  const strategyStats = useMemo(() => calculateStrategyStats(trades), [trades]);
  const dayOfWeek = useMemo(() => calculateDayOfWeekPnL(trades), [trades]);
  const emotionStats = useMemo(() => calculateEmotionStats(trades), [trades]);
  const tagStats = useMemo(() => calculateTagStats(trades), [trades]);
  const topStocks = useMemo(() => calculateTopStocks(trades), [trades]);
  const monthlyPnL = useMemo(() => calculateMonthlyPnL(trades), [trades]);

  const closedTrades = trades.filter(t => t.sellPrice && t.dateSell);

  if (closedTrades.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📈</div>
        <div className="empty-state-title">Belum ada data untuk dianalisis</div>
        <div className="empty-state-desc">Tutup beberapa transaksi untuk melihat analitik performa</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📈 Analitik & Statistik</h1>
          <p className="page-subtitle">Analisis mendalam performa trading Anda</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-card-label">Win Rate</div>
          <div className={`stat-card-value ${stats.winRate >= 50 ? 'text-profit' : 'text-loss'}`}>{stats.winRate.toFixed(1)}%</div>
          <div className="stat-card-change positive">{stats.winCount}W / {stats.lossCount}L</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Profit Factor</div>
          <div className={`stat-card-value ${stats.profitFactor >= 1 ? 'text-profit' : 'text-loss'}`}>
            {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Rata-rata Win</div>
          <div className="stat-card-value text-profit">{formatRupiah(stats.avgWin)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Rata-rata Loss</div>
          <div className="stat-card-value text-loss">{formatRupiah(stats.avgLoss)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Expectancy</div>
          <div className={`stat-card-value ${stats.expectancy >= 0 ? 'text-profit' : 'text-loss'}`}>{formatRupiah(stats.expectancy)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Avg Holding</div>
          <div className="stat-card-value">{stats.avgHoldingDays.toFixed(0)} hari</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Strategy Win Rate */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">🎯 Win Rate per Strategi</h3></div>
          <div className="card-body" style={{ height: 280 }}>
            {strategyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={strategyStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v) => `${v.toFixed(1)}%`} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.8rem' }} />
                  <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                    {strategyStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Belum ada data strategi</div>}
          </div>
        </div>

        {/* P&L by Day */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">📅 P/L per Hari</h3></div>
          <div className="card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}Rb`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {dayOfWeek.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? '#10B981' : '#F43F5E'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Emotion Analysis */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">🧠 Analisis Emosi</h3></div>
          <div className="card-body">
            {emotionStats.length > 0 ? (
              <div>
                {emotionStats.map(es => {
                  const emotionsList = settings?.customEmotions || EMOTIONS;
                  const em = emotionsList.find(e => e.value === es.emotion);
                  return (
                    <div key={es.emotion} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.2rem' }}>{EMOJI_MAP[es.emotion] || '❓'}</span>
                        <span style={{ fontSize: '0.85rem' }}>{em?.label || es.emotion}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{es.count} trades</span>
                        <span className={`badge ${es.winRate >= 50 ? 'badge-green' : 'badge-red'}`}>
                          {es.winRate.toFixed(0)}% win
                        </span>
                        <span className={es.totalPnL >= 0 ? 'text-profit' : 'text-loss'} style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {formatRupiah(es.totalPnL)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Belum ada data emosi</div>}
          </div>
        </div>

      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Tag Analytics */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">🏷️ Analisis Custom Tags</h3></div>
          <div className="card-body">
            {tagStats.length > 0 ? (
              <div>
                {tagStats.slice(0, 10).map((ts) => (
                  <div key={ts.tagName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge badge-purple">#{ts.tagName}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ts.count} trades</span>
                      <span className={`badge ${ts.winRate >= 50 ? 'badge-green' : 'badge-red'}`}>
                        {ts.winRate.toFixed(0)}% win
                      </span>
                      <span className={ts.totalPnL >= 0 ? 'text-profit' : 'text-loss'} style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {formatRupiah(ts.totalPnL)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Belum ada data custom tags</div>}
          </div>
        </div>

        {/* Top Stocks */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">🏆 Top Saham</h3></div>
          <div className="card-body">
            {topStocks.slice(0, 10).map((stock, i) => (
              <div key={stock.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                    {i + 1}
                  </span>
                  <strong>{stock.code}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{stock.trades} trades</span>
                  <span className={`badge ${stock.winRate >= 50 ? 'badge-green' : 'badge-red'}`}>
                    {stock.winRate.toFixed(0)}%
                  </span>
                  <span className={stock.totalPnL >= 0 ? 'text-profit' : 'text-loss'} style={{ fontWeight: 700 }}>
                    {formatRupiah(stock.totalPnL)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly P&L */}
      {monthlyPnL.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">📊 Profit/Loss Bulanan</h3></div>
          <div className="card-body" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPnL}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={v => `${(v/1000000).toFixed(1)}Jt`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {monthlyPnL.map((entry, i) => <Cell key={i} fill={entry.pnl >= 0 ? '#10B981' : '#F43F5E'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
