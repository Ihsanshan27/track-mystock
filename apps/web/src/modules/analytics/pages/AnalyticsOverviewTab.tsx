import { formatRupiah } from "@/modules/shared/utils/formatters";
import { Star, ShieldCheck, History, Sparkles } from "lucide-react";

interface TooltipProps {
   active?: boolean;
   payload?: any[];
   label?: string | number;
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

function formatInsightMetric(insight: any) {
   if (insight.metricKind === "percent") {
      return `${Number(insight.metricValue).toFixed(1)}%`;
   }
   if (insight.metricKind === "days") {
      return `${Number(insight.metricValue).toFixed(1)} hari`;
   }
   return formatRupiah(Number(insight.metricValue) || 0);
}

interface AnalyticsOverviewTabProps {
   stats: any;
   analyticsInsights: any;
}

export default function AnalyticsOverviewTab({ stats, analyticsInsights }: AnalyticsOverviewTabProps) {
   const highlightInsights = analyticsInsights.items.slice(0, 6);
   const missingInsightGroups = [
      { key: "strategy", label: "Strategi", state: analyticsInsights.categoryStates.strategy },
      { key: "emotion", label: "Emosi", state: analyticsInsights.categoryStates.emotion },
      { key: "tag", label: "Tag", state: analyticsInsights.categoryStates.tag },
   ].filter((item) => !item.state.hasEnoughData);

   return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
         {/* Metrik Utama */}
         <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "var(--text-primary)" }}>
               <Star size={16} style={{ color: "var(--accent-green)" }} />
               Metrik Utama Performa
            </h3>
            <div className="grid-stats analytics-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
               <div className="stat-card">
                  <div className="stat-card-label">Win Rate</div>
                  <div className={`stat-card-value ${stats.winRate >= 50 ? "text-profit" : "text-loss"}`}>
                     {stats.winRate.toFixed(1)}%
                  </div>
                  <div className="stat-card-change positive">{stats.winCount}W / {stats.lossCount}L</div>
               </div>
               <div className="stat-card">
                  <div className="stat-card-label">Profit Factor</div>
                  <div className={`stat-card-value ${stats.profitFactor >= 1 ? "text-profit" : "text-loss"}`}>
                     {stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}
                  </div>
                  <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>Rasio Gross Profit/Loss</div>
               </div>
               <div className="stat-card">
                  <div className="stat-card-label">Expectancy</div>
                  <div className={`stat-card-value ${stats.expectancy >= 0 ? "text-profit" : "text-loss"}`}>
                     {formatRupiah(stats.expectancy)}
                  </div>
                  <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>Estimasi nilai per trade</div>
               </div>
               <div className="stat-card">
                  <div className="stat-card-label">Rata-rata Profit Bersih</div>
                  <div className={`stat-card-value ${stats.totalPnL >= 0 ? "text-profit" : "text-loss"}`}>
                     {formatRupiah(stats.totalPnL / stats.totalTrades)}
                  </div>
                  <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>Net profit per trade</div>
               </div>
            </div>
         </div>

         {/* Manajemen Risiko */}
         <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "var(--text-primary)" }}>
               <ShieldCheck size={16} style={{ color: "var(--accent-green)" }} />
               Manajemen Risiko &amp; Ketahanan
            </h3>
            <div className="grid-stats analytics-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
               <div className="stat-card">
                  <div className="stat-card-label">Sharpe Ratio</div>
                  <div className={`stat-card-value ${stats.sharpeRatio >= 1.0 ? "text-profit" : ""}`}>
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
                  <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>Realized P&amp;L / Max DD</div>
               </div>
               <div className="stat-card">
                  <div className="stat-card-label">Max Drawdown (%)</div>
                  <div className="stat-card-value text-loss">{stats.maxDrawdownPercent.toFixed(1)}%</div>
                  <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>Penurunan modal terdalam</div>
               </div>
               <div className="stat-card">
                  <div className="stat-card-label">Max DD Duration</div>
                  <div className="stat-card-value">{stats.maxDrawdownDuration} hari</div>
                  <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>Waktu pemulihan terlama</div>
               </div>
            </div>
         </div>

         {/* Statistik Transaksi */}
         <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "var(--text-primary)" }}>
               <History size={16} style={{ color: "var(--accent-green)" }} />
               Statistik Mutasi Transaksi
            </h3>
            <div className="grid-stats analytics-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
               <div className="stat-card">
                  <div className="stat-card-label">Rata-rata Win</div>
                  <div className="stat-card-value text-profit">{formatRupiah(stats.avgWin)}</div>
                  <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>Rerata keuntungan</div>
               </div>
               <div className="stat-card">
                  <div className="stat-card-label">Rata-rata Loss</div>
                  <div className="stat-card-value text-loss">{formatRupiah(stats.avgLoss)}</div>
                  <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>Rerata kerugian</div>
               </div>
               <div className="stat-card">
                  <div className="stat-card-label">Win/Loss Ratio</div>
                  <div className={`stat-card-value ${stats.winLossRatio >= 2 ? "text-profit" : stats.winLossRatio >= 1 ? "" : "text-loss"}`}>
                     {stats.winLossRatio === Infinity ? "∞" : `1 : ${stats.winLossRatio.toFixed(2)}`}
                  </div>
                  <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>Rasio Win vs Loss</div>
               </div>
               <div className="stat-card">
                  <div className="stat-card-label">Avg Holding</div>
                  <div className="stat-card-value">{stats.avgHoldingDays.toFixed(0)} hari</div>
                  <div className="stat-card-change" style={{ color: "var(--text-muted)", fontWeight: 400 }}>Durasi simpan transaksi</div>
               </div>
            </div>
         </div>

         {/* Insight Otomatis */}
         <div className="card">
            <div className="card-header">
               <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Sparkles size={16} style={{ color: "var(--accent-yellow)" }} />
                  Insight Otomatis
               </h3>
            </div>
            <div className="card-body">
               {highlightInsights.length > 0 ? (
                  <>
                     <div className="analytics-insights-grid">
                        {highlightInsights.map((insight: any) => {
                           const toneStyles = getInsightToneStyles(insight.tone);
                           return (
                              <div
                                 key={insight.id}
                                 className="bento-card"
                                 style={{ border: toneStyles.border, background: toneStyles.background, padding: "16px 18px" }}
                              >
                                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                    <strong style={{ fontSize: "0.92rem" }}>{insight.title}</strong>
                                    <span style={{ background: toneStyles.badgeBackground, color: toneStyles.badgeColor, borderRadius: 999, padding: "3px 8px", fontSize: "0.68rem", fontWeight: 700 }}>
                                       {insight.category}
                                    </span>
                                 </div>
                                 <div className={`font-mono ${toneStyles.valueClass}`} style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 6 }}>
                                    {formatInsightMetric(insight)}
                                 </div>
                                 <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                                    {insight.metricLabel}
                                 </div>
                                 <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 10 }}>
                                    {insight.summary}
                                 </div>
                                 <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{insight.supportingValue}</div>
                              </div>
                           );
                        })}
                     </div>
                     {missingInsightGroups.length > 0 && (
                        <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--bg-input)", border: "1px solid var(--border-color)", fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                           Belum cukup data untuk insight:{" "}
                           {missingInsightGroups.map((item) => item.label).join(", ")}.
                           {" "}Minimal {analyticsInsights.categoryStates.strategy.minSample} trade per kategori.
                        </div>
                     )}
                  </>
               ) : (
                  <div className="analytics-empty-note">Belum cukup data untuk menghasilkan insight otomatis.</div>
               )}
            </div>
         </div>
      </div>
   );
}
