import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ChartTooltip from '@/modules/shared/components/ChartTooltip';
import type { CSSProperties } from 'react';
import type { IhsgCandle, IhsgMetrics, IhsgQuote } from '@/modules/dashboard/types/dashboard';

type DashboardIhsgOverviewCardProps = {
  blurStyle: CSSProperties;
  formatNumber: (value: number | null | undefined) => string;
  formatPercent: (value: number) => string;
  ihsgLatestCandle: IhsgCandle | null;
  ihsgMetrics: IhsgMetrics | null;
  ihsgOverviewData: IhsgCandle[];
  ihsgPreviousClose: number | null;
  ihsgQuote: IhsgQuote | null;
  isLoadingIhsg: boolean;
  parseLocalDate: (value: string) => Date | null;
};

export default function DashboardIhsgOverviewCard({
  blurStyle,
  formatNumber,
  formatPercent,
  ihsgLatestCandle,
  ihsgMetrics,
  ihsgOverviewData,
  ihsgPreviousClose,
  ihsgQuote,
  isLoadingIhsg,
  parseLocalDate,
}: DashboardIhsgOverviewCardProps) {
  return (
    <div className="bento-card bento-col-4 dashboard-ihsg-card">
      <div className="dashboard-ihsg-header">
        <div className="dashboard-ihsg-heading">
          <span className="dashboard-ihsg-symbol">IHSG</span>
          <strong style={blurStyle}>{ihsgQuote?.price ? formatNumber(ihsgQuote.price) : '-'}</strong>
          <span className={(ihsgQuote?.changePct ?? ihsgMetrics?.changePct ?? 0) >= 0 ? 'text-profit' : 'text-loss'}>
            {ihsgMetrics
              ? `${ihsgMetrics.change >= 0 ? '+' : ''}${formatNumber(ihsgMetrics.change)} (${formatPercent(ihsgQuote?.changePct ?? ihsgMetrics.changePct ?? 0)})`
              : '-'}
          </span>
        </div>
        <div className="dashboard-ihsg-subtitle">Benchmark overview</div>
      </div>
      <div className="dashboard-ihsg-chart">
        {ihsgOverviewData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ihsgOverviewData}>
              <defs>
                <linearGradient id="ihsgAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
              <ReferenceLine
                y={Number(ihsgPreviousClose) || Number(ihsgLatestCandle?.close) || 0}
                stroke="rgba(148,163,184,0.35)"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="date"
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickFormatter={(value) =>
                  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(parseLocalDate(value)!)
                }
                axisLine={false}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                orientation="right"
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickFormatter={(value) => formatNumber(Number(value))}
                axisLine={false}
                tickLine={false}
                domain={['dataMin - 20', 'dataMax + 20']}
              />
              <Tooltip content={<ChartTooltip formatValue={(value) => formatNumber(Number(value))} />} />
              <Area
                type="monotone"
                dataKey="close"
                stroke="#ef4444"
                fill="url(#ihsgAreaFill)"
                strokeWidth={1.8}
                dot={false}
                activeDot={{ r: 4, fill: '#ef4444' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state dashboard-chart-empty-state">
            <div className="dashboard-chart-empty-text">
              {isLoadingIhsg ? 'Memuat data IHSG...' : 'Data IHSG belum tersedia.'}
            </div>
          </div>
        )}
      </div>
      <div className="dashboard-ihsg-stats-row">
        <div className="dashboard-ihsg-stat">
          <span>Open</span>
          <strong className="text-profit" style={blurStyle}>
            {ihsgLatestCandle?.open ? formatNumber(ihsgLatestCandle.open) : '-'}
          </strong>
        </div>
        <div className="dashboard-ihsg-stat">
          <span>High</span>
          <strong className="text-profit" style={blurStyle}>
            {ihsgLatestCandle?.high ? formatNumber(ihsgLatestCandle.high) : '-'}
          </strong>
        </div>
        <div className="dashboard-ihsg-stat">
          <span>Low</span>
          <strong className="text-loss" style={blurStyle}>
            {ihsgLatestCandle?.low ? formatNumber(ihsgLatestCandle.low) : '-'}
          </strong>
        </div>
        <div className="dashboard-ihsg-stat">
          <span>Close</span>
          <strong style={blurStyle}>{ihsgLatestCandle?.close ? formatNumber(ihsgLatestCandle.close) : '-'}</strong>
        </div>
        <div className="dashboard-ihsg-stat">
          <span>30D High</span>
          <strong style={blurStyle}>{ihsgMetrics ? formatNumber(ihsgMetrics.high) : '-'}</strong>
        </div>
        <div className="dashboard-ihsg-stat">
          <span>30D Low</span>
          <strong style={blurStyle}>{ihsgMetrics ? formatNumber(ihsgMetrics.low) : '-'}</strong>
        </div>
      </div>
    </div>
  );
}
