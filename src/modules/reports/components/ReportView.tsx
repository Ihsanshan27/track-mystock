import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCompactNumber, formatDateTime, formatPercent, formatRupiah, formatUSD } from '@/modules/shared/utils/formatters';

function resolveMoneyFormatter(currency) {
  return currency === 'USD' ? formatUSD : formatRupiah;
}

function MoneyTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  const formatMoney = resolveMoneyFormatter(currency);

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 14px',
      fontSize: '0.8rem',
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{formatMoney(payload[0].value)}</div>
    </div>
  );
}

function SummaryCard({ label, value, note, tone = 'default' }) {
  const toneMap = {
    default: { bg: 'var(--bg-secondary)', color: 'var(--text-primary)' },
    positive: { bg: 'var(--accent-green-dim)', color: 'var(--accent-green)' },
    negative: { bg: 'var(--accent-red-dim)', color: 'var(--accent-red-light)' },
    info: { bg: 'var(--accent-blue-dim)', color: 'var(--accent-blue-light)' },
  };

  const toneStyle = toneMap[tone] || toneMap.default;

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: toneStyle.color }}>{value}</div>
      {note ? <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{note}</div> : null}
    </div>
  );
}

export default function ReportView({ report, title, shareMeta, actions = null, emptyMessage = 'Belum ada data report.' }) {
  if (!report) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📄</div>
        <div className="empty-state-title">Report belum tersedia</div>
        <div className="empty-state-desc">{emptyMessage}</div>
      </div>
    );
  }

  const formatMoney = resolveMoneyFormatter(report.currency);
  const summary = report.summary || {};
  const equityCurve = report.equityCurve || [];
  const monthlyPerformance = report.monthlyPerformance || [];
  const positions = report.portfolioSummary || [];

  return (
    <div>
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">📄 {title || 'Trading Report'}</h1>
          <p className="page-subtitle">
            {report.ownerName} · {report.market === 'US' ? 'Pasar Amerika' : 'Pasar Indonesia'}
          </p>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
            Snapshot dibuat {formatDateTime(report.generatedAt)}
            {shareMeta?.updatedAt ? ` · update link ${formatDateTime(shareMeta.updatedAt)}` : ''}
          </div>
        </div>
        {actions}
      </div>

      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <SummaryCard
          label="Equity"
          value={formatMoney(summary.realizedEquity || 0)}
          note={`Buying power ${formatMoney(summary.buyingPower || 0)}`}
          tone="info"
        />
        <SummaryCard
          label="Realized P/L"
          value={formatMoney(summary.totalRealizedPnL || 0)}
          note={`Profit factor ${summary.profitFactor?.toFixed?.(2) || '-'} `}
          tone={(summary.totalRealizedPnL || 0) >= 0 ? 'positive' : 'negative'}
        />
        <SummaryCard
          label="Floating P/L"
          value={formatMoney(summary.totalFloatingPnL || 0)}
          note={`${summary.openPositionsCount || 0} posisi terbuka`}
          tone={(summary.totalFloatingPnL || 0) >= 0 ? 'positive' : 'negative'}
        />
        <SummaryCard
          label="Win Rate"
          value={`${(summary.winRate || 0).toFixed(1)}%`}
          note={`${summary.totalTrades || 0} transaksi tertutup`}
        />
        <SummaryCard
          label="Total Invested"
          value={formatMoney(summary.totalInvested || 0)}
          note={`Dividen ${formatMoney(summary.totalDividend || 0)}`}
        />
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Portfolio Summary</h3></div>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Posisi</th>
                  <th>Total Beli</th>
                  <th>Current Price</th>
                  <th>Floating P/L</th>
                  <th>Alokasi</th>
                </tr>
              </thead>
              <tbody>
                {positions.length > 0 ? positions.map((position) => (
                  <tr key={position.id || position.stockCode}>
                    <td><strong>{position.stockCode}</strong></td>
                    <td>{position.lots} lot</td>
                    <td>{formatMoney(position.totalBuy)}</td>
                    <td>{position.currentPrice ? formatMoney(position.currentPrice) : '-'}</td>
                    <td className={position.floatingPnL >= 0 ? 'text-profit' : 'text-loss'}>
                      {position.currentPrice ? `${position.floatingPnL >= 0 ? '+' : ''}${formatMoney(position.floatingPnL)}` : '-'}
                    </td>
                    <td>{formatPercent(position.allocationPercent || 0, 1)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                      Tidak ada posisi terbuka pada snapshot ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Monthly Performance</h3></div>
          <div className="card-body" style={{ height: 320 }}>
            {monthlyPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                  <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(value) => formatCompactNumber(value)} />
                  <Tooltip content={<MoneyTooltip currency={report.currency} />} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {monthlyPerformance.map((entry, index) => (
                      <Cell key={entry.month || index} fill={entry.pnl >= 0 ? '#10B981' : '#F43F5E'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-state-desc">Belum ada transaksi tertutup untuk grafik bulanan.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h3 className="card-title">Equity Curve</h3></div>
        <div className="card-body" style={{ height: 320 }}>
          {equityCurve.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(value) => formatCompactNumber(value)} />
                <Tooltip content={<MoneyTooltip currency={report.currency} />} />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-state-desc">Butuh minimal 2 titik data untuk equity curve.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
