import {
   BarChart, Bar, ReferenceLine, XAxis, YAxis, Tooltip,
   ResponsiveContainer, CartesianGrid, Cell, AreaChart, Area,
} from "recharts";
import { formatRupiah } from "@/modules/shared/utils/formatters";

interface TooltipProps {
   active?: boolean;
   payload?: any[];
   label?: string | number;
}

function formatCompactCurrency(value: number) {
   const abs = Math.abs(value);
   if (abs >= 1000000) return `${value < 0 ? "-" : ""}${(abs / 1000000).toFixed(1)}Jt`;
   if (abs >= 1000) return `${value < 0 ? "-" : ""}${(abs / 1000).toFixed(0)}Rb`;
   return `${value < 0 ? "-" : ""}${abs.toFixed(0)}`;
}

function CurrencyTooltip({ active, payload, label }: TooltipProps) {
   if (!active || !payload?.length) return null;
   return (
      <div className="chart-tooltip-card">
         <div className="chart-tooltip-label">{label}</div>
         <div className={payload[0].value >= 0 ? "text-profit analytics-tooltip-value" : "text-loss analytics-tooltip-value"}>
            {formatRupiah(payload[0].value)}
         </div>
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

function DrawdownTooltip({ active, payload, label }: TooltipProps) {
   if (!active || !payload?.length) return null;
   const point = payload[0]?.payload;
   const ddPct = Number(point?.drawdownPercent || 0);
   const ddVal = Number(point?.drawdown || 0);
   return (
      <div className="chart-tooltip-card">
         <div className="chart-tooltip-label">Tanggal: {label}</div>
         <div className="text-loss analytics-tooltip-value" style={{ fontWeight: 800 }}>Drawdown: {ddPct.toFixed(2)}%</div>
         <div className="analytics-secondary-text" style={{ marginTop: 4 }}>Kerugian dari Peak: {formatRupiah(ddVal)}</div>
         <div className="analytics-secondary-text">Nilai Peak: {formatRupiah(point?.peak || 0)}</div>
      </div>
   );
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
         <div className="analytics-secondary-text" style={{ marginTop: 4 }}>{point?.count || 0} trade ditutup</div>
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
      <rect x={x} y={rectY} width={width} height={visualHeight} rx={4} ry={4} fill={fill} stroke={stroke} strokeWidth={1} />
   );
}

interface AnalyticsChartsTabProps {
   equityCurve: any[];
   monthlyPnL: any[];
   dayOfWeek: any[];
   lossDays: any[];
   worstLossDay: any;
   symmetricDayPnLDomain: [number, number];
   isCompactViewport: boolean;
}

export default function AnalyticsChartsTab({
   equityCurve,
   monthlyPnL,
   dayOfWeek,
   lossDays,
   worstLossDay,
   symmetricDayPnLDomain,
   isCompactViewport,
}: AnalyticsChartsTabProps) {
   const chartTickFontSize = isCompactViewport ? 10 : 11;
   const chartHorizontalMargin = isCompactViewport ? 4 : 8;
   const chartVerticalMargin = isCompactViewport ? 0 : 8;

   return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
                     <AreaChart data={equityCurve} margin={{ top: chartVerticalMargin, right: chartHorizontalMargin, left: chartHorizontalMargin, bottom: chartVerticalMargin }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }} />
                        <YAxis tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }} tickFormatter={(v) => formatCompactCurrency(Number(v))} width={isCompactViewport ? 50 : 75} />
                        <Tooltip content={<EquityTooltip />} />
                        <defs>
                           <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0.01} />
                           </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="equity" stroke="#10B981" fill="url(#equityGrad)" strokeWidth={2} />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
         )}

         {/* Grafik Drawdown */}
         {equityCurve.length > 0 && (
            <div className="card">
               <div className="card-header">
                  <h3 className="card-title">Grafik Drawdown Portofolio (%)</h3>
               </div>
               <div className="card-body analytics-chart-body" style={{ height: 300 }}>
                  <div className="analytics-chart-caption" style={{ marginBottom: 12 }}>
                     Menggambarkan persentase penurunan ekuitas portofolio dari titik tertinggi (peak) historisnya.
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={equityCurve} margin={{ top: chartVerticalMargin, right: chartHorizontalMargin, left: chartHorizontalMargin, bottom: chartVerticalMargin }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }} />
                        <YAxis domain={[0, "auto"]} reversed tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }} tickFormatter={(v) => `${v.toFixed(1)}%`} width={isCompactViewport ? 44 : 60} />
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
                     <BarChart data={monthlyPnL} margin={{ top: chartVerticalMargin, right: chartHorizontalMargin, left: chartHorizontalMargin, bottom: chartVerticalMargin }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                        <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }} />
                        <YAxis tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }} tickFormatter={(v) => formatCompactCurrency(Number(v))} width={isCompactViewport ? 44 : 60} />
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
                     ? `Profit tampil ke atas dan loss ke bawah garis nol. Hari loss terdalam: ${worstLossDay?.day} (${formatRupiah(worstLossDay?.pnl || 0)}).`
                     : "Semua hari yang tercatat masih positif atau impas."}
               </div>
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayOfWeek} margin={{ top: chartVerticalMargin, right: chartHorizontalMargin, left: chartHorizontalMargin, bottom: chartVerticalMargin }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                     <XAxis dataKey="day" tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }} />
                     <YAxis domain={symmetricDayPnLDomain} tick={{ fill: "#94A3B8", fontSize: chartTickFontSize }} tickFormatter={(v) => formatCompactCurrency(Number(v))} width={isCompactViewport ? 44 : 60} />
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
   );
}
