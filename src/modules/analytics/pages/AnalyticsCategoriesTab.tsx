import {
   BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { formatRupiah } from "@/modules/shared/utils/formatters";
import { EMOTIONS } from "@/modules/shared/utils/constants";

interface TooltipProps {
   active?: boolean;
   payload?: any[];
   label?: string | number;
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
   calm: "🙂", confident: "😎", fearful: "😨", greedy: "🤑",
   revenge: "😡", doubtful: "🤔", fomo: "😱", neutral: "😐",
};

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#F43F5E", "#06B6D4", "#EC4899", "#84CC16"];

interface AnalyticsCategoriesTabProps {
   strategyStats: any[];
   emotionStats: any[];
   tagStats: any[];
   topStocks: any[];
   settings: any;
   isCompactViewport: boolean;
}

export default function AnalyticsCategoriesTab({
   strategyStats,
   emotionStats,
   tagStats,
   topStocks,
   settings,
   isCompactViewport,
}: AnalyticsCategoriesTabProps) {
   const chartTickFontSize = isCompactViewport ? 10 : 11;
   const chartHorizontalMargin = isCompactViewport ? 4 : 8;
   const chartVerticalMargin = isCompactViewport ? 0 : 8;
   const strategyAxisWidth = isCompactViewport ? 72 : 100;

   return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
                           margin={{ top: chartVerticalMargin, right: chartHorizontalMargin, left: chartHorizontalMargin, bottom: chartVerticalMargin }}
                        >
                           <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                           <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }} tickFormatter={(v) => `${v}%`} />
                           <YAxis type="category" dataKey="name" tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }} width={strategyAxisWidth} interval={0} />
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
                        {emotionStats.map((emotionStat: any) => {
                           const emotionsList = settings?.customEmotions || EMOTIONS;
                           const emotionOption = emotionsList.find((e: any) => e.value === emotionStat.emotion);
                           return (
                              <div key={emotionStat.emotion} className="analytics-list-row">
                                 <div className="analytics-list-label">
                                    <span className="analytics-emoji">{EMOJI_MAP[emotionStat.emotion] || "❓"}</span>
                                    <span className="analytics-item-label">{emotionOption?.label || emotionStat.emotion}</span>
                                 </div>
                                 <div className="analytics-list-metrics">
                                    <span className="analytics-secondary-text">{emotionStat.count} trades</span>
                                    <span className={`badge ${emotionStat.winRate >= 50 ? "badge-green" : "badge-red"}`}>
                                       {emotionStat.winRate.toFixed(0)}% win
                                    </span>
                                    <span className={`${emotionStat.totalPnL >= 0 ? "text-profit" : "text-loss"} analytics-strong-value`}>
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
                        {tagStats.slice(0, 10).map((tagStat: any) => (
                           <div key={tagStat.tagName} className="analytics-list-row">
                              <div className="analytics-list-label">
                                 <span className="badge badge-purple">#{tagStat.tagName}</span>
                              </div>
                              <div className="analytics-list-metrics">
                                 <span className="analytics-secondary-text">{tagStat.count} trades</span>
                                 <span className={`badge ${tagStat.winRate >= 50 ? "badge-green" : "badge-red"}`}>
                                    {tagStat.winRate.toFixed(0)}% win
                                 </span>
                                 <span className={`${tagStat.totalPnL >= 0 ? "text-profit" : "text-loss"} analytics-strong-value`}>
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
                  {topStocks.slice(0, 10).map((stock: any, index: number) => (
                     <div key={stock.code} className="analytics-list-row">
                        <div className="analytics-top-stock-label">
                           <span className="analytics-rank-badge">{index + 1}</span>
                           <strong>{stock.code}</strong>
                        </div>
                        <div className="analytics-list-metrics">
                           <span className="analytics-secondary-text">{stock.trades} trades</span>
                           <span className={`badge ${stock.winRate >= 50 ? "badge-green" : "badge-red"}`}>
                              {stock.winRate.toFixed(0)}%
                           </span>
                           <span className={`${stock.totalPnL >= 0 ? "text-profit" : "text-loss"} analytics-strong-value analytics-stronger-value`}>
                              {formatRupiah(stock.totalPnL)}
                           </span>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
   );
}
