type PerformanceTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{ dataKey: string; value: number }>;
  formatPercent: (value: number) => string;
};

export default function PerformanceTooltip({
  active,
  label,
  payload,
  formatPercent,
}: PerformanceTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip-card">
      <div className="chart-tooltip-label">{label}</div>
      {payload.map((item) => (
        <div key={item.dataKey} className="chart-tooltip-row">
          <div className="chart-tooltip-series">
            <span
              className={`chart-tooltip-dot ${item.dataKey === 'portfolioReturn' ? 'chart-tooltip-dot-portfolio' : 'chart-tooltip-dot-ihsg'}`}
            />
            <span className="chart-tooltip-series-label">
              {item.dataKey === 'portfolioReturn' ? 'Portfolio' : 'IHSG'}
            </span>
          </div>
          <strong className={Number(item.value) >= 0 ? 'text-profit' : 'text-loss'}>
            {formatPercent(Number(item.value))}
          </strong>
        </div>
      ))}
    </div>
  );
}
