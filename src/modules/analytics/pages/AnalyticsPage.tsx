import { useEffect, useMemo, useState } from "react";
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
   calculateEquityCurve,
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
   AreaChart,
   Area,
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

function EquityTooltip({ active, payload, label }: TooltipProps) {
   if (!active || !payload?.length) return null;
   return (
      <div className="chart-tooltip-card">
         <div className="chart-tooltip-label">Tanggal: {label}</div>
         <div className="text-profit analytics-tooltip-value" style={{ fontWeight: 800 }}>
            Ekuitas: {formatRupiah(payload[0].value)}
         </div>
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

function DrawdownTooltip({ active, payload, label }: TooltipProps) {
   if (!active || !payload?.length) return null;
   const point = payload[0]?.payload;
   const ddPct = Number(point?.drawdownPercent || 0);
   const ddVal = Number(point?.drawdown || 0);
   return (
      <div className="chart-tooltip-card">
         <div className="chart-tooltip-label">Tanggal: {label}</div>
         <div className="text-loss analytics-tooltip-value" style={{ fontWeight: 800 }}>
            Drawdown: {ddPct.toFixed(2)}%
         </div>
         <div className="analytics-secondary-text" style={{ marginTop: 4 }}>
            Kerugian dari Peak: {formatRupiah(ddVal)}
         </div>
         <div className="analytics-secondary-text">
            Nilai Peak: {formatRupiah(point?.peak || 0)}
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
   const [isCompactViewport, setIsCompactViewport] = useState(() =>
      typeof window !== "undefined" ? window.innerWidth < 640 : false,
   );
   const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'categories'>('overview');

   const usdToIdrRate = settings.usdToIdrRate ?? 16200;

   // Convert USD trades to IDR for consistent analytics calculations
   const idrTrades = useMemo(() => {
      return trades.map((trade) => {
         if (trade.market === "US") {
            return {
               ...trade,
               buyPrice: trade.buyPrice * usdToIdrRate,
               sellPrice: trade.sellPrice ? trade.sellPrice * usdToIdrRate : null,
            };
         }
         return trade;
      });
   }, [trades, usdToIdrRate]);

   useEffect(() => {
      if (typeof window === "undefined") return undefined;

      const handleResize = () => {
         setIsCompactViewport(window.innerWidth < 640);
      };

      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
   }, []);

   const stats = useMemo(() => calculateStats(idrTrades), [idrTrades]);
   const strategyStats = useMemo(() => calculateStrategyStats(idrTrades), [idrTrades]);
   const dayOfWeek = useMemo(() => calculateDayOfWeekPnL(idrTrades), [idrTrades]);
   const emotionStats = useMemo(() => calculateEmotionStats(idrTrades), [idrTrades]);
   const tagStats = useMemo(() => calculateTagStats(idrTrades), [idrTrades]);
   const topStocks = useMemo(() => calculateTopStocks(idrTrades), [idrTrades]);
   const monthlyPnL = useMemo(() => calculateMonthlyPnL(idrTrades), [idrTrades]);
   const analyticsInsights = useMemo(() => calculateAnalyticsInsights(idrTrades), [idrTrades]);
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
   const strategyAxisWidth = isCompactViewport ? 72 : 100;
   const chartTickFontSize = isCompactViewport ? 10 : 11;
   const chartHorizontalMargin = isCompactViewport ? 4 : 8;
   const chartVerticalMargin = isCompactViewport ? 0 : 8;

   const closedTrades = idrTrades.filter((trade) => trade.dateSell && trade.sellPrice != null);
   const initialCapital = settings.initialCapital ?? 10000000;
   const equityCurve = useMemo(() => calculateEquityCurve(idrTrades, initialCapital), [idrTrades, initialCapital]);

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
      <div className="analytics-page">
         <div className="page-header">
            <div>
               <h1 className="page-title analytics-page-title">
                  <Icons.BarChart3 size={26} style={{ color: "var(--accent-green)" }} />
                  Analitik &amp; Statistik
               </h1>
               <p className="page-subtitle">Analisis mendalam performa trading Anda</p>
            </div>
         </div>

         {/* Navigation Tab Bar */}
         <div style={{
            display: 'flex',
            gap: 8,
            marginBottom: 24,
            padding: 4,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 12,
            width: 'fit-content'
         }}>
            <button
               type="button"
               onClick={() => setActiveTab('overview')}
               style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: activeTab === 'overview' ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === 'overview' ? 'var(--accent-green)' : 'var(--text-secondary)',
                  boxShadow: activeTab === 'overview' ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                  transition: 'all 0.2s ease'
               }}
            >
               <Icons.TrendingUp size={16} />
               Ikhtisar Performa
            </button>
            <button
               type="button"
               onClick={() => setActiveTab('charts')}
               style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: activeTab === 'charts' ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === 'charts' ? 'var(--accent-green)' : 'var(--text-secondary)',
                  boxShadow: activeTab === 'charts' ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                  transition: 'all 0.2s ease'
               }}
            >
               <Icons.Activity size={16} />
               Kurva &amp; Grafik Ekuitas
            </button>
            <button
               type="button"
               onClick={() => setActiveTab('categories')}
               style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: activeTab === 'categories' ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === 'categories' ? 'var(--accent-green)' : 'var(--text-secondary)',
                  boxShadow: activeTab === 'categories' ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                  transition: 'all 0.2s ease'
               }}
            >
               <Icons.Compass size={16} />
               Analisis Kategori
            </button>
         </div>

         {/* TAB 1: Ikhtisar Performa */}
         {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
               {/* Metrik Utama */}
               <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-primary)' }}>
                     <Icons.Star size={16} style={{ color: 'var(--accent-green)' }} />
                     Metrik Utama Performa
                  </h3>
                  <div className="grid-stats analytics-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                     <div className="stat-card">
                        <div className="stat-card-label">Win Rate</div>
                        <div className={`stat-card-value ${stats.winRate >= 50 ? "text-profit" : "text-loss"}`}>
                           {stats.winRate.toFixed(1)}%
                        </div>
                        <div className="stat-card-change positive">
                           {stats.winCount}W / {stats.lossCount}L
                        </div>
                     </div>
                     <div className="stat-card">
                        <div className="stat-card-label">Profit Factor</div>
                        <div className={`stat-card-value ${stats.profitFactor >= 1 ? "text-profit" : "text-loss"}`}>
                           {stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}
                        </div>
                        <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                           Rasio Gross Profit/Loss
                        </div>
                     </div>
                     <div className="stat-card">
                        <div className="stat-card-label">Expectancy</div>
                        <div className={`stat-card-value ${stats.expectancy >= 0 ? "text-profit" : "text-loss"}`}>
                           {formatRupiah(stats.expectancy)}
                        </div>
                        <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                           Estimasi nilai per trade
                        </div>
                     </div>
                     <div className="stat-card">
                        <div className="stat-card-label">Rata-rata Profit Bersih</div>
                        <div className={`stat-card-value ${stats.totalPnL >= 0 ? "text-profit" : "text-loss"}`}>
                           {formatRupiah(stats.totalPnL / stats.totalTrades)}
                        </div>
                        <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                           Net profit per trade
                        </div>
                     </div>
                  </div>
               </div>

               {/* Manajemen Risiko */}
               <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-primary)' }}>
                     <Icons.ShieldCheck size={16} style={{ color: 'var(--accent-green)' }} />
                     Manajemen Risiko &amp; Ketahanan
                  </h3>
                  <div className="grid-stats analytics-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                     <div className="stat-card">
                        <div className="stat-card-label">Sharpe Ratio</div>
                        <div className={`stat-card-value ${stats.sharpeRatio >= 1.5 ? "text-profit" : stats.sharpeRatio >= 1.0 ? "text-profit" : ""}`}>
                           {stats.sharpeRatio.toFixed(2)}
                        </div>
                        <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                           {stats.sharpeRatio >= 2 ? "Excellent" : stats.sharpeRatio >= 1.5 ? "Very Good" : stats.sharpeRatio >= 1 ? "Good" : "Underperforming"}
                        </div>
                     </div>
                     <div className="stat-card">
                        <div className="stat-card-label">Recovery Factor</div>
                        <div className={`stat-card-value ${stats.recoveryFactor >= 2 ? "text-profit" : stats.recoveryFactor >= 1 ? "" : "text-loss"}`}>
                           {stats.recoveryFactor === Infinity ? "∞" : stats.recoveryFactor.toFixed(2)}
                        </div>
                        <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                           Realized P&amp;L / Max DD
                        </div>
                     </div>
                     <div className="stat-card">
                        <div className="stat-card-label">Max Drawdown (%)</div>
                        <div className="stat-card-value text-loss">
                           {stats.maxDrawdownPercent.toFixed(1)}%
                        </div>
                        <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                           Penurunan modal terdalam
                        </div>
                     </div>
                     <div className="stat-card">
                        <div className="stat-card-label">Max DD Duration</div>
                        <div className="stat-card-value">
                           {stats.maxDrawdownDuration} hari
                        </div>
                        <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                           Waktu pemulihan terlama
                        </div>
                     </div>
                  </div>
               </div>

               {/* Statistik Transaksi */}
               <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-primary)' }}>
                     <Icons.History size={16} style={{ color: 'var(--accent-green)' }} />
                     Statistik Mutasi Transaksi
                  </h3>
                  <div className="grid-stats analytics-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                     <div className="stat-card">
                        <div className="stat-card-label">Rata-rata Win</div>
                        <div className="stat-card-value text-profit">{formatRupiah(stats.avgWin)}</div>
                        <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                           Rerata keuntungan
                        </div>
                     </div>
                     <div className="stat-card">
                        <div className="stat-card-label">Rata-rata Loss</div>
                        <div className="stat-card-value text-loss">{formatRupiah(stats.avgLoss)}</div>
                        <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                           Rerata kerugian
                        </div>
                     </div>
                     <div className="stat-card">
                        <div className="stat-card-label">Win/Loss Ratio</div>
                        <div className={`stat-card-value ${stats.winLossRatio >= 2 ? "text-profit" : stats.winLossRatio >= 1 ? "" : "text-loss"}`}>
                           {stats.winLossRatio === Infinity ? "∞" : `1 : ${stats.winLossRatio.toFixed(2)}`}
                        </div>
                        <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                           Rasio Win vs Loss
                        </div>
                     </div>
                     <div className="stat-card">
                        <div className="stat-card-label">Avg Holding</div>
                        <div className="stat-card-value">{stats.avgHoldingDays.toFixed(0)} hari</div>
                        <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                           Durasi simpan transaksi
                        </div>
                     </div>
                  </div>
               </div>

               {/* Insight Otomatis */}
               <div className="card">
                  <div className="card-header">
                     <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Icons.Sparkles size={16} style={{ color: "var(--accent-yellow)" }} />
                        Insight Otomatis
                     </h3>
                  </div>
                  <div className="card-body">
                     {highlightInsights.length > 0 ? (
                        <>
                           <div className="analytics-insights-grid">
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
            </div>
         )}

         {/* TAB 2: Grafik & Kurva Ekuitas */}
         {activeTab === 'charts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
               {/* Equity Growth Curve */}
               {equityCurve.length > 0 && (
                  <div className="card">
                     <div className="card-header">
                        <h3 className="card-title">Kurva Pertumbuhan Ekuitas (Growth Curve)</h3>
                     </div>
                     <div className="card-body analytics-chart-body" style={{ height: 350 }}>
                        <div className="analytics-chart-caption" style={{ marginBottom: 12 }}>
                           Melacak pertumbuhan saldo total modal Anda secara kumulatif dari waktu ke waktu berdasarkan hasil transaksi yang selesai (realized P/L).
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart
                              data={equityCurve}
                              margin={{
                                 top: chartVerticalMargin,
                                 right: chartHorizontalMargin,
                                 left: chartHorizontalMargin,
                                 bottom: chartVerticalMargin,
                              }}
                           >
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                              <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }} />
                              <YAxis
                                 tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }}
                                 tickFormatter={(value) => formatCompactCurrency(Number(value))}
                                 width={isCompactViewport ? 50 : 75}
                              />
                              <Tooltip content={<EquityTooltip />} />
                              <defs>
                                 <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.01}/>
                                 </linearGradient>
                              </defs>
                              <Area type="monotone" dataKey="equity" stroke="#10B981" fill="url(#equityGrad)" strokeWidth={2} />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               )}

               {/* Grafik Drawdown Portofolio */}
               {equityCurve.length > 0 && (
                  <div className="card">
                     <div className="card-header">
                        <h3 className="card-title">Grafik Drawdown Portofolio (%)</h3>
                     </div>
                     <div className="card-body analytics-chart-body" style={{ height: 300 }}>
                        <div className="analytics-chart-caption" style={{ marginBottom: 12 }}>
                           Menggambarkan persentase penurunan ekuitas portofolio dari titik tertinggi (peak) historisnya. Berguna untuk memantau kedalaman risiko modal secara kumulatif.
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart
                              data={equityCurve}
                              margin={{
                                 top: chartVerticalMargin,
                                 right: chartHorizontalMargin,
                                 left: chartHorizontalMargin,
                                 bottom: chartVerticalMargin,
                              }}
                           >
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                              <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }} />
                              <YAxis
                                 domain={[0, 'auto']}
                                 reversed
                                 tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }}
                                 tickFormatter={(value) => `${value.toFixed(1)}%`}
                                 width={isCompactViewport ? 44 : 60}
                              />
                              <Tooltip content={<DrawdownTooltip />} />
                              <Area type="monotone" dataKey="drawdownPercent" stroke="#F43F5E" fill="rgba(244, 63, 94, 0.15)" strokeWidth={2} />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               )}

               {/* Profit/Loss Bulanan */}
               {monthlyPnL.length > 0 && (
                  <div className="card">
                     <div className="card-header">
                        <h3 className="card-title">Profit/Loss Bulanan</h3>
                     </div>
                     <div className="card-body analytics-chart-body" style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart
                              data={monthlyPnL}
                              margin={{
                                 top: chartVerticalMargin,
                                 right: chartHorizontalMargin,
                                 left: chartHorizontalMargin,
                                 bottom: chartVerticalMargin,
                              }}
                           >
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                              <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }} />
                              <YAxis
                                 tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }}
                                 tickFormatter={(value) => formatCompactCurrency(Number(value))}
                                 width={isCompactViewport ? 44 : 60}
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

               {/* P/L per Hari */}
               <div className="card">
                  <div className="card-header">
                     <h3 className="card-title">P/L per Hari</h3>
                  </div>
                  <div className="card-body analytics-chart-body" style={{ height: 300 }}>
                     <div className="analytics-chart-caption" style={{ marginBottom: 12 }}>
                        {lossDays.length > 0
                           ? `Profit tampil ke atas dan loss ke bawah garis nol. Hari loss terdalam saat ini: ${worstLossDay?.day} (${formatRupiah(worstLossDay?.pnl || 0)}).`
                           : "Semua hari yang tercatat masih positif atau impas. Jika nanti ada loss, batang merah akan turun ke bawah garis nol."}
                     </div>
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                           data={dayOfWeek}
                           margin={{
                              top: chartVerticalMargin,
                              right: chartHorizontalMargin,
                              left: chartHorizontalMargin,
                              bottom: chartVerticalMargin,
                           }}
                        >
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                           <XAxis dataKey="day" tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }} />
                           <YAxis
                              domain={symmetricDayPnLDomain}
                              tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }}
                              tickFormatter={(value) => formatCompactCurrency(Number(value))}
                              width={isCompactViewport ? 44 : 60}
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
         )}

         {/* TAB 3: Analisis Kategori */}
         {activeTab === 'categories' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
               <div className="grid-2">
                  {/* Win Rate per Strategi */}
                  <div className="card">
                     <div className="card-header">
                        <h3 className="card-title">Win Rate per Strategi</h3>
                     </div>
                     <div className="card-body analytics-chart-body" style={{ height: 350 }}>
                        {strategyStats.length > 0 ? (
                           <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                 data={strategyStats}
                                 layout="vertical"
                                 margin={{
                                    top: chartVerticalMargin,
                                    right: chartHorizontalMargin,
                                    left: chartHorizontalMargin,
                                    bottom: chartVerticalMargin,
                                 }}
                              >
                                 <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                                 <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }}
                                    tickFormatter={(value) => `${value}%`}
                                 />
                                 <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }}
                                    width={strategyAxisWidth}
                                    interval={0}
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

                  {/* Analisis Emosi */}
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

               <div className="grid-2">
                  {/* Analisis Custom Tags */}
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

                  {/* Top Saham */}
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
            </div>
         )}
      </div>
   );
}
