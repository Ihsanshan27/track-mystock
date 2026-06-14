import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import MarketTabBar from '@/modules/shared/components/MarketTabBar';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { useData } from '@/modules/shared/context/DataContext';
import { useTableSort } from '@/modules/shared/hooks/useTableSort';
import { calculateTradePnL } from '@/modules/trades/calculations';
import { formatCompactNumber, formatDate, formatPercent, formatRupiah, formatUSD } from '@/modules/shared/utils/formatters';
import * as Icons from 'lucide-react';

type MarketTab = 'ID' | 'US';

type RangeKey = 'today' | 'mtd' | 'ytd' | 'last7d' | 'last30d' | 'last90d' | 'all';

function parseLocalDate(dateString?: string | null) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatMonthKey(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDayLabel(dateKey: string) {
  return formatDate(dateKey);
}

export default function HistoryPage() {
  const { trades, settings, activePortfolioId } = useData();
  const [activeTab, setActiveTab] = useState<MarketTab>('ID');
  const [selectedRangeKey, setSelectedRangeKey] = useState<RangeKey>('mtd');
  const formatMoney = activeTab === 'US' ? formatUSD : formatRupiah;
  const now = useMemo(() => new Date(), []);
  const baseEquity = activePortfolioId === 'default'
    ? (activeTab === 'US' ? (settings.initialCapitalUS ?? 1000) : (settings.initialCapital ?? 10000000))
    : 0;

  const closedTrades = useMemo(() => {
    return trades
      .filter((trade: any) => trade.sellPrice && trade.dateSell)
      .filter((trade: any) => trade.market === activeTab || (!trade.market && activeTab === 'ID'))
      .map((trade: any) => {
        const calc = calculateTradePnL(trade);
        return {
          ...trade,
          ...calc,
          sellDateObj: parseLocalDate(trade.dateSell)!,
        };
      })
      .sort((a: any, b: any) => b.sellDateObj.getTime() - a.sellDateObj.getTime());
  }, [activeTab, trades]);

  const rangeSummaries = useMemo(() => {
    const todayStart = startOfDay(now);
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const ninetyDaysAgo = new Date(todayStart);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);

    const rangeMap: Array<{ key: RangeKey; label: string; matches: (sellDate: Date) => boolean }> = [
      { key: 'today', label: 'Today', matches: (sellDate) => isSameDay(sellDate, now) },
      { key: 'mtd', label: 'Month To Date', matches: (sellDate) => sellDate.getFullYear() === now.getFullYear() && sellDate.getMonth() === now.getMonth() },
      { key: 'ytd', label: 'Year To Date', matches: (sellDate) => sellDate.getFullYear() === now.getFullYear() },
      { key: 'last7d', label: 'Last 7 Days', matches: (sellDate) => sellDate >= sevenDaysAgo && sellDate <= now },
      { key: 'last30d', label: 'Last 1 Month', matches: (sellDate) => sellDate >= thirtyDaysAgo && sellDate <= now },
      { key: 'last90d', label: 'Last 3 Months', matches: (sellDate) => sellDate >= ninetyDaysAgo && sellDate <= now },
      { key: 'all', label: 'All Time', matches: () => true },
    ];

    return rangeMap.map((range) => {
      const items = closedTrades.filter((trade: any) => range.matches(trade.sellDateObj));
      const realized = items.reduce((sum: number, trade: any) => sum + trade.pnl, 0);
      const invested = items.reduce((sum: number, trade: any) => sum + trade.totalBuy, 0);
      const wins = items.filter((trade: any) => trade.pnl > 0).length;

      return {
        ...range,
        count: items.length,
        realized,
        invested,
        winRate: items.length > 0 ? (wins / items.length) * 100 : 0,
      };
    });
  }, [closedTrades, now]);

  const selectedRangeSummary = useMemo(() => {
    return rangeSummaries.find((range) => range.key === selectedRangeKey) || rangeSummaries[0] || null;
  }, [rangeSummaries, selectedRangeKey]);

  const selectedRangeTrades = useMemo(() => {
    if (!selectedRangeSummary) return closedTrades;
    return closedTrades.filter((trade: any) => selectedRangeSummary.matches(trade.sellDateObj));
  }, [closedTrades, selectedRangeSummary]);

  const trendData = useMemo(() => {
    const grouped = new Map<string, {
      key: string;
      label: string;
      realized: number;
      sortValue: number;
    }>();

    selectedRangeTrades.forEach((trade: any) => {
      const key = trade.dateSell || formatDateKey(trade.sellDateObj);
      const label = formatDayLabel(key);
      const sortValue = trade.sellDateObj.getTime();

      if (!grouped.has(key)) {
        grouped.set(key, { key, label, realized: 0, sortValue });
      }

      grouped.get(key)!.realized += trade.pnl;
    });

    return Array.from(grouped.values()).sort((a, b) => a.sortValue - b.sortValue);
  }, [selectedRangeTrades]);

  const monthlyData = useMemo(() => {
    const grouped = new Map<string, {
      monthKey: string;
      label: string;
      realized: number;
      invested: number;
      tradeCount: number;
      winCount: number;
    }>();

    selectedRangeTrades.forEach((trade: any) => {
      const monthKey = trade.dateSell.slice(0, 7);
      if (!grouped.has(monthKey)) {
        grouped.set(monthKey, {
          monthKey,
          label: formatMonthKey(monthKey),
          realized: 0,
          invested: 0,
          tradeCount: 0,
          winCount: 0,
        });
      }

      const current = grouped.get(monthKey)!;
      current.realized += trade.pnl;
      current.invested += trade.totalBuy;
      current.tradeCount += 1;
      if (trade.pnl > 0) current.winCount += 1;
    });

    return Array.from(grouped.values())
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      .map((item) => ({
        ...item,
        returnPct: item.invested > 0 ? (item.realized / item.invested) * 100 : 0,
        winRate: item.tradeCount > 0 ? (item.winCount / item.tradeCount) * 100 : 0,
      }));
  }, [selectedRangeTrades]);

  const cumulativeTrendData = useMemo(() => {
    let runningRealized = 0;
    return trendData
      .map((item) => {
        runningRealized += item.realized;
        return {
          ...item,
          cumulativeRealized: runningRealized,
          totalEquity: baseEquity + runningRealized,
        };
      });
  }, [baseEquity, trendData]);

  const renderHistoryTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        fontSize: '0.8rem',
      }}>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
        {payload.map((item: any) => (
          <div key={item.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: item.color, display: 'inline-block' }} />
            <span style={{ color: 'var(--text-secondary)' }}>{item.name}:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{formatMoney(Number(item.value))}</strong>
          </div>
        ))}
      </div>
    );
  };

  const { sortConfig: monthSortConfig, sortedItems: sortedMonthlyData, requestSort: requestMonthSort } = useTableSort(monthlyData, {
    initialKey: 'monthKey',
    initialDirection: 'desc',
    getValue: (item: any, key: 'monthKey' | 'realized' | 'tradeCount' | 'returnPct' | 'winRate') => item[key] ?? 0,
  });

  const { sortConfig: tradeSortConfig, sortedItems: sortedClosedTrades, requestSort: requestTradeSort } = useTableSort(selectedRangeTrades, {
    initialKey: 'dateSell',
    initialDirection: 'desc',
    getValue: (trade: any, key: 'stockCode' | 'dateSell' | 'buyPrice' | 'sellPrice' | 'lots' | 'pnl' | 'pnlPercent' | 'strategy') => trade[key] || '',
  });

  const totalRealized = closedTrades.reduce((sum: number, trade: any) => sum + trade.pnl, 0);
  const totalInvested = closedTrades.reduce((sum: number, trade: any) => sum + trade.totalBuy, 0);
  const totalWinRate = closedTrades.length > 0 ? (closedTrades.filter((trade: any) => trade.pnl > 0).length / closedTrades.length) * 100 : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icons.History size={24} style={{ color: 'var(--accent-blue-light)' }} />
            History Realized Trades
          </h1>
          <p className="page-subtitle">Rekap transaksi closed, profit realized per bulan, dan trade summary berdasarkan rentang waktu</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/portfolio" className="btn btn-secondary">
            <Icons.Briefcase size={16} />
            Portfolio
          </Link>
          <Link to="/trades/new" className="btn btn-primary">
            <Icons.Plus size={16} />
            Tambah Transaksi
          </Link>
        </div>
      </div>

      <MarketTabBar activeTab={activeTab} onChange={setActiveTab} accentColor="var(--accent-blue-light)" />

      {closedTrades.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Icons.History size={48} /></div>
          <div className="empty-state-title">Belum ada transaksi realized</div>
          <div className="empty-state-desc">History akan muncul setelah ada transaksi yang sudah dijual atau ditutup.</div>
        </div>
      ) : (
        <>
          <div className="grid-stats" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-card-label">Total Realized</div>
              <div className={`stat-card-value ${totalRealized >= 0 ? 'text-profit' : 'text-loss'}`}>{formatMoney(totalRealized)}</div>
              <div className="stat-card-change">{closedTrades.length} transaksi closed</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Total Modal Diputar</div>
              <div className="stat-card-value">{formatMoney(totalInvested)}</div>
              <div className="stat-card-change">Akumulasi total buy transaksi closed</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Return Realized</div>
              <div className={`stat-card-value ${totalRealized >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatPercent(totalInvested > 0 ? (totalRealized / totalInvested) * 100 : 0)}
              </div>
              <div className="stat-card-change">Berdasarkan total modal transaksi closed</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Win Rate</div>
              <div className="stat-card-value">{totalWinRate.toFixed(1)}%</div>
              <div className="stat-card-change">Trade profit vs total closed trades</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h3 className="card-title">Trade Summary</h3>
              <select
                className="form-select"
                style={{ width: 220 }}
                value={selectedRangeKey}
                onChange={(event) => setSelectedRangeKey(event.target.value as RangeKey)}
              >
                {rangeSummaries.map((range) => (
                  <option key={range.key} value={range.key}>{range.label}</option>
                ))}
              </select>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Periode</th>
                    <th>Realized</th>
                    <th>Total Modal</th>
                    <th>Return %</th>
                    <th>Win Rate</th>
                    <th>Closed Trades</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRangeSummary ? (
                    <tr>
                      <td><strong>{selectedRangeSummary.label}</strong></td>
                      <td className={`font-mono ${selectedRangeSummary.realized >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {formatMoney(selectedRangeSummary.realized)}
                      </td>
                      <td className="font-mono">{formatMoney(selectedRangeSummary.invested)}</td>
                      <td className={`font-mono ${selectedRangeSummary.realized >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {formatPercent(selectedRangeSummary.invested > 0 ? (selectedRangeSummary.realized / selectedRangeSummary.invested) * 100 : 0)}
                      </td>
                      <td>{selectedRangeSummary.winRate.toFixed(1)}%</td>
                      <td>{selectedRangeSummary.count}</td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                        Belum ada data summary.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid-2" style={{ alignItems: 'start', marginBottom: 24 }}>
            <div className="card">
              <div className="card-header"><h3 className="card-title">Realized Kumulatif: {selectedRangeSummary?.label || 'Semua Periode'}</h3></div>
              <div className="card-body" style={{ height: 320 }}>
                {cumulativeTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cumulativeTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                      <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(value) => formatCompactNumber(value)} />
                      <Tooltip content={renderHistoryTooltip} />
                      <Line
                        type="monotone"
                        dataKey="cumulativeRealized"
                        name="Realized Kumulatif"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#10b981' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state" style={{ padding: 32 }}>
                    <div className="empty-state-desc">Tidak ada data grafik untuk periode ini.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3 className="card-title">Total Equity: {selectedRangeSummary?.label || 'Semua Periode'}</h3></div>
              <div className="card-body" style={{ height: 320 }}>
                {cumulativeTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cumulativeTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                      <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(value) => formatCompactNumber(value)} />
                      <Tooltip content={renderHistoryTooltip} />
                      <Line
                        type="monotone"
                        dataKey="totalEquity"
                        name="Total Equity"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: '#3b82f6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state" style={{ padding: 32 }}>
                    <div className="empty-state-desc">Tidak ada data grafik untuk periode ini.</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header"><h3 className="card-title">Ringkasan Bulanan: {selectedRangeSummary?.label || 'Semua Periode'}</h3></div>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th><SortableTableHeader label="Bulan" sortKey="monthKey" sortConfig={monthSortConfig} onSort={requestMonthSort} /></th>
                      <th><SortableTableHeader label="Realized" sortKey="realized" sortConfig={monthSortConfig} onSort={requestMonthSort} /></th>
                      <th><SortableTableHeader label="Trades" sortKey="tradeCount" sortConfig={monthSortConfig} onSort={requestMonthSort} /></th>
                      <th><SortableTableHeader label="Return %" sortKey="returnPct" sortConfig={monthSortConfig} onSort={requestMonthSort} /></th>
                      <th><SortableTableHeader label="Win Rate" sortKey="winRate" sortConfig={monthSortConfig} onSort={requestMonthSort} /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMonthlyData.length > 0 ? sortedMonthlyData.map((item: any) => (
                      <tr key={item.monthKey}>
                        <td><strong>{item.label}</strong></td>
                        <td className={`font-mono ${item.realized >= 0 ? 'text-profit' : 'text-loss'}`}>{formatMoney(item.realized)}</td>
                        <td>{item.tradeCount}</td>
                        <td className={`font-mono ${item.returnPct >= 0 ? 'text-profit' : 'text-loss'}`}>{formatPercent(item.returnPct)}</td>
                        <td>{item.winRate.toFixed(1)}%</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                          Tidak ada ringkasan bulanan untuk periode ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Realized Trades: {selectedRangeSummary?.label || 'Semua Periode'}</h3>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th><SortableTableHeader label="Kode" sortKey="stockCode" sortConfig={tradeSortConfig} onSort={requestTradeSort} /></th>
                    <th><SortableTableHeader label="Sell Date" sortKey="dateSell" sortConfig={tradeSortConfig} onSort={requestTradeSort} /></th>
                    <th><SortableTableHeader label="Buy" sortKey="buyPrice" sortConfig={tradeSortConfig} onSort={requestTradeSort} /></th>
                    <th><SortableTableHeader label="Sell" sortKey="sellPrice" sortConfig={tradeSortConfig} onSort={requestTradeSort} /></th>
                    <th><SortableTableHeader label="Qty" sortKey="lots" sortConfig={tradeSortConfig} onSort={requestTradeSort} /></th>
                    <th><SortableTableHeader label="Realized P/L" sortKey="pnl" sortConfig={tradeSortConfig} onSort={requestTradeSort} /></th>
                    <th><SortableTableHeader label="%" sortKey="pnlPercent" sortConfig={tradeSortConfig} onSort={requestTradeSort} /></th>
                    <th><SortableTableHeader label="Strategi" sortKey="strategy" sortConfig={tradeSortConfig} onSort={requestTradeSort} /></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedClosedTrades.length > 0 ? sortedClosedTrades.slice(0, 20).map((trade: any) => (
                    <tr key={trade.id}>
                      <td><strong>{trade.stockCode}</strong></td>
                      <td>{formatDate(trade.dateSell)}</td>
                      <td className="font-mono">{formatMoney(trade.buyPrice)}</td>
                      <td className="font-mono">{formatMoney(trade.sellPrice)}</td>
                      <td>{trade.lots}</td>
                      <td className={`font-mono ${trade.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatMoney(trade.pnl)}</td>
                      <td className={`font-mono ${trade.pnlPercent >= 0 ? 'text-profit' : 'text-loss'}`}>{formatPercent(trade.pnlPercent)}</td>
                      <td>{trade.strategy ? <span className="badge badge-blue">{trade.strategy}</span> : '-'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                        Tidak ada realized trade untuk periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
