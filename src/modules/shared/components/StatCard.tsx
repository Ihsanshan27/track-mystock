import React from 'react';

export interface StatCardProps {
  icon: React.ComponentType<any> | null;
  label: string;
  value: string;
  subValue?: string;
  colorClass?: string;
  bgColor?: string;
  /** Optional CSS style applied to the value element (e.g. blur for privacy mode) */
  valueStyle?: React.CSSProperties;
}

/**
 * Bento-style stat card used across Dashboard and other summary pages.
 */
export default function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  colorClass,
  bgColor,
  valueStyle,
}: StatCardProps) {
  return (
    <div className="bento-card" style={{ justifyContent: 'center', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        {Icon && (
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            background: bgColor || 'var(--accent-blue-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color:
              colorClass === 'text-profit'
                ? 'var(--accent-green)'
                : colorClass === 'text-loss'
                ? 'var(--accent-red)'
                : 'var(--text-secondary)',
          }}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <div
        className={`font-mono ${colorClass || ''}`}
        style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, ...valueStyle }}
      >
        {value}
      </div>
      {subValue && (
        <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {subValue}
        </div>
      )}
    </div>
  );
}
