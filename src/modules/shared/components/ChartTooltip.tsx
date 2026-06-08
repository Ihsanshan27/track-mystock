/**
 * Reusable tooltip component for Recharts charts.
 *
 * Usage:
 *   <Tooltip content={<ChartTooltip formatValue={formatMoney} />} />
 */
export interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatValue?: (val: number) => string;
}

export default function ChartTooltip({ active, payload, label, formatValue }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 14px',
      fontSize: '0.8rem',
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: Number(payload[0].value) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
        {formatValue ? formatValue(Number(payload[0].value)) : payload[0].value}
      </div>
    </div>
  );
}
