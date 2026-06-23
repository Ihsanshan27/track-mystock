import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import ChartTooltip from '@/modules/shared/components/ChartTooltip';
import type { ProfitLossChartPoint, RangeSummaryItem } from '@/modules/dashboard/types/dashboard';
import type { PerformanceRangeKey, RangeKey } from '@/modules/dashboard/utils/dashboardDate';

type DashboardProfitLossSectionProps = {
  customEndDate: string;
  customStartDate: string;
  formatMoney: (value: number | null | undefined) => string;
  formatPercent: (value: number) => string;
  isCustomRangeSelected: boolean;
  isUS: boolean;
  profitLossChartData: ProfitLossChartPoint[];
  profitLossRangeKey: PerformanceRangeKey;
  profitLossSummary: {
    realized: number;
    invested: number;
    count: number;
    winRate: number;
  };
  rangeSummaries: Array<RangeSummaryItem<RangeKey>>;
  selectedRangeKey: RangeKey;
  setCustomEndDate: (value: string) => void;
  setCustomStartDate: (value: string) => void;
  setProfitLossRangeKey: (value: PerformanceRangeKey) => void;
  setSelectedRangeKey: (value: RangeKey) => void;
};

const profitLossRangeTabs: Array<[PerformanceRangeKey, string]> = [
  ['1w', '1W'],
  ['1m', '1M'],
  ['3m', '3M'],
  ['ytd', 'YTD'],
  ['1y', '1Y'],
  ['all', 'All'],
];

export default function DashboardProfitLossSection({
  customEndDate,
  customStartDate,
  formatMoney,
  formatPercent,
  isCustomRangeSelected,
  isUS,
  profitLossChartData,
  profitLossRangeKey,
  profitLossSummary,
  rangeSummaries,
  selectedRangeKey,
  setCustomEndDate,
  setCustomStartDate,
  setProfitLossRangeKey,
  setSelectedRangeKey,
}: DashboardProfitLossSectionProps) {
  return (
    <div className="bento-card bento-col-8 dashboard-monthly-card">
      <div className="dashboard-chart-header">
        <div className="bento-card-title dashboard-chart-title">
          <BarChart3 size={18} className="dashboard-chart-title-icon" />
          <span>Profit/Loss</span>
        </div>
        <div className="dashboard-profit-filter-group">
          <select
            className="form-select"
            aria-label="Pilih periode profit loss"
            title="Pilih periode profit loss"
            value={selectedRangeKey}
            onChange={(event) => setSelectedRangeKey(event.target.value as RangeKey)}
          >
            {rangeSummaries.map((range) => (
              <option key={range.key} value={range.key}>
                {range.label}
              </option>
            ))}
          </select>
          {isCustomRangeSelected && (
            <>
              <input
                type="date"
                className="form-input"
                aria-label="Tanggal mulai custom profit loss"
                title="Tanggal mulai custom profit loss"
                value={customStartDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
              />
              <input
                type="date"
                className="form-input"
                aria-label="Tanggal akhir custom profit loss"
                title="Tanggal akhir custom profit loss"
                value={customEndDate}
                onChange={(event) => setCustomEndDate(event.target.value)}
              />
            </>
          )}
        </div>
      </div>
      <div className="dashboard-profit-summary">
        <div>
          Realized:{' '}
          <strong className={profitLossSummary.realized >= 0 ? 'text-profit' : 'text-loss'}>
            {formatMoney(profitLossSummary.realized)}
          </strong>
        </div>
        <div>Closed Trades: <strong>{profitLossSummary.count}</strong></div>
        <div>
          Return:{' '}
          <strong className={profitLossSummary.realized >= 0 ? 'text-profit' : 'text-loss'}>
            {formatPercent(
              profitLossSummary.invested > 0
                ? (profitLossSummary.realized / profitLossSummary.invested) * 100
                : 0,
            )}
          </strong>
        </div>
        <div>Win Rate: <strong>{profitLossSummary.winRate.toFixed(1)}%</strong></div>
      </div>
      <div className="dashboard-monthly-chart-body">
        {profitLossChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={profitLossChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} minTickGap={24} />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickFormatter={(amount) => (isUS ? formatMoney(amount) : `${(Number(amount) / 1000000).toFixed(1)}Jt`)}
              />
              <Tooltip content={<ChartTooltip formatValue={formatMoney} />} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {profitLossChartData.map((entry, entryIndex) => (
                  <Cell key={entryIndex} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state dashboard-chart-empty-state">
            <div className="dashboard-chart-empty-text">Tidak ada data profit/loss untuk periode ini.</div>
          </div>
        )}
      </div>
      <div className="dashboard-performance-range-tabs dashboard-profit-range-tabs">
        {profitLossRangeTabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`dashboard-performance-range-btn ${profitLossRangeKey === key ? 'active' : ''}`}
            onClick={() => setProfitLossRangeKey(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
