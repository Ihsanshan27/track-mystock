import * as Icons from 'lucide-react';
import type { ClosedDashboardTrade, DashboardCalendarDay } from '@/modules/dashboard/types/dashboard';
import CustomSelect from '@/modules/shared/components/CustomSelect';

type DashboardCalendarSectionProps = {
  calendarDays: Array<DashboardCalendarDay | null>;
  calendarMonth: Date;
  calendarYearOptions: number[];
  formatDate: (value: string) => string;
  formatMoney: (value: number | null | undefined) => string;
  selectedCalendarDate: string | null;
  selectedDateSummary: {
    date: string;
    count: number;
    realized: number;
    invested: number;
    winRate: number;
  } | null;
  selectedDateTrades: ClosedDashboardTrade[];
  selectedDateTradesPreview: ClosedDashboardTrade[];
  setCalendarMonth: (value: Date) => void;
  setSelectedCalendarDate: (value: string | null | ((current: string | null) => string | null)) => void;
};

const weekdayLabels = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];

export default function DashboardCalendarSection({
  calendarDays,
  calendarMonth,
  calendarYearOptions,
  formatDate,
  formatMoney,
  selectedCalendarDate,
  selectedDateSummary,
  selectedDateTrades,
  selectedDateTradesPreview,
  setCalendarMonth,
  setSelectedCalendarDate,
}: DashboardCalendarSectionProps) {
  return (
    <div className="bento-card bento-col-4">
      <div className="dashboard-chart-header">
        <div className="bento-card-title dashboard-chart-title">
          <Icons.Calendar size={18} className="dashboard-chart-title-icon" />
          <span>
            Kalender Performa ({calendarMonth.toLocaleString('id-ID', { month: 'short', year: 'numeric' })})
          </span>
        </div>
        <div className="dashboard-calendar-controls">
          <button
            type="button"
            className="btn btn-secondary btn-sm dashboard-calendar-nav-btn"
            aria-label="Bulan sebelumnya"
            title="Bulan sebelumnya"
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
          >
            <Icons.ChevronLeft size={14} />
          </button>
          <label className="sr-only" htmlFor="dashboard-calendar-month">
            Pilih bulan kalender performa
          </label>
          <CustomSelect
            id="dashboard-calendar-month"
            className="form-select dashboard-calendar-month-input"
            aria-label="Pilih bulan kalender performa"
            title="Pilih bulan kalender performa"
            value={String(calendarMonth.getMonth() + 1)}
            onChange={(event) => setCalendarMonth(new Date(calendarMonth.getFullYear(), Number(event.target.value) - 1, 1))}
          >
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(2026, index, 1))}
              </option>
            ))}
          </CustomSelect>
          <label className="sr-only" htmlFor="dashboard-calendar-year">
            Pilih tahun kalender performa
          </label>
          <CustomSelect
            id="dashboard-calendar-year"
            className="form-select dashboard-calendar-year-input"
            aria-label="Pilih tahun kalender performa"
            title="Pilih tahun kalender performa"
            value={calendarMonth.getFullYear()}
            onChange={(event) => setCalendarMonth(new Date(Number(event.target.value), calendarMonth.getMonth(), 1))}
          >
            {calendarYearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </CustomSelect>
          <button
            type="button"
            className="btn btn-secondary btn-sm dashboard-calendar-nav-btn"
            aria-label="Bulan berikutnya"
            title="Bulan berikutnya"
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
          >
            <Icons.ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="dashboard-calendar-body">
        <div className="dashboard-calendar-weekdays">
          {weekdayLabels.map((dayLabel, dayLabelIndex) => (
            <div key={dayLabelIndex} className="dashboard-calendar-weekday">
              {dayLabel}
            </div>
          ))}
        </div>
        <div className="heatmap-grid">
          {calendarDays.map((calendarCell, calendarCellIndex) => (
            <button
              type="button"
              key={calendarCellIndex}
              className={`heatmap-cell ${calendarCell ? (calendarCell.pnl > 0 ? 'profit' : calendarCell.pnl < 0 ? 'loss' : 'neutral') : ''} ${calendarCell?.date === selectedCalendarDate ? 'selected' : ''} ${calendarCell ? 'is-clickable' : 'is-empty'}`}
              title={calendarCell ? `${calendarCell.date}: ${formatMoney(calendarCell.pnl)}` : ''}
              aria-label={
                calendarCell
                  ? `Tanggal ${formatDate(calendarCell.date)}, profit loss ${formatMoney(calendarCell.pnl)}`
                  : 'Tanggal kosong'
              }
              disabled={!calendarCell}
              onClick={() => setSelectedCalendarDate((currentDate) => currentDate === calendarCell?.date ? null : calendarCell?.date || null)}
            >
              {calendarCell?.day || ''}
            </button>
          ))}
        </div>
        <div className="dashboard-calendar-legend">
          <div className="dashboard-calendar-legend-item">
            <span className="dashboard-calendar-dot dashboard-calendar-dot-profit"></span>
            <span>Profit</span>
          </div>
          <div className="dashboard-calendar-legend-item">
            <span className="dashboard-calendar-dot dashboard-calendar-dot-loss"></span>
            <span>Loss</span>
          </div>
          <div className="dashboard-calendar-legend-item">
            <span className="dashboard-calendar-dot dashboard-calendar-dot-neutral"></span>
            <span>No Trade</span>
          </div>
        </div>
        {selectedDateSummary && (
          <div className="dashboard-calendar-detail">
            <div className="dashboard-calendar-detail-header">
              <div>
                <div className="dashboard-calendar-detail-title">Ringkasan {formatDate(selectedDateSummary.date)}</div>
                <div className="dashboard-calendar-detail-subtitle">{selectedDateSummary.count} transaksi closed</div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedCalendarDate(null)}>
                Tutup
              </button>
            </div>
            <div className="dashboard-calendar-detail-metrics">
              <div>
                Realized:{' '}
                <strong className={selectedDateSummary.realized >= 0 ? 'text-profit' : 'text-loss'}>
                  {formatMoney(selectedDateSummary.realized)}
                </strong>
              </div>
              <div>Modal: <strong>{formatMoney(selectedDateSummary.invested)}</strong></div>
              <div>Win Rate: <strong>{selectedDateSummary.winRate.toFixed(1)}%</strong></div>
            </div>
            <div className="dashboard-calendar-detail-list">
              {selectedDateTradesPreview.map((trade) => (
                <div key={trade.id} className="dashboard-calendar-detail-item">
                  <div>
                    <strong>{trade.stockCode}</strong>
                    <div className="dashboard-table-secondary-text">
                      {trade.lots} {trade.assetType === 'mutual_fund' ? 'unit' : 'lot'} • Buy {formatMoney(trade.buyPrice)} • Sell {formatMoney(trade.sellPrice)}
                    </div>
                  </div>
                  <div className={trade.pnl >= 0 ? 'text-profit font-mono' : 'text-loss font-mono'}>
                    {formatMoney(trade.pnl)}
                  </div>
                </div>
              ))}
            </div>
            {selectedDateTrades.length > selectedDateTradesPreview.length && (
              <div className="dashboard-calendar-detail-footnote">
                Menampilkan {selectedDateTradesPreview.length} dari {selectedDateTrades.length} transaksi.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
