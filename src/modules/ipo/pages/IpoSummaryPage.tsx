import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import { useTableSort } from '@/modules/shared/hooks/useTableSort';
import { formatRupiah } from '@/modules/shared/utils/formatters';
import * as Icons from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import type { IpoEvent, IpoAccount } from '@/modules/ipo/types/ipo';
import '@/modules/ipo/ipo.css';

type IpoStatusFilter = 'active' | 'completed' | 'all';
type AllotmentPreset = 0.25 | 0.5 | 0.75 | 1;

const formatLotValue = (value: number) => {
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

export default function IpoSummaryPage() {
  const { ipoEvents, ipoEntries, ipoAccounts, showToast } = useData();
  const navigate = useNavigate();
  const blurStyle = usePrivacyStyle();
  const [statusFilter, setStatusFilter] = useState<IpoStatusFilter>('active');
  const [allotmentRatio, setAllotmentRatio] = useState<AllotmentPreset>(1);

  const getEventStatus = (event: IpoEvent) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const offeringDate = event.offeringDate ? new Date(event.offeringDate) : null;
    const ipoDate = new Date(event.ipoDate);
    if (offeringDate) offeringDate.setHours(0, 0, 0, 0);
    ipoDate.setHours(0, 0, 0, 0);

    if (offeringDate && today < offeringDate) return 'upcoming';
    if (today <= ipoDate) return 'active';
    return 'completed';
  };

  // Helper to calculate summary for a specific event
  const getEventSummary = (eventId: string) => {
    const event = ipoEvents.find((item: IpoEvent) => item.id === eventId);
    const entries = ipoEntries.filter((e: any) => e.ipoEventId === eventId);
    let totalCapital = 0, totalReturn = 0, sellCount = 0, keepCount = 0;
    
    entries.forEach((e: any) => {
      const shares = e.lots * 100;
      const buyPrice = event?.offeringPrice ?? e.buyPrice;
      const buy = buyPrice * shares;
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
        status: getEventStatus(event),
        ...summary,
      };
    }).sort((a, b) => new Date(b.event.ipoDate).getTime() - new Date(a.event.ipoDate).getTime());
  }, [ipoEvents, ipoEntries]);
  const filteredEventSummaries = useMemo(() => {
    if (statusFilter === 'all') return eventSummaries;
    return eventSummaries.filter((item) => {
      if (statusFilter === 'active') {
        return item.status === 'active' || item.status === 'upcoming';
      }
      return item.status === statusFilter;
    });
  }, [eventSummaries, statusFilter]);
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
  const sortedFilteredEventSummaries = useMemo(() => {
    const idSet = new Set(filteredEventSummaries.map((item) => item.event.id));
    return sortedEventSummaries.filter((item) => idSet.has(item.event.id));
  }, [filteredEventSummaries, sortedEventSummaries]);

  const accountCapitalSummaries = useMemo(() => {
    const filteredEventIds = new Set(filteredEventSummaries.map((item) => item.event.id));
    const eventMap = new Map<string, IpoEvent>(ipoEvents.map((event: IpoEvent) => [event.id, event]));
    const accountMap = new Map<string, IpoAccount>((ipoAccounts || []).map((account: IpoAccount) => [account.id, account]));
    const groupedAccounts = new Map<string, {
      ipoAccountId: string;
      accountName: string;
      email: string;
      joinedEvents: Set<string>;
      totalLots: number;
      totalCapitalBase: number;
      simulatedLots: number;
      simulatedCapital: number;
      breakdown: string[];
    }>();

    ipoEntries.forEach((entry: any) => {
      if (!filteredEventIds.has(entry.ipoEventId)) return;
      const event = eventMap.get(entry.ipoEventId);
      if (!event) return;

      const linkedAccount = entry.ipoAccountId ? accountMap.get(entry.ipoAccountId) : null;
      const normalizedNameKey = (entry.accountName || linkedAccount?.name || '').trim().toLowerCase();
      const accountKey = entry.ipoAccountId || normalizedNameKey;
      const lots = Number(entry.lots) || 0;
      const simulatedLots = lots * allotmentRatio;
      const totalCapitalBase = (event.offeringPrice || entry.buyPrice || 0) * lots * 100;
      const simulatedCapital = (event.offeringPrice || entry.buyPrice || 0) * simulatedLots * 100;
      const breakdownLabel = `${event.stockCode} (${formatLotValue(simulatedLots)} lot simulasi)`;

      if (!groupedAccounts.has(accountKey)) {
        groupedAccounts.set(accountKey, {
          ipoAccountId: linkedAccount?.id || entry.ipoAccountId || accountKey,
          accountName: linkedAccount?.name || entry.accountName || 'Tanpa nama akun',
          email: linkedAccount?.email || entry.email || '-',
          joinedEvents: new Set(),
          totalLots: 0,
          totalCapitalBase: 0,
          simulatedLots: 0,
          simulatedCapital: 0,
          breakdown: [],
        });
      }

      const current = groupedAccounts.get(accountKey)!;
      current.joinedEvents.add(event.id);
      current.totalLots += lots;
      current.totalCapitalBase += totalCapitalBase;
      current.simulatedLots += simulatedLots;
      current.simulatedCapital += simulatedCapital;
      current.breakdown.push(breakdownLabel);
    });

    return Array.from(groupedAccounts.values())
      .map((account) => ({
        ...account,
        eventCount: account.joinedEvents.size,
        breakdown: account.breakdown.join(', '),
      }))
      .sort((a, b) => b.simulatedCapital - a.simulatedCapital || a.accountName.localeCompare(b.accountName));
  }, [allotmentRatio, filteredEventSummaries, ipoAccounts, ipoEntries, ipoEvents]);
  const {
    sortConfig: accountSortConfig,
    sortedItems: sortedAccountCapitalSummaries,
    requestSort: requestAccountSort,
  } = useTableSort(accountCapitalSummaries, {
    initialKey: 'simulatedCapital',
    initialDirection: 'desc',
    getValue: (
      item: any,
      key: 'accountName' | 'email' | 'eventCount' | 'totalLots' | 'simulatedLots' | 'breakdown' | 'simulatedCapital'
    ) => item[key] ?? '',
    tieBreaker: (a: any, b: any) => b.simulatedCapital - a.simulatedCapital || a.accountName.localeCompare(b.accountName),
  });
  const accountCapitalGrandTotal = useMemo(
    () => accountCapitalSummaries.reduce((sum, account) => sum + account.simulatedCapital, 0),
    [accountCapitalSummaries]
  );
  const highestCapitalAccountKey = useMemo(() => {
    if (accountCapitalSummaries.length === 0) return null;
    const highest = accountCapitalSummaries[0]; // accountCapitalSummaries is already sorted by simulatedCapital desc
    return highest.ipoAccountId || `${highest.accountName}-${highest.email}`;
  }, [accountCapitalSummaries]);
  const exportSummaryCsv = () => {
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const metaRows = [
      ['Filter Status', statusFilter],
      ['Simulasi Allotment', `${Math.round(allotmentRatio * 100)}%`],
      ['Diekspor Pada', new Date().toLocaleString('id-ID')],
    ];
    const accountHeaders = ['Nama Akun', 'Email', 'Total IPO', 'Total Lot Awal', 'Lot Simulasi', 'Rincian IPO', 'Modal Simulasi'];
    const accountRows = sortedAccountCapitalSummaries.map((account: any) => ([
      account.accountName,
      account.email || '-',
      account.eventCount,
      formatLotValue(account.totalLots),
      formatLotValue(account.simulatedLots),
      account.breakdown,
      account.simulatedCapital,
    ]));
    const eventHeaders = ['Kode Saham', 'Status', 'Tanggal IPO', 'Modal Aktual', 'PnL Realized', 'Rata-rata Return', 'Partisipasi Akun'];
    const eventRows = sortedFilteredEventSummaries.map((item: any) => ([
      item.event.stockCode,
      item.status,
      item.event.ipoDate,
      item.totalCapital,
      item.totalReturn,
      item.avgReturnPct.toFixed(2),
      item.accountCount,
    ]));

    const csvRows = [
      ['IPO Summary Export'],
      ...metaRows,
      [],
      ['Tabel Modal Per Akun'],
      accountHeaders,
      ...accountRows,
      [],
      ['Rincian Performa IPO'],
      eventHeaders,
      ...eventRows,
    ];

    const csv = csvRows
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ipo-summary-${statusFilter}-${Math.round(allotmentRatio * 100)}pct-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Ringkasan IPO berhasil diexport ke CSV');
  };

  // Calculate global summary metrics
  const globalMetrics = useMemo(() => {
    let totalCapital = 0;
    let totalReturn = 0;
    let totalAccounts = 0;
    let profitEventsCount = 0;
    let lossEventsCount = 0;

    filteredEventSummaries.forEach((item) => {
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
      totalEvents: filteredEventSummaries.length,
    };
  }, [filteredEventSummaries]);

  // Chart data (only for events that have accounts/entries)
  const chartData = useMemo(() => {
    return filteredEventSummaries
      .filter((item) => item.accountCount > 0)
      .map((item) => ({
        name: item.event.stockCode,
        Profit: item.totalReturn,
      }))
      // Reverse to show chronologically from left to right (oldest to newest)
      .reverse();
  }, [filteredEventSummaries]);

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
          <p className="page-subtitle">Rangkuman performa, status IPO, dan kebutuhan modal seluruh partisipasi Anda</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={exportSummaryCsv}>
            <Icons.Download size={16} />
            Export Ringkasan
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>
              Filter Status IPO
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[
                { key: 'active', label: 'Aktif & Upcoming' },
                { key: 'completed', label: 'Sudah IPO' },
                { key: 'all', label: 'Semua' },
              ].map((option) => {
                const isActive = statusFilter === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setStatusFilter(option.key as IpoStatusFilter)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>
              Simulasi Allotment
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[
                { value: 0.25, label: '25%' },
                { value: 0.5, label: '50%' },
                { value: 0.75, label: '75%' },
                { value: 1, label: '100%' },
              ].map((option) => {
                const isActive = allotmentRatio === option.value;
                return (
                  <button
                    key={option.label}
                    type="button"
                    className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setAllotmentRatio(option.value as AllotmentPreset)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Cakupan Ringkasan
            </div>
            <div style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
              Menampilkan <strong style={{ color: 'var(--text-primary)' }}>{filteredEventSummaries.length}</strong> IPO sesuai filter
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 6 }}>
              Simulasi modal memakai allotment <strong>{Math.round(allotmentRatio * 100)}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 28 }}>
        {[
          {
            label: statusFilter === 'all' ? 'Total Emiten IPO' : 'Emiten Sesuai Filter', value: String(globalMetrics.totalEvents),
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
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <h3 className="card-title">💼 Estimasi Modal Total Per Akun IPO</h3>
        </div>
        <div className="card-body" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="bento-card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 10 }}>
                Grand Total Modal Simulasi
              </div>
              <div className="font-mono" style={{ fontSize: '1.45rem', fontWeight: 800, ...blurStyle }}>
                {formatRupiah(accountCapitalGrandTotal)}
              </div>
            </div>
            <div className="bento-card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 10 }}>
                Akun Dengan Modal Terbesar
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                {accountCapitalSummaries[0]?.accountName || 'Belum ada data'}
              </div>
              <div className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-yellow)', ...(accountCapitalSummaries[0] ? blurStyle : {}) }}>
                {accountCapitalSummaries[0] ? formatRupiah(accountCapitalSummaries[0].simulatedCapital) : 'Rp 0'}
              </div>
            </div>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container" style={{ border: 'none', margin: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th><SortableTableHeader label="Nama Akun" sortKey="accountName" sortConfig={accountSortConfig} onSort={requestAccountSort} /></th>
                  <th><SortableTableHeader label="Email" sortKey="email" sortConfig={accountSortConfig} onSort={requestAccountSort} /></th>
                  <th><SortableTableHeader label="Total IPO" sortKey="eventCount" sortConfig={accountSortConfig} onSort={requestAccountSort} /></th>
                  <th><SortableTableHeader label="Lot Awal" sortKey="totalLots" sortConfig={accountSortConfig} onSort={requestAccountSort} /></th>
                  <th><SortableTableHeader label="Lot Simulasi" sortKey="simulatedLots" sortConfig={accountSortConfig} onSort={requestAccountSort} /></th>
                  <th><SortableTableHeader label="Rincian IPO" sortKey="breakdown" sortConfig={accountSortConfig} onSort={requestAccountSort} /></th>
                  <th><SortableTableHeader label="Modal Simulasi" sortKey="simulatedCapital" sortConfig={accountSortConfig} onSort={requestAccountSort} /></th>
                </tr>
              </thead>
              <tbody>
                {sortedAccountCapitalSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 16px' }}>
                      Belum ada partisipasi akun IPO yang bisa dihitung.
                    </td>
                  </tr>
                ) : (
                  sortedAccountCapitalSummaries.map((account) => (
                    <tr
                      key={`${account.accountName}-${account.email}`}
                      style={highestCapitalAccountKey === (account.ipoAccountId || `${account.accountName}-${account.email}`)
                        ? { background: 'rgba(234, 179, 8, 0.08)' }
                        : undefined}
                    >
                      <td style={{ fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span>{account.accountName}</span>
                          {highestCapitalAccountKey === (account.ipoAccountId || `${account.accountName}-${account.email}`) && (
                            <span style={{
                              background: 'var(--accent-yellow-dim)',
                              color: 'var(--accent-yellow)',
                              padding: '3px 8px',
                              borderRadius: 999,
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              letterSpacing: '0.03em',
                              textTransform: 'uppercase',
                            }}>
                              Modal Terbesar
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{account.email || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{account.eventCount} IPO</td>
                      <td style={{ fontWeight: 600 }}>{formatLotValue(account.totalLots)} lot</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-blue-light)' }}>{formatLotValue(account.simulatedLots)} lot</td>
                      <td style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: 320 }}>
                        {account.breakdown}
                      </td>
                      <td className="font-mono" style={{ fontWeight: 800, ...blurStyle }}>
                        {formatRupiah(account.simulatedCapital)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {sortedAccountCapitalSummaries.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={6} style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total Kebutuhan Modal Simulasi
                    </td>
                    <td className="font-mono" style={{ fontWeight: 900, ...blurStyle }}>
                      {formatRupiah(accountCapitalGrandTotal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

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
                {sortedFilteredEventSummaries.map((item) => {
                  const hasEntries = item.accountCount > 0;
                  const isProfit = item.totalReturn >= 0;
                  const statusTone = item.status === 'completed'
                    ? { bg: 'rgba(148, 163, 184, 0.14)', color: 'var(--text-secondary)', label: 'Sudah IPO' }
                    : item.status === 'upcoming'
                      ? { bg: 'var(--accent-blue-dim)', color: 'var(--accent-blue-light)', label: 'Upcoming' }
                      : { bg: 'var(--accent-green-dim)', color: 'var(--accent-green)', label: 'Aktif' };
                  
                  return (
                    <tr 
                      key={item.event.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/ipo/${item.event.id}`)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                          <span style={{
                            background: statusTone.bg,
                            color: statusTone.color,
                            padding: '3px 8px',
                            borderRadius: 999,
                            fontWeight: 700,
                            fontSize: '0.72rem',
                          }}>
                            {statusTone.label}
                          </span>
                        </div>
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
