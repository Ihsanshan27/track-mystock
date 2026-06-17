import { useMemo } from "react";
import { useData } from "@/modules/shared/context/DataContext";
import {
   calculateStats,
   calculateStrategyStats,
   calculateDayOfWeekPnL,
   calculateEmotionStats,
   calculateTopStocks,
   calculateMonthlyPnL,
   calculateTagStats,
} from "@/modules/trades/calculations";
import { formatRupiah } from "@/modules/shared/utils/formatters";
import { EMOTIONS } from "@/modules/shared/utils/constants";
import {
   BarChart,
   Bar,
   XAxis,
   YAxis,
   Tooltip,
   ResponsiveContainer,
   CartesianGrid,
   Cell,
} from "recharts";

interface TooltipProps {
   active?: boolean;
   payload?: any[];
   label?: string | number;
}

function CurrencyTooltip({ active, payload, label }: TooltipProps) {
   if (!active || !payload?.length) return null;
   return (
      <div className="chart-tooltip-card">
         <div className="chart-tooltip-label">{label}</div>
         <div
            className={
               payload[0].value >= 0
                  ? "text-profit analytics-tooltip-value"
                  : "text-loss analytics-tooltip-value"
            }
         >
            {formatRupiah(payload[0].value)}
         </div>
      </div>
   );
}

function PercentTooltip({ active, payload, label }: TooltipProps) {
   if (!active || !payload?.length) return null;
   return (
      <div className="chart-tooltip-card">
         <div className="chart-tooltip-label">{label}</div>
         <div className="analytics-tooltip-value">{Number(payload[0].value).toFixed(1)}%</div>
      </div>
   );
}

const EMOJI_MAP: Record<string, string> = {
   calm: "ðŸ˜Œ",
   confident: "ðŸ˜Ž",
   fearful: "ðŸ˜¨",
   greedy: "ðŸ¤‘",
   revenge: "ðŸ˜¡",
   doubtful: "ðŸ¤”",
   fomo: "ðŸ˜±",
   neutral: "ðŸ˜",
};

const COLORS = [
   "#10B981",
   "#3B82F6",
   "#F59E0B",
   "#8B5CF6",
   "#F43F5E",
   "#06B6D4",
   "#EC4899",
   "#84CC16",
];

