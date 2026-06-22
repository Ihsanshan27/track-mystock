import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "@/modules/shared/context/DataContext";
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
   formatUSD,
   formatDate,
   formatNumber,
} from "@/modules/shared/utils/formatters";
import {
   LineChart,
   Line,
   BarChart,
   Bar,
   AreaChart,
   Area,
   XAxis,
   YAxis,
   Tooltip,
   ResponsiveContainer,
   CartesianGrid,
   Cell,
   ReferenceLine,
} from "recharts";
import * as Icons from "lucide-react";
import StatCard from "@/modules/shared/components/StatCard";
import ChartTooltip from "@/modules/shared/components/ChartTooltip";
import MarketTabBar from "@/modules/shared/components/MarketTabBar";
import SortableTableHeader from "@/modules/shared/components/SortableTableHeader";
import { usePrivacyStyle } from "@/modules/shared/hooks/usePrivacyStyle";
import { useMarketFormatter } from "@/modules/shared/hooks/useMarketFormatter";
import { useOpenPositionMetrics } from "@/modules/shared/hooks/useOpenPositionMetrics";
import { useTableSort } from "@/modules/shared/hooks/useTableSort";
import { fetchQuote, fetchStockOHLCV } from "@/modules/shared/services/yahooFinanceService";

type RangeKey = "today" | "mtd" | "ytd" | "last7d" | "last30d" | "last90d" | "custom" | "all";
type PerformanceRangeKey = "1w" | "1m" | "3m" | "ytd" | "1y" | "all";

function parseLocalDate(dateString?: string | null) {
   if (!dateString) return null;
   const [year, month, day] = dateString.split("-").map(Number);
   return new Date(year, (month || 1) - 1, day || 1);
}

function isSameDay(left: Date, right: Date) {
   return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
   );
}

