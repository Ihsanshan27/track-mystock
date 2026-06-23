import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import PerformanceTooltip from '@/modules/dashboard/components/PerformanceTooltip';
import type { PerformanceChartPoint } from '@/modules/dashboard/types/dashboard';
import type { PerformanceRangeKey } from '@/modules/dashboard/utils/dashboardDate';

type DashboardPerformanceSectionProps = {
  formatPercent: (value: number) => string;
  isLoadingIhsg: boolean;
  performanceChartData: PerformanceChartPoint[];
  performanceRangeKey: PerformanceRangeKey;
  performanceSummary: { portfolioReturn: number; ihsgReturn: number | null } | null;
  setPerformanceRangeKey: (value: PerformanceRangeKey) => void;
  showIhsgUnavailableNote: boolean;
};

const performanceRangeTabs: Array<[PerformanceRangeKey, string]> = [
  ['1w', '1W'],
  ['1m', '1M'],
  ['3m', '3M'],
  ['ytd', 'YTD'],
  ['1y', '1Y'],
  ['all', 'All'],
];

export default function DashboardPerformanceSection({
  formatPercent,
  isLoadingIhsg,
  performanceChartData,
  performanceRangeKey,
  performanceSummary,
  setPerformanceRangeKey,
  showIhsgUnavailableNote,
}: DashboardPerformanceSectionProps) {
  return (
    <div className="bento-card bento-col-8">
      <div className="dashboard-chart-header">
        <div className="bento-card-title dashboard-chart-title">
          <TrendingUp size={18} className="dashboard-chart-title-icon" />
          <span>Cumulative Portfolio Return</span>
        </div>
      </div>
      <div className="dashboard-performance-legend">
        <div className="dashboard-performance-legend-card">
          <div className="dashboard-performance-legend-label">
            <span className="dashboard-performance-dot dashboard-performance-dot-portfolio"></span>
            <span>Portfolio</span>
          </div>
          <strong className={(performanceSummary?.portfolioReturn ?? 0) >= 0 ? 'text-profit' : 'text-loss'}>
            {performanceSummary ? formatPercent(performanceSummary.portfolioReturn) : '-'}
          </strong>
        </div>
        <div className="dashboard-performance-legend-card">
          <div className="dashboard-performance-legend-label">
            <span className="dashboard-performance-dot dashboard-performance-dot-ihsg"></span>
            <span>IHSG</span>
          </div>
          <strong
            className={
              performanceSummary?.ihsgReturn == null
                ? ''
                : (performanceSummary.ihsgReturn ?? 0) >= 0
                  ? 'text-profit'
                  : 'text-loss'
            }
          >
            {performanceSummary?.ihsgReturn != null ? formatPercent(performanceSummary.ihsgReturn) : '-'}
          </strong>
        </div>
      </div>
      <div className="dashboard-performance-chart-body">
        {performanceChartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <ReferenceLine y={0} stroke="rgba(148,163,184,0.5)" strokeDasharray="4 4" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
              />
              <YAxis
                orientation="right"
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatPercent(Number(value))}
              />
              <Tooltip
                content={<PerformanceTooltip formatPercent={formatPercent} />}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.date}
              />
              <Line
                type="monotone"
                dataKey="portfolioReturn"
                stroke="#00c48c"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#00c48c' }}
              />
              <Line
                type="monotone"
                dataKey="ihsgReturn"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#8b5cf6' }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state dashboard-chart-empty-state">
            <div className="dashboard-chart-empty-text">
              {isLoadingIhsg
                ? 'Memuat data benchmark IHSG...'
                : 'Butuh data portfolio dan IHSG yang cukup untuk menampilkan grafik'}
            </div>
          </div>
        )}
      </div>
      {showIhsgUnavailableNote && (
        <div className="dashboard-performance-note">
          Grafik portfolio tetap ditampilkan, tapi data benchmark IHSG belum berhasil dimuat.
        </div>
      )}
      <div className="dashboard-performance-range-tabs">
        {performanceRangeTabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`dashboard-performance-range-btn ${performanceRangeKey === key ? 'active' : ''}`}
            onClick={() => setPerformanceRangeKey(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
