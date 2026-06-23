import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { calculateTradePnL } from '@/modules/trades/calculations';
import type { DashboardRecentTradesTableProps } from '@/modules/dashboard/types/dashboard';

export default function DashboardRecentTradesTable({
  formatDate,
  formatMoney,
  formatPercent,
  recentSortConfig,
  requestRecentSort,
  sortedRecentTrades,
}: DashboardRecentTradesTableProps) {
  if (sortedRecentTrades.length === 0) return null;

  return (
    <div className="bento-card">
      <div className="dashboard-recent-header">
        <div className="bento-card-title dashboard-recent-title">
          <Icons.History size={18} className="dashboard-chart-title-icon" />
          <span>Transaksi Terakhir</span>
        </div>
        <Link to="/trades" className="btn btn-ghost btn-sm dashboard-recent-link">
          <span>Lihat Semua</span>
          <Icons.ArrowRight size={14} />
        </Link>
      </div>
      <div className="table-container dashboard-recent-table">
        <table className="table">
          <thead>
            <tr>
              <th>
                <SortableTableHeader
                  label="Kode"
                  sortKey="stockCode"
                  sortConfig={recentSortConfig}
                  onSort={requestRecentSort}
                />
              </th>
              <th>
                <SortableTableHeader
                  label="Tanggal"
                  sortKey="dateSell"
                  sortConfig={recentSortConfig}
                  onSort={requestRecentSort}
                />
              </th>
              <th>
                <SortableTableHeader
                  label="Buy"
                  sortKey="buyPrice"
                  sortConfig={recentSortConfig}
                  onSort={requestRecentSort}
                />
              </th>
              <th>
                <SortableTableHeader
                  label="Sell"
                  sortKey="sellPrice"
                  sortConfig={recentSortConfig}
                  onSort={requestRecentSort}
                />
              </th>
              <th>
                <SortableTableHeader
                  label="Qty"
                  sortKey="lots"
                  sortConfig={recentSortConfig}
                  onSort={requestRecentSort}
                />
              </th>
              <th>
                <SortableTableHeader
                  label="P/L"
                  sortKey="pnl"
                  sortConfig={recentSortConfig}
                  onSort={requestRecentSort}
                />
              </th>
              <th>
                <SortableTableHeader
                  label="%"
                  sortKey="pnlPercent"
                  sortConfig={recentSortConfig}
                  onSort={requestRecentSort}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRecentTrades.map((trade) => {
              const tradePerformance = calculateTradePnL(trade);
              return (
                <tr key={trade.id}>
                  <td>
                    <strong>{trade.stockCode}</strong>
                  </td>
                  <td className="dashboard-table-secondary-text">{formatDate(trade.dateSell)}</td>
                  <td className="font-mono">{formatMoney(trade.buyPrice)}</td>
                  <td className="font-mono">{formatMoney(trade.sellPrice)}</td>
                  <td className="font-mono">{trade.lots}</td>
                  <td
                    className={`${tradePerformance.pnl >= 0 ? 'text-profit' : 'text-loss'} font-mono`}
                  >
                    <strong>{formatMoney(tradePerformance.pnl)}</strong>
                  </td>
                  <td
                    className={`${tradePerformance.pnlPercent >= 0 ? 'text-profit' : 'text-loss'} font-mono`}
                  >
                    {formatPercent(tradePerformance.pnlPercent)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
