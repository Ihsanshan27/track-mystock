import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '@/modules/shared/context/DataContext';
import { reconcilePortfolioData } from '@/modules/trades/utils/reconciliation';
import * as Icons from 'lucide-react';

interface ReconciliationNoticeProps {
  market: 'ID' | 'US';
}

export default function ReconciliationNotice({ market }: ReconciliationNoticeProps) {
  const {
    trades,
    cashflows,
    dividends,
    settings,
    portfolios,
    activePortfolioId,
    financeAccounts,
    financeTransactions,
  } = useData();

  const [isExpanded, setIsExpanded] = useState(false);

  const activePortfolio = useMemo(() => {
    return portfolios.find((p: any) => p.id === activePortfolioId);
  }, [portfolios, activePortfolioId]);

  const initialCapital = useMemo(() => {
    if (activePortfolioId !== 'default') return 0;
    return market === 'US' ? (settings.initialCapitalUS ?? 1000) : (settings.initialCapital ?? 10000000);
  }, [activePortfolioId, market, settings]);

  const warnings = useMemo(() => {
    return reconcilePortfolioData({
      trades,
      cashflows,
      dividends,
      initialCapital,
      market,
      portfolio: activePortfolio,
      financeAccounts,
      financeTransactions,
    });
  }, [
    trades,
    cashflows,
    dividends,
    initialCapital,
    market,
    activePortfolio,
    financeAccounts,
    financeTransactions,
  ]);

  if (warnings.length === 0) return null;

  const dangerCount = warnings.filter(w => w.type === 'danger').length;
  const warningCount = warnings.filter(w => w.type === 'warning').length;

  // Choose the header style based on highest severity
  let headerClass = 'reconciliation-info';
  let HeaderIcon = Icons.Info;
  let severityLabel = 'Info';
  let badgeColor = 'var(--accent-blue-light)';

  if (dangerCount > 0) {
    headerClass = 'reconciliation-danger';
    HeaderIcon = Icons.AlertOctagon;
    severityLabel = 'Kritis';
    badgeColor = 'var(--accent-red)';
  } else if (warningCount > 0) {
    headerClass = 'reconciliation-warning';
    HeaderIcon = Icons.AlertTriangle;
    severityLabel = 'Peringatan';
    badgeColor = 'var(--accent-yellow)';
  }

  return (
    <div className={`reconciliation-container ${headerClass}`} style={{ marginBottom: 24 }}>
      <style>{`
        .reconciliation-container {
          border-radius: var(--radius-md, 8px);
          overflow: hidden;
          transition: all var(--transition-normal, 0.2s);
          border: 1px solid var(--border-color, rgba(255,255,255,0.1));
        }
        .reconciliation-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          cursor: pointer;
          user-select: none;
          background: rgba(255, 255, 255, 0.02);
        }
        .reconciliation-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 600;
        }
        .reconciliation-danger {
          border-color: rgba(239, 68, 68, 0.3);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.05);
        }
        .reconciliation-danger .reconciliation-header {
          color: var(--accent-red, #EF4444);
        }
        .reconciliation-warning {
          border-color: rgba(245, 158, 11, 0.3);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.05);
        }
        .reconciliation-warning .reconciliation-header {
          color: var(--accent-yellow, #F59E0B);
        }
        .reconciliation-info {
          border-color: rgba(59, 130, 246, 0.3);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.05);
        }
        .reconciliation-info .reconciliation-header {
          color: var(--accent-blue-light, #60A5FA);
        }
        .reconciliation-body {
          padding: 6px 18px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-top: 1px solid rgba(255,255,255,0.05);
          background: rgba(0, 0, 0, 0.15);
        }
        .reconciliation-warning-item {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: var(--radius-sm, 6px);
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.04);
          gap: 16px;
        }
        .reconciliation-warning-item.item-danger {
          border-left: 4px solid var(--accent-red, #EF4444);
        }
        .reconciliation-warning-item.item-warning {
          border-left: 4px solid var(--accent-yellow, #F59E0B);
        }
        .reconciliation-warning-item.item-info {
          border-left: 4px solid var(--accent-blue-light, #60A5FA);
        }
        .warning-meta {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .warning-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }
        .warning-text {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .warning-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary, #F3F4F6);
        }
        .warning-desc {
          font-size: 0.8rem;
          color: var(--text-secondary, #9CA3AF);
          line-height: 1.4;
        }
        .warning-action {
          flex-shrink: 0;
        }
        .reconciliation-badge {
          font-size: 0.72rem;
          padding: 2px 8px;
          border-radius: 9999px;
          background: rgba(255,255,255,0.06);
          font-weight: 500;
        }
      `}</style>
      <div className="reconciliation-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="reconciliation-header-left">
          <HeaderIcon size={20} className="warning-icon" />
          <span>Temuan Rekonsiliasi Data ({warnings.length} Isu Terdeteksi)</span>
          <span className="reconciliation-badge" style={{ color: badgeColor, border: `1px solid ${badgeColor}33` }}>
            {severityLabel}
          </span>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ padding: 4, display: 'flex', alignItems: 'center', color: 'inherit' }}
        >
          {isExpanded ? <Icons.ChevronUp size={18} /> : <Icons.ChevronDown size={18} />}
        </button>
      </div>

      {isExpanded && (
        <div className="reconciliation-body">
          {warnings.map((warning) => {
            const ItemIcon = warning.type === 'danger'
              ? Icons.AlertOctagon
              : warning.type === 'warning'
              ? Icons.AlertTriangle
              : Icons.Info;

            const iconColor = warning.type === 'danger'
              ? 'var(--accent-red)'
              : warning.type === 'warning'
              ? 'var(--accent-yellow)'
              : 'var(--accent-blue-light)';

            return (
              <div
                key={warning.id}
                className={`reconciliation-warning-item item-${warning.type}`}
              >
                <div className="warning-meta">
                  <ItemIcon size={16} className="warning-icon" style={{ color: iconColor }} />
                  <div className="warning-text">
                    <div className="warning-title">{warning.title}</div>
                    <div className="warning-desc">{warning.description}</div>
                  </div>
                </div>
                {warning.tradeId && (
                  <div className="warning-action">
                    <Link
                      to={`/trades/${warning.tradeId}`}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', height: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Icons.Eye size={12} />
                      <span>Perbaiki</span>
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
