import { useEffect, useMemo, useState } from 'react';
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

type RangeKey = 'today' | 'mtd' | 'ytd' | 'last7d' | 'last30d' | 'last90d' | 'custom' | 'all';
type TimelineFilter = 'all' | 'trade' | 'cashflow' | 'dividend' | 'ipo';

type TimelineItem = {
  id: string;
  type: 'TRADE_CLOSED' | 'CASH_DEPOSIT' | 'CASH_WITHDRAW' | 'DIVIDEND_RECEIVED' | 'IPO_EVENT';
  date: string;
  market: 'ID' | 'US';
  portfolioId: string;
  title: string;
  subtitle: string;
  amount: number | null;
  amountKind: 'positive' | 'negative' | 'neutral';
  meta?: string;
  sortTimestamp: number;
  linkTo?: string;
};

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

function buildRangeLabel(startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    return startDate === endDate
      ? formatDate(startDate)
      : `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }

  if (startDate) return `Dari ${formatDate(startDate)}`;
  if (endDate) return `Sampai ${formatDate(endDate)}`;
  return 'Semua Tanggal';
}

function getTimelineEventTypeWeight(type: TimelineItem['type']) {
  const weights = {
    TRADE_CLOSED: 1,
    DIVIDEND_RECEIVED: 2,
    CASH_DEPOSIT: 3,
    CASH_WITHDRAW: 4,
    IPO_EVENT: 5,
  };
  return weights[type] || 99;
}

function normalizeTimelineDate(dateString?: string | null) {
  if (!dateString) return null;
  const parsed = parseLocalDate(dateString);
  return parsed ? formatDateKey(parsed) : null;
}

function getTimelineTypeFilter(type: TimelineItem['type']): TimelineFilter {
  if (type === 'TRADE_CLOSED') return 'trade';
  if (type === 'CASH_DEPOSIT' || type === 'CASH_WITHDRAW') return 'cashflow';
  if (type === 'DIVIDEND_RECEIVED') return 'dividend';
  return 'ipo';
}

function isClosedTrade(trade: any) {
  return trade?.dateSell && trade?.sellPrice != null;
}

export default function HistoryPage() {
  const { trades, cashflows, dividends, settings, activePortfolioId, ipoEvents, ipoEntries } = useData();
  const [activeTab, setActiveTab] = useState<MarketTab>('ID');
  const [selectedRangeKey, setSelectedRangeKey] = useState<RangeKey>('mtd');
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('all');
  const [visibleTimelineCount, setVisibleTimelineCount] = useState(5);
  const formatMoney = activeTab === 'US' ? formatUSD : formatRupiah;
  const now = useMemo(() => new Date(), []);
  const defaultCustomStartDate = useMemo(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    [now],
  );
  const defaultCustomEndDate = useMemo(() => formatDateKey(now), [now]);
  const [customStartDate, setCustomStartDate] = useState(defaultCustomStartDate);
  const [customEndDate, setCustomEndDate] = useState(defaultCustomEndDate);
  const initialCapitalForMarket = activePortfolioId === 'default'
    ? (activeTab === 'US' ? (settings.initialCapitalUS ?? 1000) : (settings.initialCapital ?? 10000000))
    : 0;

  const closedTrades = useMemo(() => {
    return trades
      .filter((trade: any) => isClosedTrade(trade))
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
    const customStartObj = parseLocalDate(customStartDate);
    const customEndObj = parseLocalDate(customEndDate);
    const normalizedCustomStart = customStartObj && customEndObj && customStartObj > customEndObj
      ? customEndObj
      : customStartObj;
    const normalizedCustomEnd = customStartObj && customEndObj && customStartObj > customEndObj
      ? customStartObj
      : customEndObj;

    const rangeMap: Array<{ key: RangeKey; label: string; matches: (sellDate: Date) => boolean }> = [
      { key: 'today', label: 'Today', matches: (sellDate) => isSameDay(sellDate, now) },
      { key: 'mtd', label: 'Month To Date', matches: (sellDate) => sellDate.getFullYear() === now.getFullYear() && sellDate.getMonth() === now.getMonth() },
      { key: 'ytd', label: 'Year To Date', matches: (sellDate) => sellDate.getFullYear() === now.getFullYear() },
      { key: 'last7d', label: 'Last 7 Days', matches: (sellDate) => sellDate >= sevenDaysAgo && sellDate <= now },
      { key: 'last30d', label: 'Last 1 Month', matches: (sellDate) => sellDate >= thirtyDaysAgo && sellDate <= now },
      { key: 'last90d', label: 'Last 3 Months', matches: (sellDate) => sellDate >= ninetyDaysAgo && sellDate <= now },
      {
        key: 'custom',
        label: `Custom Range (${buildRangeLabel(customStartDate, customEndDate)})`,
        matches: (sellDate) => {
          if (normalizedCustomStart && sellDate < normalizedCustomStart) return false;
          if (normalizedCustomEnd && sellDate > normalizedCustomEnd) return false;
          return true;
        },
      },
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
  }, [closedTrades, customEndDate, customStartDate, now]);

  const selectedRangeSummary = useMemo(() => {
    return rangeSummaries.find((range) => range.key === selectedRangeKey) || rangeSummaries[0] || null;
  }, [rangeSummaries, selectedRangeKey]);

  const selectedRangeTrades = useMemo(() => {
    if (!selectedRangeSummary) return closedTrades;
    return closedTrades.filter((trade: any) => selectedRangeSummary.matches(trade.sellDateObj));
  }, [closedTrades, selectedRangeSummary]);

  const marketCashflows = useMemo(() => {
    return cashflows.filter((cashflow: any) => cashflow.market === activeTab || (!cashflow.market && activeTab === 'ID'));
  }, [activeTab, cashflows]);

  const marketDividends = useMemo(() => {
    return dividends.filter((dividend: any) => dividend.market === activeTab || (!dividend.market && activeTab === 'ID'));
  }, [activeTab, dividends]);

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
    if (selectedRangeTrades.length === 0) return [];

    const rangeStart = selectedRangeTrades[selectedRangeTrades.length - 1]?.dateSell;
    const rangeEnd = selectedRangeTrades[0]?.dateSell;
    if (!rangeStart || !rangeEnd) return [];

    const realizedByDate = new Map<string, number>();
    const cashflowByDate = new Map<string, number>();
    const dividendByDate = new Map<string, number>();

    selectedRangeTrades.forEach((trade: any) => {
      realizedByDate.set(trade.dateSell, (realizedByDate.get(trade.dateSell) || 0) + trade.pnl);
    });

    marketCashflows.forEach((cashflow: any) => {
      if (cashflow.date >= rangeStart && cashflow.date <= rangeEnd) {
        const delta = cashflow.type === 'deposit' ? cashflow.amount : -cashflow.amount;
        cashflowByDate.set(cashflow.date, (cashflowByDate.get(cashflow.date) || 0) + delta);
      }
    });

    marketDividends.forEach((dividend: any) => {
      if (dividend.dateReceived >= rangeStart && dividend.dateReceived <= rangeEnd) {
        dividendByDate.set(dividend.dateReceived, (dividendByDate.get(dividend.dateReceived) || 0) + (dividend.totalAmount || 0));
      }
    });

    const openingRealized = closedTrades
      .filter((trade: any) => trade.dateSell < rangeStart)
      .reduce((sum: number, trade: any) => sum + trade.pnl, 0);

    const openingCashflow = marketCashflows
      .filter((cashflow: any) => cashflow.date < rangeStart)
      .reduce((sum: number, cashflow: any) => sum + (cashflow.type === 'deposit' ? cashflow.amount : -cashflow.amount), 0);

    const openingDividend = marketDividends
      .filter((dividend: any) => dividend.dateReceived < rangeStart)
      .reduce((sum: number, dividend: any) => sum + (dividend.totalAmount || 0), 0);

    let runningRealized = openingRealized;
    let runningEquity = initialCapitalForMarket + openingCashflow + openingDividend + openingRealized;

    const series: Array<{
      key: string;
      label: string;
      realized: number;
      cumulativeRealized: number;
      totalEquity: number;
    }> = [];

    const cursor = parseLocalDate(rangeStart);
    const endDate = parseLocalDate(rangeEnd);
    if (!cursor || !endDate) return [];

    while (cursor.getTime() <= endDate.getTime()) {
      const key = formatDateKey(cursor);
      const realizedDelta = realizedByDate.get(key) || 0;
      const cashflowDelta = cashflowByDate.get(key) || 0;
      const dividendDelta = dividendByDate.get(key) || 0;

      runningRealized += realizedDelta;
      runningEquity += realizedDelta + cashflowDelta + dividendDelta;

      series.push({
        key,
        label: formatDayLabel(key),
        realized: realizedDelta,
        cumulativeRealized: runningRealized,
        totalEquity: runningEquity,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return series;
  }, [closedTrades, initialCapitalForMarket, marketCashflows, marketDividends, selectedRangeTrades]);

  const renderHistoryTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chart-tooltip-card">
        <div className="chart-tooltip-label">{label}</div>
        {payload.map((item: any) => (
          <div key={item.dataKey} className="chart-tooltip-row chart-tooltip-row-start">
            <span
              className={`chart-tooltip-dot ${item.dataKey === 'cumulativeRealized' ? 'chart-tooltip-dot-portfolio' : 'chart-tooltip-dot-equity'}`}
            />
            <span className="chart-tooltip-series-label">{item.name}:</span>
            <strong className="chart-tooltip-value">{formatMoney(Number(item.value))}</strong>
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
  const isCustomRangeSelected = selectedRangeKey === 'custom';

  const allTimelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    closedTrades.forEach((trade: any) => {
      items.push({
        id: `trade-${trade.id}`,
        type: 'TRADE_CLOSED',
        date: trade.dateSell,
        market: trade.market || 'ID',
        portfolioId: trade.portfolioId || 'default',
        title: `Trade closed ${trade.stockCode}`,
        subtitle: `${trade.strategy || 'Tanpa strategi'} • ${trade.lots} ${trade.market === 'US' ? 'shares' : 'lot'}`,
        amount: trade.pnl,
        amountKind: trade.pnl >= 0 ? 'positive' : 'negative',
        meta: `Close ${formatDate(trade.dateSell)}`,
        sortTimestamp: parseLocalDate(trade.dateSell)?.getTime() || 0,
        linkTo: `/trades/${trade.id}`,
      });
    });

    marketCashflows.forEach((cashflow: any) => {
      items.push({
        id: `cashflow-${cashflow.id}`,
        type: cashflow.type === 'withdraw' ? 'CASH_WITHDRAW' : 'CASH_DEPOSIT',
        date: cashflow.date,
        market: cashflow.market || 'ID',
        portfolioId: cashflow.portfolioId || 'default',
        title: cashflow.type === 'withdraw' ? 'Penarikan dana' : 'Deposit dana',
        subtitle: cashflow.notes ? `Catatan: ${cashflow.notes}` : 'Aktivitas saldo kas',
        amount: cashflow.type === 'withdraw' ? -Math.abs(cashflow.amount || 0) : Math.abs(cashflow.amount || 0),
        amountKind: cashflow.type === 'withdraw' ? 'negative' : 'positive',
        meta: formatDate(cashflow.date),
        sortTimestamp: parseLocalDate(cashflow.date)?.getTime() || 0,
      });
    });

    marketDividends.forEach((dividend: any) => {
      const dividendDate = normalizeTimelineDate(dividend.payDate || dividend.dateReceived || dividend.createdAt?.split('T')[0]);
      if (!dividendDate) return;
      items.push({
        id: `dividend-${dividend.id}`,
        type: 'DIVIDEND_RECEIVED',
        date: dividendDate,
        market: dividend.market || 'ID',
        portfolioId: dividend.portfolioId || 'default',
        title: `Dividen ${dividend.stockCode} diterima`,
        subtitle: `${Number(dividend.shareCount || 0).toLocaleString(activeTab === 'US' ? 'en-US' : 'id-ID')} lembar • ${formatMoney(dividend.dividendPerShare || 0)} per lembar`,
        amount: dividend.totalAmount || 0,
        amountKind: 'positive',
        meta: `Pay date ${formatDate(dividendDate)}`,
        sortTimestamp: parseLocalDate(dividendDate)?.getTime() || 0,
      });
    });

    if (activeTab === 'ID' && activePortfolioId === 'default') {
      ipoEvents.forEach((event: any) => {
        const timelineDate = normalizeTimelineDate(event.offeringDate || event.ipoDate);
        if (!timelineDate) return;

        const relatedEntries = ipoEntries.filter((entry: any) => entry.ipoEventId === event.id);
        const totalLots = relatedEntries.reduce((sum: number, entry: any) => sum + (Number(entry.lots) || 0), 0);
        const participationBits = [];
        if (event.offeringDate) participationBits.push(`Penawaran ${formatDate(event.offeringDate)}`);
        participationBits.push(`IPO ${formatDate(event.ipoDate)}`);
        if (relatedEntries.length > 0) participationBits.push(`${relatedEntries.length} akun ikut`);
        if (totalLots > 0) participationBits.push(`${totalLots} lot allotment`);

        items.push({
          id: `ipo-${event.id}`,
          type: 'IPO_EVENT',
          date: timelineDate,
          market: 'ID',
          portfolioId: 'default',
          title: `IPO ${event.stockCode} dibuka`,
          subtitle: participationBits.join(' • '),
          amount: event.offeringPrice || 0,
          amountKind: 'neutral',
          meta: `Harga penawaran ${formatRupiah(event.offeringPrice || 0)}`,
          sortTimestamp: parseLocalDate(timelineDate)?.getTime() || 0,
          linkTo: `/ipo/${event.id}`,
        });
      });
    }

    return items.sort((left, right) => {
      if (right.sortTimestamp !== left.sortTimestamp) return right.sortTimestamp - left.sortTimestamp;
      const weightDiff = getTimelineEventTypeWeight(left.type) - getTimelineEventTypeWeight(right.type);
      if (weightDiff !== 0) return weightDiff;
      return left.id.localeCompare(right.id);
    });
  }, [activePortfolioId, activeTab, closedTrades, formatMoney, ipoEntries, ipoEvents, marketCashflows, marketDividends]);

  const filteredTimelineItems = useMemo(() => {
    const rangeFiltered = selectedRangeSummary
      ? allTimelineItems.filter((item) => {
          const dateObj = parseLocalDate(item.date);
          return dateObj ? selectedRangeSummary.matches(dateObj) : false;
        })
      : allTimelineItems;

    if (timelineFilter === 'all') return rangeFiltered;
    return rangeFiltered.filter((item) => getTimelineTypeFilter(item.type) === timelineFilter);
  }, [allTimelineItems, selectedRangeSummary, timelineFilter]);

  const visibleTimelineItems = useMemo(
    () => filteredTimelineItems.slice(0, visibleTimelineCount),
    [filteredTimelineItems, visibleTimelineCount],
  );

  useEffect(() => {
    setVisibleTimelineCount(5);
  }, [activeTab, selectedRangeKey, customStartDate, customEndDate, timelineFilter, activePortfolioId]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title history-page-title">
            <Icons.History size={24} className="history-page-title-icon" />
            History & Portfolio Timeline
          </h1>
          <p className="page-subtitle">Lihat perjalanan portofolio Anda dari trade closed, cashflow, dividen, dan aktivitas IPO dalam satu alur waktu</p>
        </div>
        <div className="history-page-actions">
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
          <div className="grid-stats history-grid-stats">
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

          <div className="card history-card-spaced">
            <div className="card-header history-card-header">
              <h3 className="card-title">Trade Summary</h3>
              <div className="history-filter-row">
                <label className="sr-only" htmlFor="history-range-select">Pilih periode trade summary</label>
                <select
                  id="history-range-select"
                  title="Pilih periode trade summary"
                  aria-label="Pilih periode trade summary"
                  className="form-select history-range-select"
                  value={selectedRangeKey}
                  onChange={(event) => setSelectedRangeKey(event.target.value as RangeKey)}
                >
                  {rangeSummaries.map((range) => (
                    <option key={range.key} value={range.key}>{range.label}</option>
                  ))}
                </select>
                {isCustomRangeSelected && (
                  <>
                    <input
                      type="date"
                      title="Tanggal mulai custom trade summary"
                      aria-label="Tanggal mulai custom trade summary"
                      className="form-input history-date-input"
                      value={customStartDate}
                      onChange={(event) => setCustomStartDate(event.target.value)}
                    />
                    <input
                      type="date"
                      title="Tanggal akhir custom trade summary"
                      aria-label="Tanggal akhir custom trade summary"
                      className="form-input history-date-input"
                      value={customEndDate}
                      onChange={(event) => setCustomEndDate(event.target.value)}
                    />
                  </>
                )}
              </div>
            </div>
            {isCustomRangeSelected && (
              <div className="history-custom-note">
                Filter custom akan mengikuti tanggal awal dan akhir secara fleksibel. Jika tanggal awal lebih besar dari tanggal akhir, sistem otomatis membalik rentangnya.
              </div>
            )}
            <div className="table-container history-table-container">
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
                      <td colSpan={6} className="history-empty-table-cell">
                        Belum ada data summary.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card history-card-spaced">
            <div className="card-header history-card-header">
              <h3 className="card-title">Portfolio Timeline</h3>
              <div className="history-filter-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {[
                  { key: 'all', label: 'Semua' },
                  { key: 'trade', label: 'Trade' },
                  { key: 'cashflow', label: 'Cashflow' },
                  { key: 'dividend', label: 'Dividend' },
                  { key: 'ipo', label: 'IPO' },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    className={`btn btn-sm ${timelineFilter === filter.key ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setTimelineFilter(filter.key as TimelineFilter)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="card-body">
              {visibleTimelineItems.length > 0 ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {visibleTimelineItems.map((item) => {
                      const isPositive = item.amountKind === 'positive';
                      const isNegative = item.amountKind === 'negative';
                      const IconComponent =
                        item.type === 'TRADE_CLOSED' ? Icons.Receipt
                          : item.type === 'CASH_DEPOSIT' ? Icons.ArrowDownLeft
                          : item.type === 'CASH_WITHDRAW' ? Icons.ArrowUpRight
                          : item.type === 'DIVIDEND_RECEIVED' ? Icons.Coins
                          : Icons.Rocket;
                      const moneyFormatter = item.market === 'US' ? formatUSD : formatRupiah;

                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '28px 1fr',
                            gap: 14,
                            alignItems: 'stretch',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 999,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isPositive
                                  ? 'var(--accent-green-dim)'
                                  : isNegative
                                  ? 'var(--accent-red-dim)'
                                  : 'var(--accent-blue-dim)',
                                color: isPositive
                                  ? 'var(--accent-green)'
                                  : isNegative
                                  ? 'var(--accent-red)'
                                  : 'var(--accent-blue-light)',
                                flexShrink: 0,
                              }}
                            >
                              <IconComponent size={15} />
                            </div>
                            <div style={{ width: 2, flex: 1, background: 'var(--border-color)', marginTop: 8 }} />
                          </div>

                          <div
                            className="bento-card"
                            style={{
                              padding: '14px 16px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 12,
                              alignItems: 'flex-start',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                                <strong>{item.title}</strong>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  {formatDate(item.date)}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                                {item.subtitle}
                              </div>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                {item.meta ? <span>{item.meta}</span> : null}
                                <span>{item.market}</span>
                                {item.linkTo ? <Link to={item.linkTo}>Lihat detail</Link> : null}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div
                                className={`font-mono ${isPositive ? 'text-profit' : isNegative ? 'text-loss' : ''}`}
                                style={{ fontWeight: 800, fontSize: '0.98rem' }}
                              >
                                {item.amount == null
                                  ? '—'
                                  : item.type === 'IPO_EVENT'
                                  ? moneyFormatter(item.amount)
                                  : moneyFormatter(item.amount)}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                {item.type === 'TRADE_CLOSED'
                                  ? 'Realized P/L'
                                  : item.type === 'DIVIDEND_RECEIVED'
                                  ? 'Dividen diterima'
                                  : item.type === 'IPO_EVENT'
                                  ? 'Harga penawaran'
                                  : 'Perubahan kas'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {filteredTimelineItems.length > visibleTimelineItems.length && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setVisibleTimelineCount((prev) => prev + 5)}
                        >
                          Muat lebih banyak
                        </button>
                        {visibleTimelineCount > 5 && (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setVisibleTimelineCount(5)}
                          >
                            Collapse
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {filteredTimelineItems.length <= visibleTimelineItems.length && visibleTimelineCount > 5 && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setVisibleTimelineCount(5)}
                      >
                        Collapse
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state" style={{ padding: '24px 8px' }}>
                  <div className="empty-state-icon"><Icons.Clock3 size={40} /></div>
                  <div className="empty-state-title">
                    {allTimelineItems.length === 0 ? 'Belum ada aktivitas portofolio' : 'Tidak ada aktivitas pada filter ini'}
                  </div>
                  <div className="empty-state-desc">
                    {allTimelineItems.length === 0
                      ? 'Timeline akan muncul setelah ada aktivitas trade, cashflow, dividen, atau IPO.'
                      : 'Coba ubah jenis event atau rentang waktu untuk melihat aktivitas lainnya.'}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid-2 history-grid-2">
            <div className="card">
              <div className="card-header"><h3 className="card-title">Realized Kumulatif: {selectedRangeSummary?.label || 'Semua Periode'}</h3></div>
              <div className="card-body history-chart-card-body">
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
                  <div className="empty-state history-chart-empty-state">
                    <div className="empty-state-desc">Tidak ada data grafik untuk periode ini.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3 className="card-title">Total Equity: {selectedRangeSummary?.label || 'Semua Periode'}</h3></div>
              <div className="card-body history-chart-card-body">
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
                  <div className="empty-state history-chart-empty-state">
                    <div className="empty-state-desc">Tidak ada data grafik untuk periode ini.</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card history-card-spaced">
            <div className="card-header"><h3 className="card-title">Ringkasan Bulanan: {selectedRangeSummary?.label || 'Semua Periode'}</h3></div>
              <div className="table-container history-table-container">
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
                        <td colSpan={5} className="history-empty-table-cell">
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
            <div className="table-container history-table-container">
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
                      <td colSpan={8} className="history-empty-table-cell">
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


