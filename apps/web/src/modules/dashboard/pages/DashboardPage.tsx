import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { useData } from "@/modules/shared/context/DataContext";
import { isApiConfigured } from "@/modules/shared/services/apiClient";
import { getDashboardSummary } from "@/modules/shared/services/journalApiService";
import {
   calculateAnalyticsInsights,
   calculateStats,
   calculateTradePnL,
   calculateEquityCurve,
   calculateDailyPnL,
   calculatePortfolioBalance,
   calculateAchievements,
} from "@/modules/trades/calculations";
import {
   formatRupiah,
   formatDate,
   formatNumber,
} from "@/modules/shared/utils/formatters";
import { LayoutDashboard, Wallet, Target, Activity, Layers, TrendingDown, TrendingUp, FileText } from "lucide-react";
import DashboardAchievementsSection from "@/modules/dashboard/components/DashboardAchievementsSection";
import DashboardCalendarSection from "@/modules/dashboard/components/DashboardCalendarSection";
import DashboardIhsgOverviewCard from "@/modules/dashboard/components/DashboardIhsgOverviewCard";
import DashboardInsightsSection from "@/modules/dashboard/components/DashboardInsightsSection";
import DashboardRecentTradesTable from "@/modules/dashboard/components/DashboardRecentTradesTable";
import { useIhsgOverview } from "@/modules/dashboard/hooks/useIhsgOverview";
import type {
   ClosedDashboardTrade,
   DashboardAchievement,
   DashboardInsightItem,
   DashboardCalendarDay,
   DashboardRecentTradeSortKey,
   PerformanceChartPoint,
   ProfitLossChartPoint,
   RangeSummaryItem,
} from "@/modules/dashboard/types/dashboard";
import StatCard from "@/modules/shared/components/StatCard";
import MarketTabBar from "@/modules/shared/components/MarketTabBar";
import { usePrivacyStyle } from "@/modules/shared/hooks/usePrivacyStyle";
import { useMarketFormatter } from "@/modules/shared/hooks/useMarketFormatter";
import { useOpenPositionMetrics } from "@/modules/shared/hooks/useOpenPositionMetrics";
import { useTableSort } from "@/modules/shared/hooks/useTableSort";
import type { Trade } from "@/modules/shared/types/index";
import {
   buildDailyDateRange,
   buildRangeLabel,
   formatDateKey,
   getPerformanceRangeStart,
   isSameDay,
   parseLocalDate,
   startOfDay,
   type PerformanceRangeKey,
   type RangeKey,
} from "@/modules/dashboard/utils/dashboardDate";

// Lazy-loaded components that use recharts
const DashboardPerformanceSection = lazy(() => import("@/modules/dashboard/components/DashboardPerformanceSection"));
const DashboardProfitLossSection = lazy(() => import("@/modules/dashboard/components/DashboardProfitLossSection"));

function isClosedTrade(trade: Trade): trade is Trade & { dateSell: string; sellPrice: number } {
   return trade?.dateSell && trade?.sellPrice != null;
}

