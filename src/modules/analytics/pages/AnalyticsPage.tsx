import { useMemo } from "react";
import { useData } from "@/modules/shared/context/DataContext";
import {
   calculateAnalyticsInsights,
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
   ReferenceLine,
   XAxis,
   YAxis,
   Tooltip,
   ResponsiveContainer,
   CartesianGrid,
   Cell,
} from "recharts";
import * as Icons from "lucide-react";

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

function formatCompactCurrency(value: number) {
   const absoluteValue = Math.abs(value);
   if (absoluteValue >= 1000000) return `${value < 0 ? "-" : ""}${(absoluteValue / 1000000).toFixed(1)}Jt`;
   if (absoluteValue >= 1000) return `${value < 0 ? "-" : ""}${(absoluteValue / 1000).toFixed(0)}Rb`;
   return `${value < 0 ? "-" : ""}${absoluteValue.toFixed(0)}`;
}

function DayPnLTooltip({ active, payload, label }: TooltipProps) {
   if (!active || !payload?.length) return null;
   const point = payload[0]?.payload;
   const pnlValue = Number(point?.pnl || 0);
   return (
      <div className="chart-tooltip-card">
         <div className="chart-tooltip-label">{label}</div>
         <div className={pnlValue >= 0 ? "text-profit analytics-tooltip-value" : "text-loss analytics-tooltip-value"}>
            Net P/L: {formatRupiah(pnlValue)}
         </div>
         <div className="analytics-secondary-text" style={{ marginTop: 4 }}>
            {point?.count || 0} trade ditutup
         </div>
      </div>
   );
}

function DayPnLBarShape(props: any) {
   const { x, y, width, height, value } = props;
   if (typeof value !== "number" || value === 0) return null;

   const minVisualHeight = 6;
   const rawHeight = Math.abs(Number(height) || 0);
   const visualHeight = Math.max(rawHeight, minVisualHeight);
   const isProfit = value > 0;
   const fill = isProfit ? "#10B981" : "#F43F5E";
   const stroke = isProfit ? "rgba(16, 185, 129, 0.95)" : "rgba(244, 63, 94, 0.95)";
   const rectY = isProfit ? y + rawHeight - visualHeight : y;

   return (
      <rect
         x={x}
         y={rectY}
         width={width}
         height={visualHeight}
         rx={4}
         ry={4}
         fill={fill}
         stroke={stroke}
         strokeWidth={1}
      />
   );
}