function startOfDay(date: Date) {
   return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateKey(date: Date) {
   return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildRangeLabel(startDate?: string, endDate?: string) {
   if (startDate && endDate) {
      return startDate === endDate
         ? formatDate(startDate)
         : `${formatDate(startDate)} - ${formatDate(endDate)}`;
   }
   if (startDate) return `Dari ${formatDate(startDate)}`;
   if (endDate) return `Sampai ${formatDate(endDate)}`;
   return "Semua Tanggal";
}

function formatMonthKey(monthKey: string) {
   const [year, month] = monthKey.split("-").map(Number);
   return new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(
      new Date(year, month - 1, 1),
   );
}

function subtractDays(date: Date, days: number) {
   const next = new Date(date);
   next.setDate(next.getDate() - days);
   return next;
}

function getPerformanceRangeStart(rangeKey: PerformanceRangeKey, now: Date) {
   switch (rangeKey) {
      case "1w":
         return subtractDays(now, 6);
      case "1m":
         return subtractDays(now, 29);
      case "3m":
         return subtractDays(now, 89);
      case "ytd":
         return new Date(now.getFullYear(), 0, 1);
      case "1y":
         return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      case "all":
      default:
         return null;
   }
}

function buildDailyDateRange(startDate: Date, endDate: Date) {
   const dates: string[] = [];
   const cursor = new Date(startDate);
   while (cursor <= endDate) {
      dates.push(formatDateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
   }
   return dates;
}

function isClosedTrade(trade: any) {
   return trade?.dateSell && trade?.sellPrice != null;
}

export default function DashboardPage() {
   const { trades, cashflows, dividends, settings, marketPrices } = useData();
   const [activeMarketTab, setActiveMarketTab] = useState<"ID" | "US" | "ALL">("ID");
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
   const [ihsgTrendData, setIhsgTrendData] = useState<any[]>([]);
   const [ihsgQuote, setIhsgQuote] = useState<any>(null);
   const [isLoadingIhsg, setIsLoadingIhsg] = useState(false);
   const [calendarMonth, setCalendarMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
   const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
   const calendarYearOptions = useMemo(() => {
      const currentYear = now.getFullYear();
      return Array.from({ length: 12 }, (_, index) => currentYear - 10 + index);
   }, [now]);

   const usdToIdrRate = settings.usdToIdrRate ?? 16200;

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
   const dashboardInsights = useMemo(
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

   const allIndonesianTrades = useMemo(
      () => trades.filter((trade) => trade.market !== "US"),
      [trades],
   );
   const allUsTrades = useMemo(() => trades.filter((trade) => trade.market === "US"), [trades]);
   const allIndonesianCashflows = useMemo(
      () => cashflows.filter((cashflow) => cashflow.market !== "US"),
      [cashflows],
   );
   const allUsCashflows = useMemo(
      () => cashflows.filter((cashflow) => cashflow.market === "US"),
      [cashflows],
   );
   const allIndonesianDividends = useMemo(
      () => dividends.filter((dividend) => dividend.market !== "US"),
      [dividends],
   );
   const allUsDividends = useMemo(
      () => dividends.filter((dividend) => dividend.market === "US"),
      [dividends],
   );

   const indonesianMarketBalance = useMemo(
      () =>
         calculatePortfolioBalance(
            allIndonesianTrades,
            allIndonesianCashflows,
            allIndonesianDividends,
            settings.initialCapital,
         ),
      [
         allIndonesianTrades,
         allIndonesianCashflows,
         allIndonesianDividends,
         settings.initialCapital,
      ],
   );
   const usMarketBalance = useMemo(
      () =>
         calculatePortfolioBalance(
            allUsTrades,
            allUsCashflows,
            allUsDividends,
            settings.initialCapitalUS ?? 1000,
         ),
      [allUsTrades, allUsCashflows, allUsDividends, settings.initialCapitalUS],
   );

   const totalCombinedEquityInIdr =
      indonesianMarketBalance.realizedEquity + usMarketBalance.realizedEquity * usdToIdrRate;

   const hasUsAssets = useMemo(() => {
      return (
         trades.some((trade) => trade.market === "US") ||
         cashflows.some((cashflow) => cashflow.market === "US") ||
         dividends.some((dividend) => dividend.market === "US")
      );
   }, [trades, cashflows, dividends]);

   const convertedMarketPrices = useMemo(() => {
      if (activeMarketTab !== "ALL") return marketPrices;
      const converted: Record<string, number> = {};
      for (const [code, price] of Object.entries(marketPrices || {})) {
         const isUsStock = trades.some((t) => t.stockCode === code && t.market === "US");
         converted[code] = isUsStock ? (price as number) * usdToIdrRate : (price as number);
      }
      return converted;
   }, [marketPrices, activeMarketTab, trades, usdToIdrRate]);

   const { openTrades, totalFloating, totalInvested, tradingBalance } = useOpenPositionMetrics(
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
   } = useTableSort(recentTrades, {
      initialKey: "dateSell",
      initialDirection: "desc",
      getValue: (
         trade: any,
         key: "stockCode" | "dateSell" | "buyPrice" | "sellPrice" | "lots" | "pnl" | "pnlPercent",
      ) => {
         if (key === "pnl") return calculateTradePnL(trade).pnl;
         if (key === "pnlPercent") return calculateTradePnL(trade).pnlPercent;
         return trade[key] || "";
      },
      tieBreaker: (a: any, b: any) =>
         (parseLocalDate(b.dateSell)?.getTime() || 0) -
         (parseLocalDate(a.dateSell)?.getTime() || 0),
   });

   const calendarDays = useMemo(() => {
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

   const closedTrades = useMemo(() =>
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

   const rangeSummaries = useMemo(() => {
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
            label: `Custom Range (${buildRangeLabel(customStartDate, customEndDate)})`,
            matches: (sellDate) => {
               if (normalizedCustomStart && sellDate < normalizedCustomStart) return false;
               if (normalizedCustomEnd && sellDate > normalizedCustomEnd) return false;
               return true;
            },
         },
         { key: "all", label: "All Time", matches: () => true },
      ];

      return rangeMap.map((range) => {
         const items = closedTrades.filter((trade) => range.matches(trade.sellDateObj));
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
   }, [closedTrades, customEndDate, customStartDate, now]);

   const selectedRangeSummary = useMemo(
      () => rangeSummaries.find((range) => range.key === selectedRangeKey) || rangeSummaries[0] || null,
      [rangeSummaries, selectedRangeKey],
   );

   const selectedRangeTrades = useMemo(() => {
      if (!selectedRangeSummary) return closedTrades;
      return closedTrades.filter((trade) => selectedRangeSummary.matches(trade.sellDateObj));
   }, [closedTrades, selectedRangeSummary]);

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

   const profitLossRangeTrades = useMemo(() => {
      const rangeStart = getPerformanceRangeStart(profitLossRangeKey, now);
      if (!rangeStart) return closedTrades;
      return closedTrades.filter((trade) => trade.sellDateObj >= rangeStart && trade.sellDateObj <= now);
   }, [closedTrades, now, profitLossRangeKey]);

   const profitLossSummary = useMemo(() => {
      const realized = profitLossRangeTrades.reduce((sum, trade) => sum + trade.pnl, 0);
      const invested = profitLossRangeTrades.reduce((sum, trade) => sum + trade.totalBuy, 0);
      const wins = profitLossRangeTrades.filter((trade) => trade.pnl > 0).length;
      return {
         realized,
         invested,
         count: profitLossRangeTrades.length,
         winRate: profitLossRangeTrades.length > 0 ? (wins / profitLossRangeTrades.length) * 100 : 0,
      };
   }, [profitLossRangeTrades]);

   const profitLossChartData = useMemo(() => {
      if (profitLossRangeTrades.length === 0) return [];

      const grouped = new Map<
         string,
         { key: string; label: string; pnl: number; tradeCount: number }
      >();

      profitLossRangeTrades.forEach((trade) => {
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
   }, [profitLossRangeTrades]);

   const performanceChartData = useMemo(() => {
      if (equityCurve.length === 0 && ihsgTrendData.length === 0) return [];

      const rangeStart = getPerformanceRangeStart(performanceRangeKey, now);
      const portfolioSeries = equityCurve
         .map((point: any) => ({
            date: point.date,
            value: Number(point.equity) || 0,
         }))
         .sort((a, b) => a.date.localeCompare(b.date));
      const ihsgSeries = ihsgTrendData
         .map((point) => ({
            date: point.date,
            value: Number(point.close) || 0,
         }))
         .filter((point) => point.value > 0)
         .sort((a, b) => a.date.localeCompare(b.date));

      const firstPortfolioDate = portfolioSeries[0]?.date
         ? parseLocalDate(portfolioSeries[0].date)
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
      const lastPortfolioDate = portfolioSeries[portfolioSeries.length - 1]?.date
         ? parseLocalDate(portfolioSeries[portfolioSeries.length - 1].date)
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
               portfolioSeries[portfolioIndex].date <= date
            ) {
               currentPortfolioValue = portfolioSeries[portfolioIndex].value;
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
         .filter(Boolean) as Array<{
         date: string;
         label: string;
         portfolioReturn: number;
         ihsgReturn: number | null;
      }>;
   }, [equityCurve, ihsgTrendData, initialCapitalForMarket, now, performanceRangeKey]);

   const performanceSummary = useMemo(() => {
      if (performanceChartData.length === 0) return null;
      const lastPoint = performanceChartData[performanceChartData.length - 1];
      return {
         portfolioReturn: lastPoint.portfolioReturn,
         ihsgReturn: lastPoint.ihsgReturn,
      };
   }, [performanceChartData]);

   const ihsgOverviewData = useMemo(() => ihsgTrendData.slice(-30), [ihsgTrendData]);

   const ihsgLatestCandle = useMemo(
      () => ihsgOverviewData[ihsgOverviewData.length - 1] || null,
      [ihsgOverviewData],
   );

   const ihsgPreviousClose = useMemo(
      () => ihsgOverviewData[ihsgOverviewData.length - 2]?.close ?? ihsgLatestCandle?.close ?? null,
      [ihsgLatestCandle, ihsgOverviewData],
   );

   const ihsgMetrics = useMemo(() => {
      if (ihsgOverviewData.length === 0) return null;
      const closes = ihsgOverviewData.map((item) => Number(item.close) || 0).filter(Boolean);
      if (closes.length === 0) return null;
      const last = closes[closes.length - 1];
      const first = closes[0];
      const high = Math.max(...closes);
      const low = Math.min(...closes);
      const change = last - first;
      const changePct = first > 0 ? (change / first) * 100 : 0;
      return { last, first, high, low, change, changePct };
   }, [ihsgOverviewData]);

   const ihsgPeriodSnapshots = useMemo(() => {
      const periodConfig: Array<{ key: PerformanceRangeKey; label: string }> = [
         { key: "1w", label: "1W" },
         { key: "1m", label: "1M" },
         { key: "3m", label: "3M" },
         { key: "ytd", label: "YTD" },
      ];

      return periodConfig.map((period) => {
         const startDate = getPerformanceRangeStart(period.key, now);
         const items = ihsgTrendData.filter((item) => {
            if (!startDate) return true;
            const dateObj = parseLocalDate(item.date);
            return !!dateObj && dateObj >= startDate && dateObj <= now;
         });

         if (items.length < 2) {
            return {
               ...period,
               change: null,
               changePct: null,
               high: null,
               low: null,
            };
         }

         const first = Number(items[0].close) || 0;
         const last = Number(items[items.length - 1].close) || 0;
         const closes = items.map((item) => Number(item.close) || 0).filter(Boolean);

         return {
            ...period,
            change: last - first,
            changePct: first > 0 ? ((last / first) - 1) * 100 : null,
            high: closes.length ? Math.max(...closes) : null,
            low: closes.length ? Math.min(...closes) : null,
         };
      });
   }, [ihsgTrendData, now]);

   const renderPerformanceTooltip = ({ active, payload, label }: any) => {
      if (!active || !payload?.length) return null;
      return (
         <div className="chart-tooltip-card">
            <div className="chart-tooltip-label">{label}</div>
            {payload.map((item: any) => (
               <div key={item.dataKey} className="chart-tooltip-row">
                  <div className="chart-tooltip-series">
                     <span
                        className={`chart-tooltip-dot ${item.dataKey === "portfolioReturn" ? "chart-tooltip-dot-portfolio" : "chart-tooltip-dot-ihsg"}`}
                     />
                     <span className="chart-tooltip-series-label">
                        {item.dataKey === "portfolioReturn" ? "Portfolio" : "IHSG"}
                     </span>
                  </div>
                  <strong className={Number(item.value) >= 0 ? "text-profit" : "text-loss"}>
                     {formatPercent(Number(item.value))}
                  </strong>
               </div>
            ))}
         </div>
      );
   };

   useEffect(() => {
      let isMounted = true;

      const loadIhsgData = async () => {
         setIsLoadingIhsg(true);
         try {
            const loadTrendWithFallback = async () => {
               const fallbackRanges = ["5y", "1y", "6mo", "3mo", "1mo"];
               for (const range of fallbackRanges) {
                  try {
                     const data = await fetchStockOHLCV("^JKSE", range);
                     if (data?.length) return data;
                  } catch (error) {
                     continue;
                  }
               }
               return [];
            };

            const [trend, quote] = await Promise.all([
               loadTrendWithFallback(),
               fetchQuote("^JKSE"),
            ]);
            if (!isMounted) return;
            setIhsgTrendData(trend || []);
            setIhsgQuote(quote || null);
         } catch (error) {
            if (!isMounted) return;
            setIhsgTrendData([]);
            setIhsgQuote(null);
         } finally {
            if (isMounted) setIsLoadingIhsg(false);
         }
      };

      loadIhsgData();

      return () => {
         isMounted = false;
      };
   }, []);

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

   if (trades.length === 0) {
      return (
         <div className="empty-state">
            <div className="empty-state-icon dashboard-empty-icon">
               <Icons.LayoutDashboard size={48} />
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
                  <Icons.LayoutDashboard size={48} />
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
                        icon={Icons.Wallet}
                        label="Total Portfolio (Equity)"
                        value={formatMoney(balance.realizedEquity)}
                        subValue={`Modal Aktif: ${formatMoney(balance.totalCapital)}`}
                        bgColor="var(--accent-blue-dim)"
                        valueStyle={blurStyle}
                     />
                  </div>
                  <div className="bento-col-3">
                     <StatCard
                        icon={Icons.Wallet}
                        label="Trading Balance"
                        value={formatMoney(tradingBalance)}
                        subValue={`Investasi + Floating P/L`}
                        bgColor="var(--accent-blue-dim)"
                        valueStyle={blurStyle}
                     />
                  </div>
                  <div className="bento-col-3">
                     <StatCard
                        icon={Icons.Target}
                        label="Win Rate"
                        value={`${stats.winRate.toFixed(1)}%`}
                        subValue={`${stats.winCount}W / ${stats.lossCount}L`}
                        colorClass={stats.winRate >= 50 ? "text-profit" : "text-loss"}
                        bgColor="var(--accent-purple-dim)"
                     />
                  </div>
                  <div className="bento-col-3">
                     <StatCard
                        icon={Icons.Activity}
                        label="Buying Power"
                        value={formatMoney(balance.buyingPower)}
                        subValue={`Posisi Terbuka: ${balance.openPositionsCount}`}
                        colorClass="text-profit"
                        bgColor="rgba(16, 185, 129, 0.1)"
                        valueStyle={blurStyle}
                     />
                  </div>
                  <div className="bento-col-3">
                     <StatCard
                        icon={totalFloating >= 0 ? Icons.Layers : Icons.TrendingDown}
                        label="Total Floating P/L"
                        value={formatMoney(totalFloating)}
                        subValue={
                           balance.investedAmount > 0
                              ? formatPercent((totalFloating / balance.investedAmount) * 100)
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
                        icon={stats.totalPnL >= 0 ? Icons.TrendingUp : Icons.TrendingDown}
                        label="Total Realized P/L"
                        value={formatMoney(stats.totalPnL)}
                        subValue={
                           balance.totalCapital > 0
                              ? formatPercent((stats.totalPnL / balance.totalCapital) * 100)
                              : "0%"
                        }
                        colorClass={stats.totalPnL >= 0 ? "text-profit" : "text-loss"}
                        bgColor={
                           stats.totalPnL >= 0
                              ? "var(--accent-green-dim)"
                              : "var(--accent-red-dim)"
                        }
                        valueStyle={blurStyle}
                     />
                  </div>
                  <div className="bento-col-3">
                     <StatCard
                        icon={Icons.FileText}
                        label="Total Transaksi"
                        value={formatNumber(stats.totalTrades)}
                        subValue={`${openTrades.length} posisi terbuka`}
                        bgColor="var(--accent-yellow-dim)"
                     />
                  </div>
               </div>

               <div className="card" style={{ marginTop: 24, marginBottom: 24 }}>
                  <div
                     className="card-header"
                     style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                     <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Icons.Sparkles size={16} style={{ color: "var(--accent-yellow)" }} />
                        Insight Trading
                     </h3>
                     <Link to="/analytics" className="btn btn-secondary btn-sm">
                        Lihat Analytics
                     </Link>
                  </div>
                  <div className="card-body">
                     {dashboardInsights.length > 0 ? (
                        <div
                           style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                              gap: 14,
                           }}
                        >
                           {dashboardInsights.slice(0, 3).map((insight) => {
                              const isPositive = insight.tone === "positive";
                              const isWarning = insight.tone === "warning";
                              const value =
                                 insight.metricKind === "percent"
                                    ? `${Number(insight.metricValue).toFixed(1)}%`
                                    : insight.metricKind === "days"
                                    ? `${Number(insight.metricValue).toFixed(1)} hari`
                                    : formatRupiah(Number(insight.metricValue) || 0);

                              return (
                                 <div
                                    key={insight.id}
                                    className="bento-card"
                                    style={{
                                       padding: "14px 16px",
                                       border: isPositive
                                          ? "1px solid rgba(16, 185, 129, 0.22)"
                                          : isWarning
                                          ? "1px solid rgba(244, 63, 94, 0.22)"
                                          : "1px solid var(--border-color)",
                                       background: isPositive
                                          ? "linear-gradient(180deg, rgba(16, 185, 129, 0.08), transparent)"
                                          : isWarning
                                          ? "linear-gradient(180deg, rgba(244, 63, 94, 0.08), transparent)"
                                          : "linear-gradient(180deg, rgba(59, 130, 246, 0.06), transparent)",
                                    }}
                                 >
                                    <div
                                       style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          gap: 8,
                                          marginBottom: 8,
                                       }}
                                    >
                                       <strong style={{ fontSize: "0.9rem" }}>{insight.title}</strong>
                                       <span
                                          style={{
                                             fontSize: "0.68rem",
                                             color: "var(--text-muted)",
                                             textTransform: "uppercase",
                                             letterSpacing: "0.05em",
                                          }}
                                       >
                                          {insight.category}
                                       </span>
                                    </div>
                                    <div
                                       className={`font-mono ${isPositive ? "text-profit" : isWarning ? "text-loss" : ""}`}
                                       style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 6 }}
                                    >
                                       {value}
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
                                    <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                                       {insight.summary}
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     ) : (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                           Belum cukup data closed trade untuk menampilkan insight trading.
                        </div>
                     )}
                  </div>
               </div>

               <div className="dashboard-achievements-section">
                  <h3 className="dashboard-achievements-title">
                     <Icons.Award size={18} className="dashboard-achievements-icon" />
                     Pencapaian Anda ({isUS ? "US" : "ID"})
                  </h3>
                  <div className="dashboard-achievements-list">
                     {achievements.map((achievement) => {
                        const AchievementIcon = (Icons as any)[achievement.icon] || Icons.Award;
                        return (
                           <div
                              key={achievement.id}
                              className={`bento-card dashboard-achievement-card ${achievement.unlocked ? "dashboard-achievement-card-unlocked" : "dashboard-achievement-card-locked"}`}
                           >
                              <div className="dashboard-achievement-header">
                                 <div
                                    className={`dashboard-achievement-badge ${achievement.unlocked ? "dashboard-achievement-badge-unlocked" : "dashboard-achievement-badge-locked"}`}
                                 >
                                    <AchievementIcon size={20} />
                                 </div>
                                 <div>
                                    {achievement.unlocked ? (
                                       <Icons.Unlock
                                          size={14}
                                          className="dashboard-achievement-status-unlocked"
                                       />
                                    ) : (
                                       <Icons.Lock
                                          size={14}
                                          className="dashboard-achievement-status-locked"
                                       />
                                    )}
                                 </div>
                              </div>
                              <div className="dashboard-achievement-name">{achievement.name}</div>
                              <div className="dashboard-achievement-desc">{achievement.desc}</div>
                           </div>
                        );
                     })}
                  </div>
               </div>

               <div className="bento-grid dashboard-charts-grid">
                  <div className="bento-card bento-col-8">
                     <div className="dashboard-chart-header">
                        <div className="bento-card-title dashboard-chart-title">
                           <Icons.TrendingUp size={18} className="dashboard-chart-title-icon" />
                           <span>Cumulative Portfolio Return</span>
                        </div>
                     </div>
                     <div className="dashboard-performance-legend">
                        <div className="dashboard-performance-legend-card">
                           <div className="dashboard-performance-legend-label">
                              <span className="dashboard-performance-dot dashboard-performance-dot-portfolio"></span>
                              <span>Portfolio</span>
                           </div>
                           <strong
                              className={
                                 (performanceSummary?.portfolioReturn ?? 0) >= 0
                                    ? "text-profit"
                                    : "text-loss"
                              }
                           >
                              {performanceSummary
                                 ? formatPercent(performanceSummary.portfolioReturn)
                                 : "-"}
                           </strong>
                        </div>
                        <div className="dashboard-performance-legend-card">
                           <div className="dashboard-performance-legend-label">
                              <span className="dashboard-performance-dot dashboard-performance-dot-ihsg"></span>
                              <span>IHSG</span>
                           </div>
                           <strong
                              className={
                                 performanceSummary?.ihsgReturn == null
                                    ? ""
                                    : (performanceSummary.ihsgReturn ?? 0) >= 0
                                    ? "text-profit"
                                    : "text-loss"
                              }
                           >
                              {performanceSummary?.ihsgReturn != null
                                 ? formatPercent(performanceSummary.ihsgReturn)
                                 : "-"}
                           </strong>
                        </div>
                     </div>
                     <div className="dashboard-performance-chart-body">
                        {performanceChartData.length > 1 ? (
                           <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={performanceChartData}>
                                 <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="rgba(148,163,184,0.12)"
                                    vertical={false}
                                 />
                                 <ReferenceLine
                                    y={0}
                                    stroke="rgba(148,163,184,0.5)"
                                    strokeDasharray="4 4"
                                 />
                                 <XAxis
                                    dataKey="label"
                                    tick={{ fill: "#71717a", fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={28}
                                 />
                                 <YAxis
                                    orientation="right"
                                    tick={{ fill: "#71717a", fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => formatPercent(Number(value))}
                                 />
                                 <Tooltip
                                    content={renderPerformanceTooltip}
                                    labelFormatter={(_, payload) => payload?.[0]?.payload?.date}
                                 />
                                 <Line
                                    type="monotone"
                                    dataKey="portfolioReturn"
                                    stroke="#00c48c"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, fill: "#00c48c" }}
                                 />
                                 <Line
                                    type="monotone"
                                    dataKey="ihsgReturn"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, fill: "#8b5cf6" }}
                                    connectNulls={false}
                                 />
                              </LineChart>
                           </ResponsiveContainer>
                        ) : (
                           <div className="empty-state dashboard-chart-empty-state">
                              <div className="dashboard-chart-empty-text">
                                 Butuh data portfolio dan IHSG yang cukup untuk menampilkan grafik
                              </div>
                           </div>
                        )}
                     </div>
                     {ihsgTrendData.length === 0 && !isLoadingIhsg && (
                        <div className="dashboard-performance-note">
                           Grafik portfolio tetap ditampilkan, tapi data benchmark IHSG belum berhasil dimuat.
                        </div>
                     )}
                     <div className="dashboard-performance-range-tabs">
                        {[
                           ["1w", "1W"],
                           ["1m", "1M"],
                           ["3m", "3M"],
                           ["ytd", "YTD"],
                           ["1y", "1Y"],
                           ["all", "All"],
                        ].map(([key, label]) => (
                           <button
                              key={key}
                              type="button"
                              className={`dashboard-performance-range-btn ${performanceRangeKey === key ? "active" : ""}`}
                              onClick={() =>
                                 setPerformanceRangeKey(key as PerformanceRangeKey)
                              }
                           >
                              {label}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="bento-card bento-col-4">
                     <div className="dashboard-chart-header">
                        <div className="bento-card-title dashboard-chart-title">
                           <Icons.Calendar size={18} className="dashboard-chart-title-icon" />
                           <span>
                              Kalender Performa ({calendarMonth.toLocaleString("id-ID", { month: "short", year: "numeric" })})
                           </span>
                        </div>
                        <div className="dashboard-calendar-controls">
                           <button
                              type="button"
                              className="btn btn-secondary btn-sm dashboard-calendar-nav-btn"
                              aria-label="Bulan sebelumnya"
                              title="Bulan sebelumnya"
                              onClick={() =>
                                 setCalendarMonth(
                                    new Date(
                                       calendarMonth.getFullYear(),
                                       calendarMonth.getMonth() - 1,
                                       1,
                                    ),
                                 )
                              }
                           >
                              <Icons.ChevronLeft size={14} />
                           </button>
                           <label className="sr-only" htmlFor="dashboard-calendar-month">
                              Pilih bulan kalender performa
                           </label>
                           <select
                              id="dashboard-calendar-month"
                              className="form-select dashboard-calendar-month-input"
                              aria-label="Pilih bulan kalender performa"
                              title="Pilih bulan kalender performa"
                              value={String(calendarMonth.getMonth() + 1)}
                              onChange={(event) =>
                                 setCalendarMonth(
                                    new Date(
                                       calendarMonth.getFullYear(),
                                       Number(event.target.value) - 1,
                                       1,
                                    ),
                                 )
                              }
                           >
                              {Array.from({ length: 12 }, (_, index) => (
                                 <option key={index + 1} value={index + 1}>
                                    {new Intl.DateTimeFormat("id-ID", { month: "long" }).format(
                                       new Date(2026, index, 1),
                                    )}
                                 </option>
                              ))}
                           </select>
                           <label className="sr-only" htmlFor="dashboard-calendar-year">
                              Pilih tahun kalender performa
                           </label>
                           <select
                              id="dashboard-calendar-year"
                              className="form-select dashboard-calendar-year-input"
                              aria-label="Pilih tahun kalender performa"
                              title="Pilih tahun kalender performa"
                              value={calendarMonth.getFullYear()}
                              onChange={(event) =>
                                 setCalendarMonth(
                                    new Date(
                                       Number(event.target.value),
                                       calendarMonth.getMonth(),
                                       1,
                                    ),
                                 )
                              }
                           >
                              {calendarYearOptions.map((year) => (
                                 <option key={year} value={year}>
                                    {year}
                                 </option>
                              ))}
                           </select>
                           <button
                              type="button"
                              className="btn btn-secondary btn-sm dashboard-calendar-nav-btn"
                              aria-label="Bulan berikutnya"
                              title="Bulan berikutnya"
                              onClick={() =>
                                 setCalendarMonth(
                                    new Date(
                                       calendarMonth.getFullYear(),
                                       calendarMonth.getMonth() + 1,
                                       1,
                                    ),
                                 )
                              }
                           >
                              <Icons.ChevronRight size={14} />
                           </button>
                        </div>
                     </div>
                     <div className="dashboard-calendar-body">
                        <div className="dashboard-calendar-weekdays">
                           {["M", "S", "S", "R", "K", "J", "S"].map((dayLabel, dayLabelIndex) => (
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
                                 className={`heatmap-cell ${calendarCell ? (calendarCell.pnl > 0 ? "profit" : calendarCell.pnl < 0 ? "loss" : "neutral") : ""} ${calendarCell?.date === selectedCalendarDate ? "selected" : ""} ${calendarCell ? "is-clickable" : "is-empty"}`}
                                 title={
                                    calendarCell
                                       ? `${calendarCell.date}: ${formatMoney(calendarCell.pnl)}`
                                       : ""
                                 }
                                 aria-label={
                                    calendarCell
                                       ? `Tanggal ${formatDate(calendarCell.date)}, profit loss ${formatMoney(calendarCell.pnl)}`
                                       : "Tanggal kosong"
                                 }
                                 disabled={!calendarCell}
                                 onClick={() =>
                                    setSelectedCalendarDate((currentDate) =>
                                       currentDate === calendarCell?.date ? null : calendarCell?.date || null,
                                    )
                                 }
                              >
                                 {calendarCell?.day || ""}
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
                                    <div className="dashboard-calendar-detail-title">
                                       Ringkasan {formatDate(selectedDateSummary.date)}
                                    </div>
                                    <div className="dashboard-calendar-detail-subtitle">
                                       {selectedDateSummary.count} transaksi closed
                                    </div>
                                 </div>
                                 <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setSelectedCalendarDate(null)}
                                 >
                                    Tutup
                                 </button>
                              </div>
                              <div className="dashboard-calendar-detail-metrics">
                                 <div>
                                    Realized:{" "}
                                    <strong
                                       className={
                                          selectedDateSummary.realized >= 0
                                             ? "text-profit"
                                             : "text-loss"
                                       }
                                    >
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
                                             {trade.lots} {trade.assetType === 'mutual_fund' ? 'unit' : 'lot'} • Buy {formatMoney(trade.buyPrice)} • Sell{" "}
                                             {formatMoney(trade.sellPrice)}
                                          </div>
                                       </div>
                                       <div
                                          className={
                                             trade.pnl >= 0 ? "text-profit font-mono" : "text-loss font-mono"
                                          }
                                       >
                                          {formatMoney(trade.pnl)}
                                       </div>
                                    </div>
                                 ))}
                              </div>
                              {selectedDateTrades.length > selectedDateTradesPreview.length && (
                                 <div className="dashboard-calendar-detail-footnote">
                                    Menampilkan {selectedDateTradesPreview.length} dari{" "}
                                    {selectedDateTrades.length} transaksi.
                                 </div>
                              )}
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               <div className="bento-grid dashboard-profit-grid">
                  <div className="bento-card bento-col-8 dashboard-monthly-card">
                     <div className="dashboard-chart-header">
                        <div className="bento-card-title dashboard-chart-title">
                           <Icons.BarChart3 size={18} className="dashboard-chart-title-icon" />
                           <span>Profit/Loss</span>
                        </div>
                        <div className="dashboard-profit-filter-group">
                           <select
                              className="form-select"
                              aria-label="Pilih periode profit loss"
                              title="Pilih periode profit loss"
                              value={selectedRangeKey}
                              onChange={(event) =>
                                 setSelectedRangeKey(event.target.value as RangeKey)
                              }
                           >
                              {rangeSummaries.map((range) => (
                                 <option key={range.key} value={range.key}>
                                    {range.label}
                                 </option>
                              ))}
                           </select>
                           {isCustomRangeSelected && (
                              <>
                                 <input
                                    type="date"
                                    className="form-input"
                                    aria-label="Tanggal mulai custom profit loss"
                                    title="Tanggal mulai custom profit loss"
                                    value={customStartDate}
                                    onChange={(event) => setCustomStartDate(event.target.value)}
                                 />
                                 <input
                                    type="date"
                                    className="form-input"
                                    aria-label="Tanggal akhir custom profit loss"
                                    title="Tanggal akhir custom profit loss"
                                    value={customEndDate}
                                    onChange={(event) => setCustomEndDate(event.target.value)}
                                 />
                              </>
                           )}
                        </div>
                     </div>
                     <div className="dashboard-profit-summary">
                        <div>
                           Realized:{" "}
                           <strong
                              className={
                                 profitLossSummary.realized >= 0 ? "text-profit" : "text-loss"
                              }
                           >
                              {formatMoney(profitLossSummary.realized)}
                           </strong>
                        </div>
                        <div>Closed Trades: <strong>{profitLossSummary.count}</strong></div>
                        <div>
                           Return:{" "}
                           <strong
                              className={
                                 profitLossSummary.realized >= 0 ? "text-profit" : "text-loss"
                              }
                           >
                              {formatPercent(
                                 profitLossSummary.invested > 0
                                    ? (profitLossSummary.realized / profitLossSummary.invested) * 100
                                    : 0,
                              )}
                           </strong>
                        </div>
                        <div>Win Rate: <strong>{profitLossSummary.winRate.toFixed(1)}%</strong></div>
                     </div>
                     <div className="dashboard-monthly-chart-body">
                        {profitLossChartData.length > 0 ? (
                           <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={profitLossChartData}>
                                 <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="rgba(148,163,184,0.12)"
                                 />
                                 <XAxis
                                    dataKey="label"
                                    tick={{ fill: "#71717a", fontSize: 11 }}
                                    minTickGap={24}
                                 />
                                 <YAxis
                                    tick={{ fill: "#71717a", fontSize: 11 }}
                                    tickFormatter={(amount) =>
                                       isUS
                                          ? formatMoney(amount)
                                          : `${(amount / 1000000).toFixed(1)}Jt`
                                    }
                                 />
                                 <Tooltip content={<ChartTooltip formatValue={formatMoney} />} />
                                 <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                    {profitLossChartData.map((entry, entryIndex) => (
                                       <Cell
                                          key={entryIndex}
                                          fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"}
                                       />
                                    ))}
                                 </Bar>
                              </BarChart>
                           </ResponsiveContainer>
                        ) : (
                           <div className="empty-state dashboard-chart-empty-state">
                              <div className="dashboard-chart-empty-text">
                                 Tidak ada data profit/loss untuk periode ini.
                              </div>
                           </div>
                        )}
                     </div>
                     <div className="dashboard-performance-range-tabs dashboard-profit-range-tabs">
                        {[
                           ["1w", "1W"],
                           ["1m", "1M"],
                           ["3m", "3M"],
                           ["ytd", "YTD"],
                           ["1y", "1Y"],
                           ["all", "All"],
                        ].map(([key, label]) => (
                           <button
                              key={key}
                              type="button"
                              className={`dashboard-performance-range-btn ${profitLossRangeKey === key ? "active" : ""}`}
                              onClick={() => setProfitLossRangeKey(key as PerformanceRangeKey)}
                           >
                              {label}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="bento-card bento-col-4 dashboard-ihsg-card">
                     <div className="dashboard-ihsg-header">
                        <div className="dashboard-ihsg-heading">
                           <span className="dashboard-ihsg-symbol">IHSG</span>
                           <strong style={blurStyle}>
                              {ihsgQuote?.price ? formatNumber(ihsgQuote.price) : "-"}
                           </strong>
                           <span
                              className={
                                 (ihsgQuote?.changePct ?? ihsgMetrics?.changePct ?? 0) >= 0
                                    ? "text-profit"
                                    : "text-loss"
                              }
                           >
                              {ihsgMetrics
                                 ? `${ihsgMetrics.change >= 0 ? "+" : ""}${formatNumber(ihsgMetrics.change)} (${formatPercent(ihsgQuote?.changePct ?? ihsgMetrics.changePct ?? 0)})`
                                 : "-"}
                           </span>
                        </div>
                        <div className="dashboard-ihsg-subtitle">Benchmark overview</div>
                     </div>
                     <div className="dashboard-ihsg-chart">
                        {ihsgOverviewData.length > 0 ? (
                           <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={ihsgOverviewData}>
                                 <defs>
                                    <linearGradient id="ihsgAreaFill" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                                       <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                                    </linearGradient>
                                 </defs>
                                 <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="rgba(148,163,184,0.08)"
                                    vertical={false}
                                 />
                                 <ReferenceLine
                                    y={Number(ihsgPreviousClose) || Number(ihsgLatestCandle?.close) || 0}
                                    stroke="rgba(148,163,184,0.35)"
                                    strokeDasharray="4 4"
                                 />
                                 <XAxis
                                    dataKey="date"
                                    tick={{ fill: "#71717a", fontSize: 11 }}
                                    tickFormatter={(value) =>
                                       new Intl.DateTimeFormat("id-ID", {
                                          day: "numeric",
                                          month: "short",
                                       }).format(parseLocalDate(value)!)
                                    }
                                    axisLine={false}
                                    tickLine={false}
                                    minTickGap={28}
                                 />
                                 <YAxis
                                    orientation="right"
                                    tick={{ fill: "#71717a", fontSize: 11 }}
                                    tickFormatter={(value) => formatNumber(Number(value))}
                                    axisLine={false}
                                    tickLine={false}
                                    domain={["dataMin - 20", "dataMax + 20"]}
                                 />
                                 <Tooltip
                                    content={
                                       <ChartTooltip
                                          formatValue={(value) => formatNumber(Number(value))}
                                       />
                                    }
                                 />
                                 <Area
                                    type="monotone"
                                    dataKey="close"
                                    stroke="#ef4444"
                                    fill="url(#ihsgAreaFill)"
                                    strokeWidth={1.8}
                                    dot={false}
                                    activeDot={{ r: 4, fill: "#ef4444" }}
                                 />
                              </AreaChart>
                           </ResponsiveContainer>
                        ) : (
                           <div className="empty-state dashboard-chart-empty-state">
                              <div className="dashboard-chart-empty-text">
                                 {isLoadingIhsg ? "Memuat data IHSG..." : "Data IHSG belum tersedia."}
                              </div>
                           </div>
                        )}
                     </div>
                     <div className="dashboard-ihsg-stats-row">
                        <div className="dashboard-ihsg-stat">
                           <span>Open</span>
                           <strong className="text-profit" style={blurStyle}>
                              {ihsgLatestCandle?.open ? formatNumber(ihsgLatestCandle.open) : "-"}
                           </strong>
                        </div>
                        <div className="dashboard-ihsg-stat">
                           <span>High</span>
                           <strong className="text-profit" style={blurStyle}>
                              {ihsgLatestCandle?.high ? formatNumber(ihsgLatestCandle.high) : "-"}
                           </strong>
                        </div>
                        <div className="dashboard-ihsg-stat">
                           <span>Low</span>
                           <strong className="text-loss" style={blurStyle}>
                              {ihsgLatestCandle?.low ? formatNumber(ihsgLatestCandle.low) : "-"}
                           </strong>
                        </div>
                        <div className="dashboard-ihsg-stat">
                           <span>Close</span>
                           <strong style={blurStyle}>
                              {ihsgLatestCandle?.close ? formatNumber(ihsgLatestCandle.close) : "-"}
                           </strong>
                        </div>
                        <div className="dashboard-ihsg-stat">
                           <span>30D High</span>
                           <strong style={blurStyle}>
                              {ihsgMetrics ? formatNumber(ihsgMetrics.high) : "-"}
                           </strong>
                        </div>
                        <div className="dashboard-ihsg-stat">
                           <span>30D Low</span>
                           <strong style={blurStyle}>
                              {ihsgMetrics ? formatNumber(ihsgMetrics.low) : "-"}
                           </strong>
                        </div>
                     </div>
                  </div>
               </div>

               {recentTrades.length > 0 && (
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
                                       <td className="dashboard-table-secondary-text">
                                          {formatDate(trade.dateSell)}
                                       </td>
                                       <td className="font-mono">{formatMoney(trade.buyPrice)}</td>
                                       <td className="font-mono">
                                          {formatMoney(trade.sellPrice)}
                                       </td>
                                       <td className="font-mono">{trade.lots}</td>
                                       <td
                                          className={`${tradePerformance.pnl >= 0 ? "text-profit" : "text-loss"} font-mono`}
                                       >
                                          <strong>{formatMoney(tradePerformance.pnl)}</strong>
                                       </td>
                                       <td
                                          className={`${tradePerformance.pnlPercent >= 0 ? "text-profit" : "text-loss"} font-mono`}
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
               )}
            </>
         )}
      </div>
   );
}
