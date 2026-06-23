import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import type { DashboardInsightItem } from '@/modules/dashboard/types/dashboard';

type DashboardInsightsSectionProps = {
  dashboardInsights: DashboardInsightItem[];
  formatRupiah: (value: number) => string;
};

export default function DashboardInsightsSection({
  dashboardInsights,
  formatRupiah,
}: DashboardInsightsSectionProps) {
  return (
    <div className="card" style={{ marginTop: 24, marginBottom: 24 }}>
      <div
        className="card-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icons.Sparkles size={16} style={{ color: 'var(--accent-yellow)' }} />
          Insight Trading
        </h3>
        <Link to="/analytics" className="btn btn-secondary btn-sm">
          Lihat Analytics
        </Link>
      </div>
      <div className="card-body">
        {dashboardInsights.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
            }}
          >
            {dashboardInsights.slice(0, 3).map((insight) => {
              const isPositive = insight.tone === 'positive';
              const isWarning = insight.tone === 'warning';
              const value =
                insight.metricKind === 'percent'
                  ? `${Number(insight.metricValue).toFixed(1)}%`
                  : insight.metricKind === 'days'
                    ? `${Number(insight.metricValue).toFixed(1)} hari`
                    : formatRupiah(Number(insight.metricValue) || 0);

              return (
                <div
                  key={insight.id}
                  className="bento-card"
                  style={{
                    padding: '14px 16px',
                    border: isPositive
                      ? '1px solid rgba(16, 185, 129, 0.22)'
                      : isWarning
                        ? '1px solid rgba(244, 63, 94, 0.22)'
                        : '1px solid var(--border-color)',
                    background: isPositive
                      ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.08), transparent)'
                      : isWarning
                        ? 'linear-gradient(180deg, rgba(244, 63, 94, 0.08), transparent)'
                        : 'linear-gradient(180deg, rgba(59, 130, 246, 0.06), transparent)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <strong style={{ fontSize: '0.9rem' }}>{insight.title}</strong>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {insight.category}
                    </span>
                  </div>
                  <div
                    className={`font-mono ${isPositive ? 'text-profit' : isWarning ? 'text-loss' : ''}`}
                    style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 6 }}
                  >
                    {value}
                  </div>
                  <div
                    style={{
                      fontSize: '0.74rem',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: 8,
                    }}
                  >
                    {insight.metricLabel}
                  </div>
                  <div
                    style={{
                      fontSize: '0.84rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.45,
                    }}
                  >
                    {insight.summary}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Belum cukup data closed trade untuk menampilkan insight trading.
          </div>
        )}
      </div>
    </div>
  );
}