const EMOJI_MAP: Record<string, string> = {
   calm: "🙂",
   confident: "😎",
   fearful: "😨",
   greedy: "🤑",
   revenge: "😡",
   doubtful: "🤔",
   fomo: "😱",
   neutral: "😐",
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

function formatInsightMetric(insight: any) {
   if (insight.metricKind === "percent") {
      return `${Number(insight.metricValue).toFixed(1)}%`;
   }
   if (insight.metricKind === "days") {
      return `${Number(insight.metricValue).toFixed(1)} hari`;
   }
   return formatRupiah(Number(insight.metricValue) || 0);
}

function getInsightToneStyles(tone: string) {
   if (tone === "positive") {
      return {
         border: "1px solid rgba(16, 185, 129, 0.22)",
         background: "linear-gradient(180deg, rgba(16, 185, 129, 0.08), transparent)",
         badgeBackground: "var(--accent-green-dim)",
         badgeColor: "var(--accent-green)",
         valueClass: "text-profit",
      };
   }
   if (tone === "warning") {
      return {
         border: "1px solid rgba(244, 63, 94, 0.22)",
         background: "linear-gradient(180deg, rgba(244, 63, 94, 0.08), transparent)",
         badgeBackground: "var(--accent-red-dim)",
         badgeColor: "var(--accent-red)",
         valueClass: "text-loss",
      };
   }
   return {
      border: "1px solid var(--border-color)",
      background: "linear-gradient(180deg, rgba(59, 130, 246, 0.06), transparent)",
      badgeBackground: "var(--accent-blue-dim)",
      badgeColor: "var(--accent-blue-light)",
      valueClass: "",
   };
}

export default function AnalyticsPage() {
   const { trades, settings } = useData();

   const stats = useMemo(() => calculateStats(trades), [trades]);
   const strategyStats = useMemo(() => calculateStrategyStats(trades), [trades]);
   const dayOfWeek = useMemo(() => calculateDayOfWeekPnL(trades), [trades]);
   const emotionStats = useMemo(() => calculateEmotionStats(trades), [trades]);
   const tagStats = useMemo(() => calculateTagStats(trades), [trades]);
   const topStocks = useMemo(() => calculateTopStocks(trades), [trades]);
   const monthlyPnL = useMemo(() => calculateMonthlyPnL(trades), [trades]);
   const analyticsInsights = useMemo(() => calculateAnalyticsInsights(trades), [trades]);
   const lossDays = useMemo(() => dayOfWeek.filter((entry) => entry.pnl < 0), [dayOfWeek]);
   const maxAbsDayPnL = useMemo(
      () => dayOfWeek.reduce((maxValue, entry) => Math.max(maxValue, Math.abs(Number(entry.pnl) || 0)), 0),
      [dayOfWeek],
   );
   const symmetricDayPnLDomain = useMemo(() => {
      const paddedMax = maxAbsDayPnL > 0 ? Math.ceil(maxAbsDayPnL * 1.15) : 1000;
      return [-paddedMax, paddedMax];
   }, [maxAbsDayPnL]);
   const worstLossDay = useMemo(
      () => [...lossDays].sort((left, right) => left.pnl - right.pnl)[0] || null,
      [lossDays],
   );

   const closedTrades = trades.filter((trade) => trade.dateSell && trade.sellPrice != null);
   const highlightInsights = analyticsInsights.items.slice(0, 6);
   const missingInsightGroups = [
      {
         key: "strategy",
         label: "Strategi",
         state: analyticsInsights.categoryStates.strategy,
      },
      {
         key: "emotion",
         label: "Emosi",
         state: analyticsInsights.categoryStates.emotion,
      },
      {
         key: "tag",
         label: "Tag",
         state: analyticsInsights.categoryStates.tag,
      },
   ].filter((item) => !item.state.hasEnoughData);

   if (closedTrades.length === 0) {
      return (
         <div className="empty-state">
            <div className="empty-state-icon">
               <Icons.BarChart3 size={48} />
            </div>
            <div className="empty-state-title">Belum ada data untuk dianalisis</div>
            <div className="empty-state-desc">
               Tutup beberapa transaksi untuk melihat analitik performa.
            </div>
         </div>
      );
   }

   return (
      <div>
         <div className="page-header">
            <div>
               <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Icons.BarChart3 size={26} style={{ color: "var(--accent-green)" }} />
                  Analitik & Statistik
               </h1>
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
                  {stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}
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

         <div className="card analytics-section-spaced">
            <div className="card-header">
               <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icons.Sparkles size={16} style={{ color: "var(--accent-yellow)" }} />
                  Insight Otomatis
               </h3>
            </div>
            <div className="card-body">
               {highlightInsights.length > 0 ? (
                  <>
                     <div
                        style={{
                           display: "grid",
                           gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                           gap: 16,
                        }}
                     >
                        {highlightInsights.map((insight) => {
                           const toneStyles = getInsightToneStyles(insight.tone);
                           return (
                              <div
                                 key={insight.id}
                                 className="bento-card"
                                 style={{
                                    border: toneStyles.border,
                                    background: toneStyles.background,
                                    padding: "16px 18px",
                                 }}
                              >
                                 <div
                                    style={{
                                       display: "flex",
                                       justifyContent: "space-between",
                                       alignItems: "center",
                                       gap: 10,
                                       marginBottom: 10,
                                    }}
                                 >
                                    <strong style={{ fontSize: "0.92rem" }}>{insight.title}</strong>
                                    <span
                                       style={{
                                          background: toneStyles.badgeBackground,
                                          color: toneStyles.badgeColor,
                                          borderRadius: 999,
                                          padding: "3px 8px",
                                          fontSize: "0.68rem",
                                          fontWeight: 700,
                                       }}
                                    >
                                       {insight.category}
                                    </span>
                                 </div>
                                 <div
                                    className={`font-mono ${toneStyles.valueClass}`}
                                    style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 6 }}
                                 >
                                    {formatInsightMetric(insight)}
                                 </div>
                                 <div
                                    style={{
                                       fontSize: "0.74rem",
                                       color: "var(--text-muted)",
                                       textTransform: "uppercase",
                                       letterSpacing: "0.05em",
                                       marginBottom: 8,
                                    }}
                                 >
                                    {insight.metricLabel}
                                 </div>
                                 <div
                                    style={{
                                       fontSize: "0.85rem",
                                       color: "var(--text-secondary)",
                                       lineHeight: 1.5,
                                       marginBottom: 10,
                                    }}
                                 >
                                    {insight.summary}
                                 </div>
                                 <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                    {insight.supportingValue}
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                     {missingInsightGroups.length > 0 && (
                        <div
                           style={{
                              marginTop: 16,
                              padding: "12px 14px",
                              borderRadius: "var(--radius-md)",
                              background: "var(--bg-input)",
                              border: "1px solid var(--border-color)",
                              fontSize: "0.84rem",
                              color: "var(--text-secondary)",
                           }}
                        >
                           Belum cukup data untuk insight:
                           {" "}
                           {missingInsightGroups.map((item) => item.label).join(", ")}.
                           {" "}Minimal {analyticsInsights.categoryStates.strategy.minSample} trade per kategori.
                        </div>
                     )}
                  </>
               ) : (
                  <div className="analytics-empty-note">
                     Belum cukup data untuk menghasilkan insight otomatis.
                  </div>
               )}
            </div>
         </div>

         <div className="grid-2 analytics-section-spaced">
            <div className="card">
               <div className="card-header">
                  <h3 className="card-title">Win Rate per Strategi</h3>
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
                  <h3 className="card-title">P/L per Hari</h3>
               </div>
               <div className="card-body analytics-chart-body">
                  <div
                     style={{
                        marginBottom: 12,
                        fontSize: "0.82rem",
                        color: "var(--text-secondary)",
                     }}
                  >
                     {lossDays.length > 0
                        ? `Profit tampil ke atas dan loss ke bawah garis nol. Hari loss terdalam saat ini: ${worstLossDay?.day} (${formatRupiah(worstLossDay?.pnl || 0)}).`
                        : "Semua hari yang tercatat masih positif atau impas. Jika nanti ada loss, batang merah akan turun ke bawah garis nol."}
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={dayOfWeek}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="day" tick={{ fill: "#94A3B8", fontSize: 11 }} />
                        <YAxis
                           domain={symmetricDayPnLDomain}
                           tick={{ fill: "#94A3B8", fontSize: 11 }}
                           tickFormatter={(value) => formatCompactCurrency(Number(value))}
                        />
                        <ReferenceLine y={0} stroke="rgba(148,163,184,0.65)" strokeDasharray="4 4" />
                        <Tooltip content={<DayPnLTooltip />} />
                        <Bar dataKey="pnl" name="Net P/L" shape={<DayPnLBarShape />}>
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
                  <h3 className="card-title">Analisis Emosi</h3>
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
                                       {EMOJI_MAP[emotionStat.emotion] || "❓"}
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
                  <h3 className="card-title">Analisis Custom Tags</h3>
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
                  <h3 className="card-title">Top Saham</h3>
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
                  <h3 className="card-title">Profit/Loss Bulanan</h3>
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