export default function DashboardPage() {
   const { trades, cashflows, dividends, settings, marketPrices, showToast } = useData();
   const [activeMarketTab, setActiveMarketTab] = useState<"ID" | "US" | "ALL">("ID");
   const [apiDashboard, setApiDashboard] = useState<any | null>(null);
   const blurStyle = usePrivacyStyle();
   const { formatMoney, isUS, formatPercent } = useMarketFormatter(activeMarketTab === "ALL" ? "ID" : activeMarketTab);
   const [selectedRangeKey, setSelectedRangeKey] = useState<RangeKey>("mtd");
   const [performanceRangeKey, setPerformanceRangeKey] = useState<PerformanceRangeKey>("ytd");
   const [profitLossRangeKey, setProfitLossRangeKey] = useState<PerformanceRangeKey>("1m");
   const now = useMemo(() => new Date(), []);
   const defaultCustomStartDate = useMemo(
      () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
      [now],
   );
   const defaultCustomEndDate = useMemo(() => formatDateKey(now), [now]);
   const [customStartDate, setCustomStartDate] = useState(defaultCustomStartDate);
   const [customEndDate, setCustomEndDate] = useState(defaultCustomEndDate);
   const [calendarMonth, setCalendarMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
   const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
   const calendarYearOptions = useMemo(() => {
      const currentYear = now.getFullYear();
      return Array.from({ length: 12 }, (_, index) => currentYear - 10 + index);
   }, [now]);

   const usdToIdrRate = settings.usdToIdrRate ?? 16200;
   const {
      ihsgTrendData,
      ihsgQuote,
      isLoadingIhsg,
      ihsgOverviewData,
      ihsgLatestCandle,
      ihsgPreviousClose,
      ihsgMetrics,
   } = useIhsgOverview();

   const filteredTrades = useMemo(() => {
      if (activeMarketTab === "ALL") {
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
      }
      return trades.filter(
         (trade) =>
            trade.market === activeMarketTab || (!trade.market && activeMarketTab === "ID"),
      );
   }, [trades, activeMarketTab, usdToIdrRate]);

   const filteredCashflows = useMemo(() => {
      if (activeMarketTab === "ALL") {
         return cashflows.map((cf) => {
            if (cf.market === "US") {
               return {
                  ...cf,
                  amount: cf.amount * usdToIdrRate,
               };
            }
            return cf;
         });
      }
      return cashflows.filter(
         (cashflow) =>
            cashflow.market === activeMarketTab ||
            (!cashflow.market && activeMarketTab === "ID"),
      );
   }, [cashflows, activeMarketTab, usdToIdrRate]);

   const filteredDividends = useMemo(() => {
      if (activeMarketTab === "ALL") {
         return dividends.map((d) => {
            if (d.market === "US") {
               return {
                  ...d,
                  totalAmount: (d.totalAmount || 0) * usdToIdrRate,
               };
            }
            return d;
         });
      }
      return dividends.filter(
         (dividend) =>
            dividend.market === activeMarketTab ||
            (!dividend.market && activeMarketTab === "ID"),
      );
   }, [dividends, activeMarketTab, usdToIdrRate]);

   const initialCapitalForMarket = useMemo(() => {
      if (activeMarketTab === "ALL") {
         return (settings.initialCapital ?? 10000000) + (settings.initialCapitalUS ?? 1000) * usdToIdrRate;
      }
      return activeMarketTab === "US"
         ? (settings.initialCapitalUS ?? 1000)
         : (settings.initialCapital ?? 10000000);
   }, [activeMarketTab, settings, usdToIdrRate]);

   const stats = useMemo(() => calculateStats(filteredTrades), [filteredTrades]);
   const dashboardInsights = useMemo<DashboardInsightItem[]>(
      () =>
         calculateAnalyticsInsights(filteredTrades).items.filter((insight) =>
            ["best-strategy", "risk-emotion", "worst-trading-day"].includes(insight.id),
         ),
      [filteredTrades],
   );
   const equityCurve = useMemo(
      () => calculateEquityCurve(filteredTrades, initialCapitalForMarket),
      [filteredTrades, initialCapitalForMarket],
   );
   const dailyPnL = useMemo(() => calculateDailyPnL(filteredTrades), [filteredTrades]);
   const balance = useMemo(
      () =>
         calculatePortfolioBalance(
            filteredTrades,
            filteredCashflows,
            filteredDividends,
            initialCapitalForMarket,
         ),
      [filteredTrades, filteredCashflows, filteredDividends, initialCapitalForMarket],
   );
   const achievements = useMemo(
      () => calculateAchievements(filteredTrades, filteredDividends),
      [filteredTrades, filteredDividends],
   );

   useEffect(() => {
      if (!isApiConfigured) {
         setApiDashboard(null);
         return;
      }

      let cancelled = false;

      getDashboardSummary({
         market: activeMarketTab,
         usdToIdrRate,
         initialCapital: settings.initialCapital ?? 10000000,
         initialCapitalUS: settings.initialCapitalUS ?? 1000,
         performanceRangeKey,
         profitLossRangeKey,
         customStartDate,
         customEndDate,
         calendarMonth: `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`,
      })
         .then((data) => {
            if (!cancelled) setApiDashboard(data || null);
         })
         .catch((error) => {
            if (!cancelled) {
               setApiDashboard(null);
               showToast(`Fallback ke dashboard lokal: ${error.message}`, 'error');
            }
         });

      return () => {
         cancelled = true;
      };
   }, [
      activeMarketTab,
      calendarMonth,
      customEndDate,
      customStartDate,
      performanceRangeKey,
      profitLossRangeKey,
      settings.initialCapital,
      settings.initialCapitalUS,
      showToast,
      usdToIdrRate,
   ]);

   const convertedMarketPrices = useMemo(() => {
      if (activeMarketTab !== "ALL") return marketPrices;
      const converted: Record<string, number> = {};
      for (const [code, price] of Object.entries(marketPrices || {})) {
         const isUsStock = trades.some((t) => t.stockCode === code && t.market === "US");
         converted[code] = isUsStock ? (price as number) * usdToIdrRate : (price as number);
      }
      return converted;
   }, [marketPrices, activeMarketTab, trades, usdToIdrRate]);

   const { openTrades, totalFloating, tradingBalance } = useOpenPositionMetrics(
      filteredTrades,
      { market: activeMarketTab, marketPrices: convertedMarketPrices as Record<string, number> },
   );

   const recentTrades = filteredTrades
      .filter(isClosedTrade)
      .sort(
         (newerTrade, olderTrade) =>
            (parseLocalDate(olderTrade.dateSell)?.getTime() || 0) -
            (parseLocalDate(newerTrade.dateSell)?.getTime() || 0),
      )
      .slice(0, 8);
   const {
      sortConfig: recentSortConfig,
      sortedItems: sortedRecentTrades,
      requestSort: requestRecentSort,
   } = useTableSort<typeof recentTrades[number], DashboardRecentTradeSortKey>(recentTrades, {
      initialKey: "dateSell",
      initialDirection: "desc",
      getValue: (trade, key) => {
         if (key === "pnl") return calculateTradePnL(trade).pnl;
         if (key === "pnlPercent") return calculateTradePnL(trade).pnlPercent;
         return trade[key] || "";
      },
      tieBreaker: (a, b) =>
         (parseLocalDate(b.dateSell)?.getTime() || 0) -
         (parseLocalDate(a.dateSell)?.getTime() || 0),
   });

   const localCalendarDays = useMemo<Array<DashboardCalendarDay | null>>(() => {
      const currentYear = calendarMonth.getFullYear();
      const currentMonth = calendarMonth.getMonth();
      const firstWeekdayOffset = new Date(currentYear, currentMonth, 1).getDay();
      const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const calendarDayCells = [];

      for (let emptyCellIndex = 0; emptyCellIndex < firstWeekdayOffset; emptyCellIndex++) {
         calendarDayCells.push(null);
      }

      for (let dayNumber = 1; dayNumber <= totalDaysInMonth; dayNumber++) {
         const calendarDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
         const dayProfitLoss = dailyPnL[calendarDate] || 0;
         calendarDayCells.push({ day: dayNumber, date: calendarDate, pnl: dayProfitLoss });
      }

      return calendarDayCells;
   }, [calendarMonth, dailyPnL]);

   const localClosedTrades = useMemo<ClosedDashboardTrade[]>(() =>
         filteredTrades
            .filter(isClosedTrade)
            .map((trade) => {
               const tradePnL = calculateTradePnL(trade);
               return {
                  ...trade,
                  ...tradePnL,
                  sellDateObj: parseLocalDate(trade.dateSell)!,
               };
            })
            .sort((a, b) => a.sellDateObj.getTime() - b.sellDateObj.getTime()),
      [filteredTrades],
   );

   const localRangeSummaries = useMemo<Array<RangeSummaryItem<RangeKey>>>(() => {
      const todayStart = startOfDay(now);
      const sevenDaysAgo = new Date(todayStart);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const thirtyDaysAgo = new Date(todayStart);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      const ninetyDaysAgo = new Date(todayStart);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);
      const customStartObj = parseLocalDate(customStartDate);
      const customEndObj = parseLocalDate(customEndDate);
      const normalizedCustomStart =
         customStartObj && customEndObj && customStartObj > customEndObj
            ? customEndObj
            : customStartObj;
      const normalizedCustomEnd =
         customStartObj && customEndObj && customStartObj > customEndObj
            ? customStartObj
            : customEndObj;

      const rangeMap: Array<{
         key: RangeKey;
         label: string;
         matches: (sellDate: Date) => boolean;
      }> = [
         { key: "today", label: "Today", matches: (sellDate) => isSameDay(sellDate, now) },
         {
            key: "mtd",
            label: "Month To Date",
            matches: (sellDate) =>
               sellDate.getFullYear() === now.getFullYear() &&
               sellDate.getMonth() === now.getMonth(),
         },
         {
            key: "ytd",
            label: "Year To Date",
            matches: (sellDate) => sellDate.getFullYear() === now.getFullYear(),
         },
         {
            key: "last7d",
            label: "Last 7 Days",
            matches: (sellDate) => sellDate >= sevenDaysAgo && sellDate <= now,
         },
         {
            key: "last30d",
            label: "Last 1 Month",
            matches: (sellDate) => sellDate >= thirtyDaysAgo && sellDate <= now,
         },
         {
            key: "last90d",
            label: "Last 3 Months",
            matches: (sellDate) => sellDate >= ninetyDaysAgo && sellDate <= now,
         },
         {
            key: "custom",
            label: `Custom Range (${buildRangeLabel(customStartDate, customEndDate, formatDate)})`,
            matches: (sellDate) => {
               if (normalizedCustomStart && sellDate < normalizedCustomStart) return false;
               if (normalizedCustomEnd && sellDate > normalizedCustomEnd) return false;
               return true;
            },
         },
         { key: "all", label: "All Time", matches: () => true },
      ];

      return rangeMap.map((range) => {
         const items = localClosedTrades.filter((trade) => range.matches(trade.sellDateObj));
         const realized = items.reduce((sum, trade) => sum + trade.pnl, 0);
         const invested = items.reduce((sum, trade) => sum + trade.totalBuy, 0);
         const wins = items.filter((trade) => trade.pnl > 0).length;

         return {
            ...range,
            count: items.length,
            realized,
            invested,
            winRate: items.length > 0 ? (wins / items.length) * 100 : 0,
         };
      });
   }, [customEndDate, customStartDate, localClosedTrades, now]);

   const apiClosedTrades = useMemo<ClosedDashboardTrade[]>(() => {
      if (!Array.isArray(apiDashboard?.closedTrades)) return [];
      return apiDashboard.closedTrades
         .map((trade: any) => ({
            ...trade,
            sellDateObj: parseLocalDate(trade.dateSell)!,
         }))
         .filter((trade: ClosedDashboardTrade) => Boolean(trade.sellDateObj))
         .sort((a: ClosedDashboardTrade, b: ClosedDashboardTrade) => a.sellDateObj.getTime() - b.sellDateObj.getTime());
   }, [apiDashboard]);

   const closedTrades = apiClosedTrades.length > 0 ? apiClosedTrades : localClosedTrades;
   const rangeSummaries = (apiDashboard?.rangeSummaries || localRangeSummaries) as Array<RangeSummaryItem<RangeKey>>;
   const calendarDays = (apiDashboard?.calendarDays || localCalendarDays) as Array<DashboardCalendarDay | null>;

   const selectedDateTrades = useMemo(() => {
      if (!selectedCalendarDate) return [];
      return closedTrades
         .filter((trade) => trade.dateSell === selectedCalendarDate)
         .sort((a, b) => b.pnl - a.pnl);
   }, [closedTrades, selectedCalendarDate]);

   const selectedDateSummary = useMemo(() => {
      if (!selectedCalendarDate) return null;
      const tradesForDate = selectedDateTrades;
      const realized = tradesForDate.reduce((sum, trade) => sum + trade.pnl, 0);
      const invested = tradesForDate.reduce((sum, trade) => sum + trade.totalBuy, 0);
      const wins = tradesForDate.filter((trade) => trade.pnl > 0).length;
      return {
         date: selectedCalendarDate,
         count: tradesForDate.length,
         realized,
         invested,
         winRate: tradesForDate.length > 0 ? (wins / tradesForDate.length) * 100 : 0,
      };
   }, [selectedCalendarDate, selectedDateTrades]);

   const selectedDateTradesPreview = useMemo(
      () => selectedDateTrades.slice(0, 5),
      [selectedDateTrades],
   );

   const localProfitLossRangeTrades = useMemo(() => {
      const rangeStart = getPerformanceRangeStart(profitLossRangeKey, now);
      if (!rangeStart) return closedTrades;
      return closedTrades.filter((trade) => trade.sellDateObj >= rangeStart && trade.sellDateObj <= now);
   }, [closedTrades, now, profitLossRangeKey]);

   const localProfitLossSummary = useMemo(() => {
      const realized = localProfitLossRangeTrades.reduce((sum, trade) => sum + trade.pnl, 0);
      const invested = localProfitLossRangeTrades.reduce((sum, trade) => sum + trade.totalBuy, 0);
      const wins = localProfitLossRangeTrades.filter((trade) => trade.pnl > 0).length;
      return {
         realized,
         invested,
         count: localProfitLossRangeTrades.length,
         winRate: localProfitLossRangeTrades.length > 0 ? (wins / localProfitLossRangeTrades.length) * 100 : 0,
      };
   }, [localProfitLossRangeTrades]);

   const localProfitLossChartData = useMemo<ProfitLossChartPoint[]>(() => {
      if (localProfitLossRangeTrades.length === 0) return [];

      const grouped = new Map<
         string,
         { key: string; label: string; pnl: number; tradeCount: number }
      >();

      localProfitLossRangeTrades.forEach((trade) => {
         const key = trade.dateSell;
         const label = new Intl.DateTimeFormat("id-ID", {
            day: "numeric",
            month: "short",
         }).format(parseLocalDate(trade.dateSell)!);

         if (!grouped.has(key)) {
            grouped.set(key, { key, label, pnl: 0, tradeCount: 0 });
         }

         const current = grouped.get(key)!;
         current.pnl += trade.pnl;
         current.tradeCount += 1;
      });

      return Array.from(grouped.values()).sort((a, b) => a.key.localeCompare(b.key));
   }, [localProfitLossRangeTrades]);

   const profitLossSummary = apiDashboard?.profitLossSummary || localProfitLossSummary;
   const profitLossChartData = (apiDashboard?.profitLossChartData || localProfitLossChartData) as ProfitLossChartPoint[];

   const performanceChartData = useMemo<PerformanceChartPoint[]>(() => {
      const portfolioSeries = Array.isArray(apiDashboard?.performancePortfolioSeries) && apiDashboard.performancePortfolioSeries.length > 0
         ? apiDashboard.performancePortfolioSeries.map((point: any) => ({
            date: point.date,
            label: point.label,
            portfolioReturn: Number(point.portfolioReturn) || 0,
         }))
         : equityCurve
              .map((point) => ({
                 date: point.date,
                 value: Number(point.equity) || 0,
              }))
              .sort((a, b) => a.date.localeCompare(b.date));
      if (portfolioSeries.length === 0 && ihsgTrendData.length === 0) return [];

      const useApiPortfolioSeries = "portfolioReturn" in (portfolioSeries[0] || {});
      if (useApiPortfolioSeries) {
         const apiSeries = portfolioSeries as Array<{ date: string; label: string; portfolioReturn: number }>;
         const ihsgSeries = ihsgTrendData
            .map((point) => ({
               date: point.date,
               value: Number(point.close) || 0,
            }))
            .filter((point) => point.value > 0)
            .sort((a, b) => a.date.localeCompare(b.date));

         let ihsgIndex = 0;
         let currentIhsgValue: number | null = null;
         let baseIhsgValue: number | null = null;

         return apiSeries.map((point) => {
            while (ihsgIndex < ihsgSeries.length && ihsgSeries[ihsgIndex].date <= point.date) {
               currentIhsgValue = ihsgSeries[ihsgIndex].value;
               ihsgIndex += 1;
            }

            if (currentIhsgValue != null && baseIhsgValue == null) baseIhsgValue = currentIhsgValue;

            return {
               date: point.date,
               label: point.label,
               portfolioReturn: point.portfolioReturn,
               ihsgReturn:
                  currentIhsgValue != null && baseIhsgValue
                     ? ((currentIhsgValue / baseIhsgValue) - 1) * 100
                     : null,
            };
         });
      }

      const rangeStart = getPerformanceRangeStart(performanceRangeKey, now);
      const rawPortfolioSeries = portfolioSeries as Array<{ date: string; value: number }>;
      const ihsgSeries = ihsgTrendData
         .map((point) => ({
            date: point.date,
            value: Number(point.close) || 0,
         }))
         .filter((point) => point.value > 0)
         .sort((a, b) => a.date.localeCompare(b.date));

      const firstPortfolioDate = rawPortfolioSeries[0]?.date
         ? parseLocalDate(rawPortfolioSeries[0].date)
         : null;
      const firstIhsgDate = ihsgSeries[0]?.date ? parseLocalDate(ihsgSeries[0].date) : null;
      const earliestAvailableDate =
         firstPortfolioDate && firstIhsgDate
            ? (firstPortfolioDate <= firstIhsgDate ? firstPortfolioDate : firstIhsgDate)
            : firstPortfolioDate || firstIhsgDate;
      const effectiveStart =
         rangeStart && earliestAvailableDate
            ? (rangeStart >= earliestAvailableDate ? rangeStart : earliestAvailableDate)
            : rangeStart || earliestAvailableDate;
      const lastPortfolioDate = rawPortfolioSeries[rawPortfolioSeries.length - 1]?.date
         ? parseLocalDate(rawPortfolioSeries[rawPortfolioSeries.length - 1].date)
         : null;
      const lastIhsgDate = ihsgSeries[ihsgSeries.length - 1]?.date
         ? parseLocalDate(ihsgSeries[ihsgSeries.length - 1].date)
         : null;
      const latestAvailableDate =
         lastPortfolioDate && lastIhsgDate
            ? (lastPortfolioDate >= lastIhsgDate ? lastPortfolioDate : lastIhsgDate)
            : lastPortfolioDate || lastIhsgDate;
      const effectiveEnd =
         latestAvailableDate && latestAvailableDate <= now ? latestAvailableDate : now;

      if (!effectiveStart || !effectiveEnd || effectiveStart > effectiveEnd) return [];

      const allDates = buildDailyDateRange(effectiveStart, effectiveEnd);

      let portfolioIndex = 0;
      let ihsgIndex = 0;
      let currentPortfolioValue: number | null = initialCapitalForMarket;
      let currentIhsgValue: number | null = null;
      let basePortfolioValue: number | null = null;
      let baseIhsgValue: number | null = null;

      return allDates
         .map((date) => {
            while (
               portfolioIndex < portfolioSeries.length &&
               rawPortfolioSeries[portfolioIndex].date <= date
            ) {
               currentPortfolioValue = rawPortfolioSeries[portfolioIndex].value;
               portfolioIndex += 1;
            }

            while (ihsgIndex < ihsgSeries.length && ihsgSeries[ihsgIndex].date <= date) {
               currentIhsgValue = ihsgSeries[ihsgIndex].value;
               ihsgIndex += 1;
            }

            if (currentPortfolioValue == null) return null;
            if (basePortfolioValue == null) basePortfolioValue = currentPortfolioValue;
            if (currentIhsgValue != null && baseIhsgValue == null) baseIhsgValue = currentIhsgValue;
            if (!basePortfolioValue) return null;

            return {
               date,
               label: new Intl.DateTimeFormat("id-ID", {
                  day: "numeric",
                  month: "short",
               }).format(parseLocalDate(date)!),
               portfolioReturn: ((currentPortfolioValue / basePortfolioValue) - 1) * 100,
               ihsgReturn:
                  currentIhsgValue != null && baseIhsgValue
                     ? ((currentIhsgValue / baseIhsgValue) - 1) * 100
                     : null,
            };
         })
         .filter((point): point is PerformanceChartPoint => point !== null);
   }, [apiDashboard, equityCurve, ihsgTrendData, initialCapitalForMarket, now, performanceRangeKey]);

   const performanceSummary = useMemo(() => {
      if (performanceChartData.length === 0) return null;
      const lastPoint = performanceChartData[performanceChartData.length - 1];
      return {
         portfolioReturn: lastPoint.portfolioReturn,
         ihsgReturn: lastPoint.ihsgReturn,
      };
   }, [performanceChartData]);

   useEffect(() => {
      if (!selectedCalendarDate) return;
      const selectedDate = parseLocalDate(selectedCalendarDate);
      if (
         !selectedDate ||
         selectedDate.getFullYear() !== calendarMonth.getFullYear() ||
         selectedDate.getMonth() !== calendarMonth.getMonth()
      ) {
         setSelectedCalendarDate(null);
      }
   }, [calendarMonth, selectedCalendarDate]);

   const isCustomRangeSelected = selectedRangeKey === "custom";
   const achievementsList = (apiDashboard?.achievements || achievements) as DashboardAchievement[];
   const resolvedStats = apiDashboard?.stats || stats;
   const resolvedBalance = apiDashboard?.balance || balance;
   const resolvedInsights = (apiDashboard?.insights || dashboardInsights) as DashboardInsightItem[];

   if (trades.length === 0) {
      return (
         <div className="empty-state">
            <div className="empty-state-icon dashboard-empty-icon">
               <LayoutDashboard size={48} />
            </div>
            <div className="empty-state-title">Selamat Datang di Jurnal Saham</div>
            <div className="empty-state-desc">
               Mulai catat transaksi trading Anda untuk melihat dashboard performa di sini.
            </div>
            <Link to="/trades/new" className="btn btn-primary btn-lg dashboard-empty-cta">
               Catat Transaksi Pertama
            </Link>
         </div>
      );
   }

   return (
      <div>
         <MarketTabBar activeTab={activeMarketTab} onChange={setActiveMarketTab} showAll />
         {filteredTrades.length === 0 ? (
            <div className="empty-state dashboard-market-empty-state">
               <div className="empty-state-icon dashboard-empty-icon">
                  <LayoutDashboard size={48} />
               </div>
               <div className="empty-state-title">
                  Belum ada transaksi di {activeMarketTab === "ALL" ? "Pasar Indonesia maupun Amerika" : isUS ? "Pasar Amerika" : "Pasar Indonesia"}
               </div>
               <div className="empty-state-desc">
                  Catat transaksi pertama Anda untuk mulai memonitor performa.
               </div>
               <Link to="/trades/new" className="btn btn-primary dashboard-empty-cta">
                  Catat Transaksi Baru
               </Link>
            </div>
         ) : (
            <>
               <div className="bento-grid">
                  <div className="bento-col-6">
                     <StatCard
                        icon={Wallet}
                        label="Total Portfolio (Equity)"
                        value={formatMoney(resolvedBalance.realizedEquity)}
                        subValue={`Modal Aktif: ${formatMoney(resolvedBalance.totalCapital)}`}
                        bgColor="var(--accent-blue-dim)"
                        valueStyle={blurStyle}
                     />
                  </div>
                  <div className="bento-col-3">
                     <StatCard
                        icon={Wallet}
                        label="Trading Balance"
                        value={formatMoney(tradingBalance)}
                        subValue={`Investasi + Floating P/L`}
                        bgColor="var(--accent-blue-dim)"
                        valueStyle={blurStyle}
                     />
                  </div>
                  <div className="bento-col-3">
                     <StatCard
                        icon={Target}
                        label="Win Rate"
                        value={`${resolvedStats.winRate.toFixed(1)}%`}
                        subValue={`${resolvedStats.winCount}W / ${resolvedStats.lossCount}L`}
                        colorClass={resolvedStats.winRate >= 50 ? "text-profit" : "text-loss"}
                        bgColor="var(--accent-purple-dim)"
                     />
                  </div>
                  <div className="bento-col-3">
                     <StatCard
                        icon={Activity}
                        label="Buying Power"
                        value={formatMoney(resolvedBalance.buyingPower)}
                        subValue={`Posisi Terbuka: ${resolvedBalance.openPositionsCount}`}
                        colorClass="text-profit"
                        bgColor="rgba(16, 185, 129, 0.1)"
                        valueStyle={blurStyle}
                     />
                  </div>
                  <div className="bento-col-3">
                     <StatCard
                        icon={totalFloating >= 0 ? Layers : TrendingDown}
                        label="Total Floating P/L"
                        value={formatMoney(totalFloating)}
                        subValue={
                           resolvedBalance.investedAmount > 0
                              ? formatPercent((totalFloating / resolvedBalance.investedAmount) * 100)
                              : "0%"
                        }
                        colorClass={totalFloating >= 0 ? "text-profit" : "text-loss"}
                        bgColor={
                           totalFloating >= 0 ? "var(--accent-green-dim)" : "var(--accent-red-dim)"
                        }
                        valueStyle={blurStyle}
                     />
                  </div>
                  <div className="bento-col-3">
                     <StatCard
                        icon={resolvedStats.totalPnL >= 0 ? TrendingUp : TrendingDown}
                        label="Total Realized P/L"
                        value={formatMoney(resolvedStats.totalPnL)}
                        subValue={
                           resolvedBalance.totalCapital > 0
                              ? formatPercent((resolvedStats.totalPnL / resolvedBalance.totalCapital) * 100)
                              : "0%"
                        }
                        colorClass={resolvedStats.totalPnL >= 0 ? "text-profit" : "text-loss"}
                        bgColor={
                           resolvedStats.totalPnL >= 0
                              ? "var(--accent-green-dim)"
                              : "var(--accent-red-dim)"
                        }
                        valueStyle={blurStyle}
                     />
                  </div>
                  <div className="bento-col-3">
                     <StatCard
                        icon={FileText}
                        label="Total Transaksi"
                        value={formatNumber(resolvedStats.totalTrades)}
                        subValue={`${openTrades.length} posisi terbuka`}
                        bgColor="var(--accent-yellow-dim)"
                     />
                  </div>
               </div>

               <DashboardInsightsSection
                  dashboardInsights={resolvedInsights}
                  formatRupiah={formatRupiah}
               />

               <DashboardAchievementsSection
                  achievements={achievementsList}
                  marketLabel={isUS ? "US" : "ID"}
               />

               <Suspense fallback={
                  <div className="bento-grid dashboard-charts-grid" style={{ minHeight: 350 }}>
                     <div className="bento-card bento-col-8" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                        Memuat grafik return...
                     </div>
                     <div className="bento-card bento-col-4" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                        Memuat kalender...
                     </div>
                  </div>
               }>
                  <div className="bento-grid dashboard-charts-grid">
                     <DashboardPerformanceSection
                        formatPercent={formatPercent}
                        isLoadingIhsg={isLoadingIhsg}
                        performanceChartData={performanceChartData}
                        performanceRangeKey={performanceRangeKey}
                        performanceSummary={performanceSummary}
                        setPerformanceRangeKey={setPerformanceRangeKey}
                        showIhsgUnavailableNote={ihsgTrendData.length === 0 && !isLoadingIhsg}
                     />

                     <DashboardCalendarSection
                        calendarDays={calendarDays}
                        calendarMonth={calendarMonth}
                        calendarYearOptions={calendarYearOptions}
                        formatDate={formatDate}
                        formatMoney={formatMoney}
                        selectedCalendarDate={selectedCalendarDate}
                        selectedDateSummary={selectedDateSummary}
                        selectedDateTrades={selectedDateTrades}
                        selectedDateTradesPreview={selectedDateTradesPreview}
                        setCalendarMonth={setCalendarMonth}
                        setSelectedCalendarDate={setSelectedCalendarDate}
                     />
                  </div>
               </Suspense>

               <Suspense fallback={
                  <div className="bento-grid dashboard-profit-grid" style={{ minHeight: 350 }}>
                     <div className="bento-card bento-col-8" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                        Memuat grafik profit/loss...
                     </div>
                     <div className="bento-card bento-col-4" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                        Memuat IHSG...
                     </div>
                  </div>
               }>
                  <div className="bento-grid dashboard-profit-grid">
                     <DashboardProfitLossSection
                        customEndDate={customEndDate}
                        customStartDate={customStartDate}
                        formatMoney={formatMoney}
                        formatPercent={formatPercent}
                        isCustomRangeSelected={isCustomRangeSelected}
                        isUS={isUS}
                        profitLossChartData={profitLossChartData}
                        profitLossRangeKey={profitLossRangeKey}
                        profitLossSummary={profitLossSummary}
                        rangeSummaries={rangeSummaries}
                        selectedRangeKey={selectedRangeKey}
                        setCustomEndDate={setCustomEndDate}
                        setCustomStartDate={setCustomStartDate}
                        setProfitLossRangeKey={setProfitLossRangeKey}
                        setSelectedRangeKey={setSelectedRangeKey}
                     />

                     <DashboardIhsgOverviewCard
                        blurStyle={blurStyle}
                        formatNumber={formatNumber}
                        formatPercent={formatPercent}
                        ihsgLatestCandle={ihsgLatestCandle}
                        ihsgMetrics={ihsgMetrics}
                        ihsgOverviewData={ihsgOverviewData}
                        ihsgPreviousClose={ihsgPreviousClose}
                        ihsgQuote={ihsgQuote}
                        isLoadingIhsg={isLoadingIhsg}
                        parseLocalDate={parseLocalDate}
                     />
                  </div>
               </Suspense>

               <DashboardRecentTradesTable
                  formatDate={formatDate}
                  formatMoney={formatMoney}
                  formatPercent={formatPercent}
                  recentSortConfig={recentSortConfig}
                  requestRecentSort={requestRecentSort}
                  sortedRecentTrades={sortedRecentTrades}
               />
            </>
         )}
      </div>
   );
}
