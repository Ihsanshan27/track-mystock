import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import { useTableSort } from '@/modules/shared/hooks/useTableSort';
import { formatRupiah } from '@/modules/shared/utils/formatters';
import * as Icons from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import type { IpoEvent } from '@/modules/ipo/types/ipo';

export default function IpoSummaryPage() {
  const { ipoEvents, ipoEntries } = useData();
  const navigate = useNavigate();
  const blurStyle = usePrivacyStyle();

  // Helper to calculate summary for a specific event
  const getEventSummary = (eventId: string) => {
    const entries = ipoEntries.filter((e: any) => e.ipoEventId === eventId);
    let totalCapital = 0, totalReturn = 0, sellCount = 0, keepCount = 0;
    
    entries.forEach((e: any) => {
      const shares = e.lots * 100;
      const buy = e.buyPrice * shares;
      const sell = e.sellPrice > 0 ? e.sellPrice * shares : buy;
      const profit = e.action === 'SELL' ? sell - buy : 0;
      totalCapital += buy;
      totalReturn += profit;
      if (e.action === 'SELL') sellCount++;
      else keepCount++;
    });

    return {
      totalCapital,
      totalReturn,
      avgReturnPct: totalCapital > 0 ? (totalReturn / totalCapital) * 100 : 0,
      accountCount: entries.length,
      sellCount,
      keepCount,
    };
  };

  // Compile detailed list of all events with their summaries
  const eventSummaries = useMemo(() => {
    return ipoEvents.map((event: IpoEvent) => {
      const summary = getEventSummary(event.id);
      return {
        event,
        ...summary,
      };
    }).sort((a, b) => new Date(b.event.ipoDate).getTime() - new Date(a.event.ipoDate).getTime());
  }, [ipoEvents, ipoEntries]);
  const { sortConfig, sortedItems: sortedEventSummaries, requestSort } = useTableSort(eventSummaries, {
    initialKey: 'ipoDate',
    initialDirection: 'desc',
    getValue: (item: any, key: 'stockCode' | 'ipoDate' | 'totalCapital' | 'totalReturn' | 'avgReturnPct' | 'accountCount' | 'statusSummary') => {
      switch (key) {
        case 'stockCode':
          return item.event.stockCode;
        case 'ipoDate':
          return item.event.ipoDate;
        case 'statusSummary':
          return `${item.sellCount}-${item.keepCount}`;
        default:
          return item[key] ?? 0;
      }
    },
    tieBreaker: (a: any, b: any) => new Date(b.event.ipoDate).getTime() - new Date(a.event.ipoDate).getTime(),
  });

  // Calculate global summary metrics
  const globalMetrics = useMemo(() => {
    let totalCapital = 0;
    let totalReturn = 0;
    let totalAccounts = 0;
    let profitEventsCount = 0;
    let lossEventsCount = 0;

    eventSummaries.forEach((item) => {
      totalCapital += item.totalCapital;
      totalReturn += item.totalReturn;
      totalAccounts += item.accountCount;
      if (item.accountCount > 0) {
        if (item.totalReturn > 0) profitEventsCount++;
        else if (item.totalReturn < 0) lossEventsCount++;
      }
    });

    const totalRatedEvents = profitEventsCount + lossEventsCount;
    const winRate = totalRatedEvents > 0 ? (profitEventsCount / totalRatedEvents) * 100 : 0;
    const avgReturnPct = totalCapital > 0 ? (totalReturn / totalCapital) * 100 : 0;

    return {
      totalCapital,
      totalReturn,
      totalAccounts,
      winRate,
      avgReturnPct,
      totalEvents: ipoEvents.length,
    };
  }, [eventSummaries, ipoEvents.length]);

  // Chart data (only for events that have accounts/entries)
  const chartData = useMemo(() => {
    return eventSummaries
      .filter((item) => item.accountCount > 0)
      .map((item) => ({
        name: item.event.stockCode,
        Profit: item.totalReturn,
      }))
      // Reverse to show chronologically from left to right (oldest to newest)
      .reverse();
  }, [eventSummaries]);

  // Custom tool-tip to avoid typescript issues and fit styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      return (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          fontSize: '0.8rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Emiten: <strong>{label}</strong></div>
          <div style={{ fontWeight: 800, color: val >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {val >= 0 ? '+' : ''}{formatRupiah(val)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/ipo')}
              style={{ padding: '4px 8px' }}
            >
              <Icons.ChevronLeft size={16} /> Kembali
            </button>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icons.BarChart3 size={26} style={{ color: 'var(--accent-green)' }} />
            Ringkasan Portofolio IPO
          </h1>
          <p className="page-subtitle">Rangkuman performa dan profitabilitas seluruh partisipasi IPO Anda</p>
        </div>
      </div>

      {/* Bento Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 28 }}>
        {[
          {
            label: 'Total Emiten IPO', value: String(globalMetrics.totalEvents),
            icon: Icons.Rocket, color: 'var(--accent-purple)', dim: 'var(--accent-purple-dim)'
          },
          {
            label: 'Total Akun Berpartisipasi', value: String(globalMetrics.totalAccounts),
            icon: Icons.Users, color: 'var(--accent-blue)', dim: 'var(--accent-blue-dim)'
          },
          {
            label: 'Total Modal Diputar', value: formatRupiah(globalMetrics.totalCapital),
            icon: Icons.Wallet, color: 'var(--accent-blue-light)', dim: 'rgba(56, 189, 248, 0.1)', blur: true
          },
          {
            label: 'Keuntungan Bersih', value: `${globalMetrics.totalReturn >= 0 ? '+' : ''}${formatRupiah(globalMetrics.totalReturn)}`,
            icon: globalMetrics.totalReturn >= 0 ? Icons.TrendingUp : Icons.TrendingDown,
            color: globalMetrics.totalReturn >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            dim: globalMetrics.totalReturn >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)',
            valueColor: globalMetrics.totalReturn >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            blur: true
          },
          {
            label: 'Win Rate IPO', value: `${globalMetrics.winRate.toFixed(1)}%`,
            icon: Icons.Award, color: 'var(--accent-yellow)', dim: 'var(--accent-yellow-dim)'
          },
          {
            label: 'Rata-rata Return', value: `${globalMetrics.avgReturnPct >= 0 ? '+' : ''}${globalMetrics.avgReturnPct.toFixed(2)}%`,
            icon: Icons.Percent,
            color: globalMetrics.avgReturnPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            dim: globalMetrics.avgReturnPct >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)',
            valueColor: globalMetrics.avgReturnPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
          }
        ].map((stat, i) => {
          const Ic = stat.icon;
          return (
            <div key={i} className="bento-card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </span>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: stat.dim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ic size={16} style={{ color: stat.color }} />
                </div>
              </div>
              <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: stat.valueColor || 'var(--text-primary)', ...(stat.blur ? blurStyle : {}) }}>
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Section */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: 28 }}>
          <div className="card-header">
            <h3 className="card-title">📊 Analisis Profitabilitas Per Emiten</h3>
          </div>
          <div className="card-body">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} tickFormatter={(v) => `Rp ${v >= 1e6 ? `${(v / 1e6).toFixed(1)}jt` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}rb` : v}`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="Profit" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.Profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 Rincian Performa Saham IPO</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container" style={{ border: 'none', margin: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th><SortableTableHeader label="Kode Saham" sortKey="stockCode" sortConfig={sortConfig} onSort={requestSort} /></th>
                  <th><SortableTableHeader label="Tanggal IPO" sortKey="ipoDate" sortConfig={sortConfig} onSort={requestSort} /></th>
                  <th><SortableTableHeader label="Modal Beli" sortKey="totalCapital" sortConfig={sortConfig} onSort={requestSort} /></th>
                  <th><SortableTableHeader label="Realized PnL" sortKey="totalReturn" sortConfig={sortConfig} onSort={requestSort} /></th>
                  <th><SortableTableHeader label="Rata-rata Return" sortKey="avgReturnPct" sortConfig={sortConfig} onSort={requestSort} /></th>
                  <th><SortableTableHeader label="Partisipasi Akun" sortKey="accountCount" sortConfig={sortConfig} onSort={requestSort} /></th>
                  <th><SortableTableHeader label="Status Akun (Sell / Keep)" sortKey="statusSummary" sortConfig={sortConfig} onSort={requestSort} /></th>
                </tr>
              </thead>
              <tbody>
                {sortedEventSummaries.map((item) => {
                  const hasEntries = item.accountCount > 0;
                  const isProfit = item.totalReturn >= 0;
                  
                  return (
                    <tr 
                      key={item.event.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/ipo/${item.event.id}`)}
                    >
                      <td>
                        <span style={{
                          background: 'var(--accent-green-dim)',
                          color: 'var(--accent-green)',
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          letterSpacing: '0.05em',
                        }}>
                          {item.event.stockCode}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.88rem' }}>
                        {new Date(item.event.ipoDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="font-mono" style={{ ...blurStyle, fontSize: '0.88rem' }}>
                        {hasEntries ? formatRupiah(item.totalCapital) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className={`font-mono ${isProfit ? 'text-profit' : 'text-loss'}`} style={{ ...blurStyle, fontWeight: 600, fontSize: '0.88rem' }}>
                        {hasEntries ? `${isProfit ? '+' : ''}${formatRupiah(item.totalReturn)}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className={`font-mono ${item.avgReturnPct >= 0 ? 'text-profit' : 'text-loss'}`} style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                        {hasEntries ? `${item.avgReturnPct >= 0 ? '+' : ''}${item.avgReturnPct.toFixed(2)}%` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ fontWeight: 600, fontSize: '0.88rem' }}>{item.accountCount} akun</td>
                      <td>
                        {hasEntries ? (
                          <div style={{ display: 'flex', gap: 8, fontSize: '0.78rem' }}>
                            <span style={{ background: 'var(--accent-green-dim)', color: 'var(--accent-green)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                              {item.sellCount} SELL
                            </span>
                            <span style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#d97706', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                              {item.keepCount} KEEP
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Belum ada akun</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
