import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useData } from "@/modules/shared/context/DataContext";
import { isApiConfigured } from "@/modules/shared/services/apiClient";
import { getAnalyticsSummary } from "@/modules/shared/services/journalApiService";
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
import { BarChart3, TrendingUp, Activity, Compass } from "lucide-react";
import AnalyticsOverviewTab from "./AnalyticsOverviewTab";

// Lazy-loaded tabs to defer loading of recharts
const AnalyticsChartsTab = lazy(() => import("./AnalyticsChartsTab"));
const AnalyticsCategoriesTab = lazy(() => import("./AnalyticsCategoriesTab"));

export default function AnalyticsPage() {
   const { trades, settings, showToast } = useData();
   const [isCompactViewport, setIsCompactViewport] = useState(() =>
      typeof window !== "undefined" ? window.innerWidth < 640 : false,
   );
   const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'categories'>('overview');
   const [apiAnalytics, setApiAnalytics] = useState<any | null>(null);

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
      return [-paddedMax, paddedMax] as [number, number];
   }, [maxAbsDayPnL]);
   const worstLossDay = useMemo(
      () => [...lossDays].sort((left, right) => left.pnl - right.pnl)[0] || null,
      [lossDays],
   );

   const closedTrades = idrTrades.filter((trade) => trade.dateSell && trade.sellPrice != null);
   const initialCapital = settings.initialCapital ?? 10000000;
   const equityCurve = useMemo(() => calculateEquityCurve(idrTrades, initialCapital), [idrTrades, initialCapital]);

   useEffect(() => {
      if (!isApiConfigured) {
         setApiAnalytics(null);
         return;
      }

      let cancelled = false;
      getAnalyticsSummary({
         usdToIdrRate,
         initialCapital,
      })
         .then((data) => {
            if (!cancelled) {
               setApiAnalytics(data || null);
            }
         })
         .catch((error) => {
            if (!cancelled) {
               setApiAnalytics(null);
               showToast(`Fallback ke analytics lokal: ${error.message}`, 'error');
            }
         });

      return () => {
         cancelled = true;
      };
   }, [usdToIdrRate, initialCapital, showToast]);

   const resolvedStats = apiAnalytics?.stats || stats;
   const resolvedStrategyStats = apiAnalytics?.strategyStats || strategyStats;
   const resolvedDayOfWeek = apiAnalytics?.dayOfWeek || dayOfWeek;
   const resolvedEmotionStats = apiAnalytics?.emotionStats || emotionStats;
   const resolvedTagStats = apiAnalytics?.tagStats || tagStats;
   const resolvedTopStocks = apiAnalytics?.topStocks || topStocks;
   const resolvedMonthlyPnL = apiAnalytics?.monthlyPnL || monthlyPnL;
   const resolvedAnalyticsInsights = apiAnalytics?.analyticsInsights || analyticsInsights;
   const resolvedEquityCurve = apiAnalytics?.equityCurve || equityCurve;

   if (closedTrades.length === 0) {
      return (
         <div className="empty-state">
            <div className="empty-state-icon">
               <BarChart3 size={48} />
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
                  <BarChart3 size={26} style={{ color: "var(--accent-green)" }} />
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
               <TrendingUp size={16} />
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
               <Activity size={16} />
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
               <Compass size={16} />
               Analisis Kategori
            </button>
         </div>

         {/* Tab Content Areas */}
         <div className="tab-content">
            {activeTab === 'overview' && (
               <AnalyticsOverviewTab stats={resolvedStats} analyticsInsights={resolvedAnalyticsInsights} />
            )}

            <Suspense fallback={
               <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 300,
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem'
               }}>
                  Memuat grafik...
               </div>
            }>
               {activeTab === 'charts' && (
                  <AnalyticsChartsTab
                     equityCurve={resolvedEquityCurve}
                     monthlyPnL={resolvedMonthlyPnL}
                     dayOfWeek={resolvedDayOfWeek}
                     lossDays={resolvedDayOfWeek.filter((entry: any) => entry.pnl < 0)}
                     worstLossDay={[...resolvedDayOfWeek.filter((entry: any) => entry.pnl < 0)].sort((left: any, right: any) => left.pnl - right.pnl)[0] || null}
                     symmetricDayPnLDomain={symmetricDayPnLDomain}
                     isCompactViewport={isCompactViewport}
                  />
               )}

               {activeTab === 'categories' && (
                  <AnalyticsCategoriesTab
                     strategyStats={resolvedStrategyStats}
                     emotionStats={resolvedEmotionStats}
                     tagStats={resolvedTagStats}
                     topStocks={resolvedTopStocks}
                     settings={settings}
                     isCompactViewport={isCompactViewport}
                  />
               )}
            </Suspense>
         </div>
      </div>
   );
}