export default function AnalyticsPage() {
   const { trades, settings } = useData();

   const stats = useMemo(() => calculateStats(trades), [trades]);
   const strategyStats = useMemo(() => calculateStrategyStats(trades), [trades]);
   const dayOfWeek = useMemo(() => calculateDayOfWeekPnL(trades), [trades]);
   const emotionStats = useMemo(() => calculateEmotionStats(trades), [trades]);
   const tagStats = useMemo(() => calculateTagStats(trades), [trades]);
   const topStocks = useMemo(() => calculateTopStocks(trades), [trades]);
   const monthlyPnL = useMemo(() => calculateMonthlyPnL(trades), [trades]);

   const closedTrades = trades.filter((trade) => trade.sellPrice && trade.dateSell);

   if (closedTrades.length === 0) {
      return (
         <div className="empty-state">
            <div className="empty-state-icon">ðŸ“ˆ</div>
            <div className="empty-state-title">Belum ada data untuk dianalisis</div>
            <div className="empty-state-desc">
               Tutup beberapa transaksi untuk melihat analitik performa
            </div>
         </div>
      );
   }

   return (
      <div>
         <div className="page-header">
            <div>
               <h1 className="page-title">ðŸ“ˆ Analitik & Statistik</h1>
               <p className="page-subtitle">Analisis mendalam performa trading Anda</p>
            </div>
         </div>

         <div className="grid-stats analytics-stats-grid">
            <div className="stat-card">
               <div className="stat-card-label">Win Rate</div>
               <div
                  className={`stat-card-value ${stats.winRate >= 50 ? "text-profit" : "text-loss"}`}
               >
                  {stats.winRate.toFixed(1)}%
               </div>
               <div className="stat-card-change positive">
                  {stats.winCount}W / {stats.lossCount}L
               </div>
            </div>
            <div className="stat-card">
               <div className="stat-card-label">Profit Factor</div>
               <div
                  className={`stat-card-value ${stats.profitFactor >= 1 ? "text-profit" : "text-loss"}`}
               >
                  {stats.profitFactor === Infinity ? "âˆž" : stats.profitFactor.toFixed(2)}
               </div>
            </div>
            <div className="stat-card">
               <div className="stat-card-label">Rata-rata Win</div>
               <div className="stat-card-value text-profit">{formatRupiah(stats.avgWin)}</div>
            </div>
            <div className="stat-card">
               <div className="stat-card-label">Rata-rata Loss</div>
               <div className="stat-card-value text-loss">{formatRupiah(stats.avgLoss)}</div>
            </div>
            <div className="stat-card">
               <div className="stat-card-label">Expectancy</div>
               <div
                  className={`stat-card-value ${stats.expectancy >= 0 ? "text-profit" : "text-loss"}`}
               >
                  {formatRupiah(stats.expectancy)}
               </div>
            </div>
            <div className="stat-card">
               <div className="stat-card-label">Avg Holding</div>
               <div className="stat-card-value">{stats.avgHoldingDays.toFixed(0)} hari</div>
            </div>
         </div>

         <div className="grid-2 analytics-section-spaced">
            <div className="card">
               <div className="card-header">
                  <h3 className="card-title">ðŸŽ¯ Win Rate per Strategi</h3>
               </div>
               <div className="card-body analytics-chart-body">
                  {strategyStats.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={strategyStats} layout="vertical">
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                           <XAxis
                              type="number"
                              domain={[0, 100]}
                              tick={{ fill: "#94A3B8", fontSize: 11 }}
                              tickFormatter={(value) => `${value}%`}
                           />
                           <YAxis
                              type="category"
                              dataKey="name"
                              tick={{ fill: "#94A3B8", fontSize: 11 }}
                              width={100}
                           />
                           <Tooltip content={<PercentTooltip />} />
                           <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                              {strategyStats.map((_, index) => (
                                 <Cell key={index} fill={COLORS[index % COLORS.length]} />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  ) : (
                     <div className="analytics-empty-note">Belum ada data strategi</div>
                  )}
               </div>
            </div>

            <div className="card">
               <div className="card-header">
                  <h3 className="card-title">ðŸ“… P/L per Hari</h3>
               </div>
               <div className="card-body analytics-chart-body">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={dayOfWeek}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="day" tick={{ fill: "#94A3B8", fontSize: 11 }} />
                        <YAxis
                           tick={{ fill: "#94A3B8", fontSize: 11 }}
                           tickFormatter={(value) => `${(value / 1000).toFixed(0)}Rb`}
                        />
                        <Tooltip content={<CurrencyTooltip />} />
                        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                           {dayOfWeek.map((entry, index) => (
                              <Cell key={index} fill={entry.pnl >= 0 ? "#10B981" : "#F43F5E"} />
                           ))}
                        </Bar>
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>

         <div className="grid-2 analytics-section-spaced">
            <div className="card">
               <div className="card-header">
                  <h3 className="card-title">ðŸ§  Analisis Emosi</h3>
               </div>
               <div className="card-body">
                  {emotionStats.length > 0 ? (
                     <div>
                        {emotionStats.map((emotionStat) => {
                           const emotionsList = settings?.customEmotions || EMOTIONS;
                           const emotionOption = emotionsList.find(
                              (emotion) => emotion.value === emotionStat.emotion,
                           );

                           return (
                              <div key={emotionStat.emotion} className="analytics-list-row">
                                 <div className="analytics-list-label">
                                    <span className="analytics-emoji">
                                       {EMOJI_MAP[emotionStat.emotion] || "â“"}
                                    </span>
                                    <span className="analytics-item-label">
                                       {emotionOption?.label || emotionStat.emotion}
                                    </span>
                                 </div>
                                 <div className="analytics-list-metrics">
                                    <span className="analytics-secondary-text">
                                       {emotionStat.count} trades
                                    </span>
                                    <span
                                       className={`badge ${emotionStat.winRate >= 50 ? "badge-green" : "badge-red"}`}
                                    >
                                       {emotionStat.winRate.toFixed(0)}% win
                                    </span>
                                    <span
                                       className={`${emotionStat.totalPnL >= 0 ? "text-profit" : "text-loss"} analytics-strong-value`}
                                    >
                                       {formatRupiah(emotionStat.totalPnL)}
                                    </span>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  ) : (
                     <div className="analytics-empty-note">Belum ada data emosi</div>
                  )}
               </div>
            </div>
         </div>

         <div className="grid-2 analytics-section-spaced">
            <div className="card">
               <div className="card-header">
                  <h3 className="card-title">ðŸ·ï¸ Analisis Custom Tags</h3>
               </div>
               <div className="card-body">
                  {tagStats.length > 0 ? (
                     <div>
                        {tagStats.slice(0, 10).map((tagStat) => (
                           <div key={tagStat.tagName} className="analytics-list-row">
                              <div className="analytics-list-label">
                                 <span className="badge badge-purple">#{tagStat.tagName}</span>
                              </div>
                              <div className="analytics-list-metrics">
                                 <span className="analytics-secondary-text">
                                    {tagStat.count} trades
                                 </span>
                                 <span
                                    className={`badge ${tagStat.winRate >= 50 ? "badge-green" : "badge-red"}`}
                                 >
                                    {tagStat.winRate.toFixed(0)}% win
                                 </span>
                                 <span
                                    className={`${tagStat.totalPnL >= 0 ? "text-profit" : "text-loss"} analytics-strong-value`}
                                 >
                                    {formatRupiah(tagStat.totalPnL)}
                                 </span>
                              </div>
                           </div>
                        ))}
                     </div>
                  ) : (
                     <div className="analytics-empty-note">Belum ada data custom tags</div>
                  )}
               </div>
            </div>

            <div className="card">
               <div className="card-header">
                  <h3 className="card-title">ðŸ† Top Saham</h3>
               </div>
               <div className="card-body">
                  {topStocks.slice(0, 10).map((stock, index) => (
                     <div key={stock.code} className="analytics-list-row">
                        <div className="analytics-top-stock-label">
                           <span className="analytics-rank-badge">{index + 1}</span>
                           <strong>{stock.code}</strong>
                        </div>
                        <div className="analytics-list-metrics">
                           <span className="analytics-secondary-text">{stock.trades} trades</span>
                           <span
                              className={`badge ${stock.winRate >= 50 ? "badge-green" : "badge-red"}`}
                           >
                              {stock.winRate.toFixed(0)}%
                           </span>
                           <span
                              className={`${stock.totalPnL >= 0 ? "text-profit" : "text-loss"} analytics-strong-value analytics-stronger-value`}
                           >
                              {formatRupiah(stock.totalPnL)}
                           </span>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>

         {monthlyPnL.length > 0 && (
            <div className="card">
               <div className="card-header">
                  <h3 className="card-title">ðŸ“Š Profit/Loss Bulanan</h3>
               </div>
               <div className="card-body analytics-chart-body">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={monthlyPnL}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 11 }} />
                        <YAxis
                           tick={{ fill: "#94A3B8", fontSize: 11 }}
                           tickFormatter={(value) => `${(value / 1000000).toFixed(1)}Jt`}
                        />
                        <Tooltip content={<CurrencyTooltip />} />
                        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                           {monthlyPnL.map((entry, index) => (
                              <Cell key={index} fill={entry.pnl >= 0 ? "#10B981" : "#F43F5E"} />
                           ))}
                        </Bar>
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
         )}
      </div>
   );
}
