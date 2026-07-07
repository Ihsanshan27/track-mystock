import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toNumber } from '../common/prisma.utils';

type DashboardMarket = 'ID' | 'US' | 'ALL';
type RangeKey = 'today' | 'mtd' | 'ytd' | 'last7d' | 'last30d' | 'last90d' | 'custom' | 'all';
type PerformanceRangeKey = '1w' | '1m' | '3m' | 'ytd' | '1y' | 'all';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    ownerUserId: string,
    workspaceId: string | null,
    options?: {
      market?: DashboardMarket;
      usdToIdrRate?: number;
      initialCapital?: number;
      initialCapitalUS?: number;
      performanceRangeKey?: PerformanceRangeKey;
      profitLossRangeKey?: PerformanceRangeKey;
      customStartDate?: string;
      customEndDate?: string;
      calendarMonth?: string;
    },
  ) {
    const market = options?.market ?? 'ID';
    const usdToIdrRate = Number(options?.usdToIdrRate) > 0 ? Number(options?.usdToIdrRate) : 16200;
    const initialCapitalId = Number(options?.initialCapital) > 0 ? Number(options?.initialCapital) : 10000000;
    const initialCapitalUs = Number(options?.initialCapitalUS) > 0 ? Number(options?.initialCapitalUS) : 1000;
    const performanceRangeKey = options?.performanceRangeKey ?? 'ytd';
    const profitLossRangeKey = options?.profitLossRangeKey ?? '1m';
    const now = this.startOfDay(new Date());

    const [portfolios, rawTrades, rawCashflows, rawDividends] = await Promise.all([
      this.prisma.portfolio.count({ where: { ownerUserId, workspaceId } }),
      this.prisma.trade.findMany({
        where: { ownerUserId, workspaceId },
        include: {
          tags: {
            orderBy: { tag: 'asc' },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.cashflow.findMany({
        where: { ownerUserId, workspaceId },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.dividend.findMany({
        where: { ownerUserId, workspaceId },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    const trades = this.normalizeTrades(rawTrades, market, usdToIdrRate);
    const cashflows = this.normalizeCashflows(rawCashflows, market, usdToIdrRate);
    const dividends = this.normalizeDividends(rawDividends, market, usdToIdrRate);
    const initialCapital = market === 'ALL'
      ? initialCapitalId + (initialCapitalUs * usdToIdrRate)
      : market === 'US'
        ? initialCapitalUs
        : initialCapitalId;

    const stats = this.calculateStats(trades);
    const balance = this.calculatePortfolioBalance(trades, cashflows, dividends, initialCapital);
    const insights = this.calculateDashboardInsights(trades);
    const achievements = this.calculateAchievements(trades, dividends);
    const recentTrades = this.buildRecentTrades(trades);
    const closedTrades = this.buildClosedTrades(trades);
    const profitLossRangeTrades = this.getTradesInPerformanceRange(closedTrades, profitLossRangeKey, now);
    const profitLossSummary = this.buildTradeSummary(profitLossRangeTrades);
    const calendarMonthDate = this.parseCalendarMonth(options?.calendarMonth, now);
    const rangeSummaries = this.buildRangeSummaries(
      closedTrades,
      options?.customStartDate,
      options?.customEndDate,
      now,
    );
    const calendarDays = this.buildCalendarDays(closedTrades, calendarMonthDate);
    const performanceSeries = this.buildPerformancePortfolioSeries(
      trades,
      initialCapital,
      performanceRangeKey,
      now,
    );

    return {
      metrics: {
        totalTrades: stats.totalTrades,
        openTrades: trades.filter((trade) => !this.isClosedTrade(trade)).length,
        closedTrades: trades.filter((trade) => this.isClosedTrade(trade)).length,
        portfolios,
        realizedPnl: stats.totalPnL,
      },
      stats,
      balance,
      insights,
      achievements,
      recentTrades,
      closedTrades,
      rangeSummaries,
      profitLossSummary,
      profitLossChartData: this.buildProfitLossChartData(profitLossRangeTrades),
      calendarMonth: this.formatMonthKey(calendarMonthDate),
      calendarDays,
      performancePortfolioSeries: performanceSeries,
    };
  }

  private normalizeTrades(rawTrades: Array<any>, market: DashboardMarket, usdToIdrRate: number) {
    return rawTrades
      .map((trade) => ({
        id: trade.id,
        assetType: trade.assetType,
        market: trade.market,
        stockCode: trade.stockCode,
        dateBuy: trade.dateBuy.toISOString().slice(0, 10),
        dateSell: trade.dateSell ? trade.dateSell.toISOString().slice(0, 10) : null,
        buyPrice: toNumber(trade.buyPrice),
        sellPrice: toNumber(trade.sellPrice),
        lots: trade.lots,
        buyFee: toNumber(trade.buyFee),
        sellFee: toNumber(trade.sellFee),
        strategy: trade.strategy,
        emotion: trade.emotion,
        tags: trade.tags?.map((item: { tag: string }) => item.tag) ?? [],
      }))
      .filter((trade) => {
        if (market === 'ALL') return true;
        if (market === 'US') return trade.market === 'US';
        return trade.market === 'ID' || !trade.market;
      })
      .map((trade) => {
        if (market === 'ALL' && trade.market === 'US') {
          return {
            ...trade,
            buyPrice: trade.buyPrice * usdToIdrRate,
            sellPrice: trade.sellPrice != null ? trade.sellPrice * usdToIdrRate : null,
          };
        }

        return trade;
      });
  }

  private normalizeCashflows(rawCashflows: Array<any>, market: DashboardMarket, usdToIdrRate: number) {
    return rawCashflows
      .map((cashflow) => ({
        id: cashflow.id,
        market: cashflow.market ?? 'ID',
        type: cashflow.type,
        amount: toNumber(cashflow.amount),
      }))
      .filter((cashflow) => {
        if (market === 'ALL') return true;
        if (market === 'US') return cashflow.market === 'US';
        return cashflow.market === 'ID' || !cashflow.market;
      })
      .map((cashflow) => (
        market === 'ALL' && cashflow.market === 'US'
          ? { ...cashflow, amount: cashflow.amount * usdToIdrRate }
          : cashflow
      ));
  }

  private normalizeDividends(rawDividends: Array<any>, market: DashboardMarket, usdToIdrRate: number) {
    return rawDividends
      .map((dividend) => ({
        id: dividend.id,
        market: dividend.market ?? 'ID',
        totalAmount: toNumber(dividend.totalAmount),
      }))
      .filter((dividend) => {
        if (market === 'ALL') return true;
        if (market === 'US') return dividend.market === 'US';
        return dividend.market === 'ID' || !dividend.market;
      })
      .map((dividend) => (
        market === 'ALL' && dividend.market === 'US'
          ? { ...dividend, totalAmount: dividend.totalAmount * usdToIdrRate }
          : dividend
      ));
  }

  private getTradeQuantityUnits(trade: { assetType?: string; market?: string; lots: number }) {
    const quantity = Number(trade.lots) || 0;
    if (trade.assetType === 'mutual_fund') return quantity;
    return trade.market === 'US' ? quantity : quantity * 100;
  }

  private isClosedTrade(trade: { dateSell?: string | null; sellPrice?: number | null }) {
    return Boolean(trade.dateSell && trade.sellPrice != null);
  }

  private calculateTradePnL(trade: any) {
    const shares = this.getTradeQuantityUnits(trade);
    const totalBuy = trade.buyPrice * shares;
    const totalSell = trade.sellPrice != null ? trade.sellPrice * shares : 0;
    const buyCommission = totalBuy * ((trade.buyFee ?? 0.15) / 100);
    const sellCommission = totalSell * ((trade.sellFee ?? 0.25) / 100);
    const totalFee = buyCommission + sellCommission;
    const pnl = trade.sellPrice != null ? totalSell - totalBuy - totalFee : 0;
    const pnlPercent = totalBuy > 0 ? (pnl / totalBuy) * 100 : 0;

    return {
      totalBuy,
      totalSell,
      buyCommission,
      sellCommission,
      totalFee,
      pnl,
      pnlPercent,
      shares,
    };
  }

  private calculateStats(trades: any[]) {
    const closedTrades = trades.filter((trade) => this.isClosedTrade(trade));
    if (closedTrades.length === 0) {
      return {
        totalTrades: 0,
        totalPnL: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        expectancy: 0,
        winCount: 0,
        lossCount: 0,
      };
    }

    const results = closedTrades.map((trade) => ({ ...trade, ...this.calculateTradePnL(trade) }));
    const wins = results.filter((result) => result.pnl > 0);
    const losses = results.filter((result) => result.pnl <= 0);
    const totalPnL = results.reduce((sum, result) => sum + result.pnl, 0);
    const totalWin = wins.reduce((sum, result) => sum + result.pnl, 0);
    const totalLoss = Math.abs(losses.reduce((sum, result) => sum + result.pnl, 0));
    const avgWin = wins.length > 0 ? totalWin / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;
    const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Number.POSITIVE_INFINITY : 0;
    const winRate = (wins.length / closedTrades.length) * 100;
    const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

    return {
      totalTrades: closedTrades.length,
      totalPnL,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      expectancy,
      winCount: wins.length,
      lossCount: losses.length,
    };
  }

  private calculatePortfolioBalance(trades: any[], cashflows: any[], dividends: any[], initialCapital: number) {
    const netCashflow = cashflows.reduce((sum, cashflow) => sum + (cashflow.type === 'deposit' ? cashflow.amount : -cashflow.amount), 0);
    const totalCapital = initialCapital + netCashflow;
    const realizedPnL = trades
      .filter((trade) => this.isClosedTrade(trade))
      .reduce((sum, trade) => sum + this.calculateTradePnL(trade).pnl, 0);
    const totalDividend = dividends.reduce((sum, dividend) => sum + (dividend.totalAmount || 0), 0);
    const realizedEquity = totalCapital + realizedPnL + totalDividend;
    const openTrades = trades.filter((trade) => !this.isClosedTrade(trade));
    const investedAmount = openTrades.reduce((sum, trade) => {
      const metrics = this.calculateTradePnL(trade);
      return sum + metrics.totalBuy + metrics.buyCommission;
    }, 0);
    const buyingPower = realizedEquity - investedAmount;

    return {
      initialCapital,
      netCashflow,
      totalCapital,
      realizedPnL,
      totalDividend,
      realizedEquity,
      investedAmount,
      buyingPower,
      openPositionsCount: openTrades.length,
    };
  }

  private buildRecentTrades(trades: any[]) {
    return trades
      .filter((trade) => this.isClosedTrade(trade))
      .map((trade) => ({ ...trade, ...this.calculateTradePnL(trade) }))
      .sort((left, right) => (new Date(right.dateSell!).getTime() - new Date(left.dateSell!).getTime()))
      .slice(0, 8);
  }

  private buildClosedTrades(trades: any[]) {
    return trades
      .filter((trade) => this.isClosedTrade(trade))
      .map((trade) => ({ ...trade, ...this.calculateTradePnL(trade) }))
      .sort((left, right) => left.dateSell.localeCompare(right.dateSell));
  }

  private buildTradeSummary(trades: any[]) {
    const realized = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const invested = trades.reduce((sum, trade) => sum + trade.totalBuy, 0);
    const wins = trades.filter((trade) => trade.pnl > 0).length;

    return {
      realized,
      invested,
      count: trades.length,
      winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
    };
  }

  private buildProfitLossChartData(trades: any[]) {
    const grouped = new Map<string, { key: string; label: string; pnl: number; tradeCount: number }>();

    trades.forEach((trade) => {
      const key = trade.dateSell;
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          label: this.formatShortDate(key),
          pnl: 0,
          tradeCount: 0,
        });
      }

      const current = grouped.get(key)!;
      current.pnl += trade.pnl;
      current.tradeCount += 1;
    });

    return Array.from(grouped.values()).sort((left, right) => left.key.localeCompare(right.key));
  }

  private buildRangeSummaries(closedTrades: any[], customStartDate: string | undefined, customEndDate: string | undefined, now: Date) {
    const todayStart = this.startOfDay(now);
    const sevenDaysAgo = this.subtractDays(todayStart, 6);
    const thirtyDaysAgo = this.subtractDays(todayStart, 29);
    const ninetyDaysAgo = this.subtractDays(todayStart, 89);
    const customStartObj = this.parseLocalDate(customStartDate);
    const customEndObj = this.parseLocalDate(customEndDate);
    const normalizedCustomStart =
      customStartObj && customEndObj && customStartObj > customEndObj
        ? customEndObj
        : customStartObj;
    const normalizedCustomEnd =
      customStartObj && customEndObj && customStartObj > customEndObj
        ? customStartObj
        : customEndObj;

    const ranges: Array<{
      key: RangeKey;
      label: string;
      matches: (sellDate: Date) => boolean;
    }> = [
      { key: 'today', label: 'Today', matches: (sellDate) => this.isSameDay(sellDate, now) },
      {
        key: 'mtd',
        label: 'Month To Date',
        matches: (sellDate) =>
          sellDate.getFullYear() === now.getFullYear() &&
          sellDate.getMonth() === now.getMonth(),
      },
      {
        key: 'ytd',
        label: 'Year To Date',
        matches: (sellDate) => sellDate.getFullYear() === now.getFullYear(),
      },
      {
        key: 'last7d',
        label: 'Last 7 Days',
        matches: (sellDate) => sellDate >= sevenDaysAgo && sellDate <= now,
      },
      {
        key: 'last30d',
        label: 'Last 1 Month',
        matches: (sellDate) => sellDate >= thirtyDaysAgo && sellDate <= now,
      },
      {
        key: 'last90d',
        label: 'Last 3 Months',
        matches: (sellDate) => sellDate >= ninetyDaysAgo && sellDate <= now,
      },
      {
        key: 'custom',
        label: `Custom Range (${this.buildRangeLabel(customStartDate, customEndDate)})`,
        matches: (sellDate) => {
          if (normalizedCustomStart && sellDate < normalizedCustomStart) return false;
          if (normalizedCustomEnd && sellDate > normalizedCustomEnd) return false;
          return true;
        },
      },
      { key: 'all', label: 'All Time', matches: () => true },
    ];

    return ranges.map((range) => {
      const items = closedTrades.filter((trade) => range.matches(this.parseLocalDate(trade.dateSell)!));
      const summary = this.buildTradeSummary(items);

      return {
        key: range.key,
        label: range.label,
        count: summary.count,
        realized: summary.realized,
        invested: summary.invested,
        winRate: summary.winRate,
      };
    });
  }

  private buildCalendarDays(closedTrades: any[], calendarMonth: Date) {
    const currentYear = calendarMonth.getFullYear();
    const currentMonth = calendarMonth.getMonth();
    const firstWeekdayOffset = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const pnlByDate = new Map<string, number>();

    closedTrades.forEach((trade) => {
      pnlByDate.set(trade.dateSell, (pnlByDate.get(trade.dateSell) ?? 0) + trade.pnl);
    });

    const cells: Array<{ day: number; date: string; pnl: number } | null> = [];

    for (let index = 0; index < firstWeekdayOffset; index += 1) {
      cells.push(null);
    }

    for (let dayNumber = 1; dayNumber <= totalDaysInMonth; dayNumber += 1) {
      const date = this.formatDateKey(new Date(currentYear, currentMonth, dayNumber));
      cells.push({
        day: dayNumber,
        date,
        pnl: pnlByDate.get(date) ?? 0,
      });
    }

    return cells;
  }

  private buildPerformancePortfolioSeries(
    trades: any[],
    initialCapital: number,
    performanceRangeKey: PerformanceRangeKey,
    now: Date,
  ) {
    const equitySeries = this.calculateEquityCurve(trades, initialCapital)
      .map((point) => ({
        date: point.date,
        value: Number(point.equity) || 0,
      }))
      .sort((left, right) => left.date.localeCompare(right.date));

    if (equitySeries.length === 0) return [];

    const rangeStart = this.getPerformanceRangeStart(performanceRangeKey, now);
    const firstDate = this.parseLocalDate(equitySeries[0].date);
    const lastDate = this.parseLocalDate(equitySeries[equitySeries.length - 1].date);
    const effectiveStart =
      rangeStart && firstDate
        ? rangeStart >= firstDate ? rangeStart : firstDate
        : rangeStart || firstDate;
    const effectiveEnd = lastDate && lastDate <= now ? lastDate : now;

    if (!effectiveStart || !effectiveEnd || effectiveStart > effectiveEnd) {
      return [];
    }

    const allDates = this.buildDailyDateRange(effectiveStart, effectiveEnd);
    let seriesIndex = 0;
    let currentValue: number | null = initialCapital;
    let baseValue: number | null = null;

    return allDates
      .map((date) => {
        while (seriesIndex < equitySeries.length && equitySeries[seriesIndex].date <= date) {
          currentValue = equitySeries[seriesIndex].value;
          seriesIndex += 1;
        }

        if (currentValue == null) return null;
        if (baseValue == null) baseValue = currentValue;
        if (!baseValue) return null;

        return {
          date,
          label: this.formatShortDate(date),
          portfolioReturn: ((currentValue / baseValue) - 1) * 100,
        };
      })
      .filter((item): item is { date: string; label: string; portfolioReturn: number } => item !== null);
  }

  private calculateEquityCurve(trades: any[], initialCapital: number) {
    const closedTrades = this.buildClosedTrades(trades);
    let runningEquity = initialCapital;

    return closedTrades.map((trade) => {
      runningEquity += trade.pnl;
      return {
        date: trade.dateSell,
        equity: runningEquity,
      };
    });
  }

  private getTradesInPerformanceRange(trades: any[], rangeKey: PerformanceRangeKey, now: Date) {
    const rangeStart = this.getPerformanceRangeStart(rangeKey, now);
    if (!rangeStart) return trades;
    return trades.filter((trade) => {
      const sellDate = this.parseLocalDate(trade.dateSell);
      return sellDate && sellDate >= rangeStart && sellDate <= now;
    });
  }

  private getPerformanceRangeStart(rangeKey: PerformanceRangeKey, now: Date) {
    switch (rangeKey) {
      case '1w':
        return this.subtractDays(now, 6);
      case '1m':
        return this.subtractDays(now, 29);
      case '3m':
        return this.subtractDays(now, 89);
      case 'ytd':
        return new Date(now.getFullYear(), 0, 1);
      case '1y':
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      case 'all':
      default:
        return null;
    }
  }

  private calculateAchievements(trades: any[], dividends: any[]) {
    const closedTrades = trades.filter((trade) => this.isClosedTrade(trade));
    return [
      {
        id: 'first_blood',
        name: 'First Blood',
        desc: 'Mencatat transaksi pertama di jurnal',
        icon: 'Activity',
        unlocked: trades.length > 0,
      },
      {
        id: 'profit_maker',
        name: 'Profit Maker',
        desc: 'Mencetak profit pertama kalinya',
        icon: 'TrendingUp',
        unlocked: closedTrades.some((trade) => this.calculateTradePnL(trade).pnl > 0),
      },
      {
        id: 'diamond_hands',
        name: 'Diamond Hands',
        desc: 'Hold posisi lebih dari 30 hari & profit',
        icon: 'Shield',
        unlocked: closedTrades.some((trade) => {
          const pnl = this.calculateTradePnL(trade).pnl;
          const buy = new Date(trade.dateBuy);
          const sell = new Date(trade.dateSell!);
          const holdingDays = (sell.getTime() - buy.getTime()) / (1000 * 60 * 60 * 24);
          return pnl > 0 && holdingDays >= 30;
        }),
      },
      {
        id: 'consistent',
        name: 'Consistent Winner',
        desc: 'Mencapai win rate di atas 60% (>10 trade)',
        icon: 'Award',
        unlocked: closedTrades.length >= 10
          ? (closedTrades.filter((trade) => this.calculateTradePnL(trade).pnl > 0).length / closedTrades.length) >= 0.6
          : false,
      },
      {
        id: 'dividend_hunter',
        name: 'Passive Income',
        desc: 'Mencetak dividen pertama',
        icon: 'DollarSign',
        unlocked: dividends.length > 0,
      },
    ];
  }

  private calculateDashboardInsights(trades: any[]) {
    const closedTrades = trades.filter((trade) => this.isClosedTrade(trade));
    const strategySummaries = this.buildCategorySummaries(closedTrades, (trade) => [trade.strategy])
      .filter((item) => item.count >= 3)
      .sort((left, right) => right.expectancy - left.expectancy || right.totalPnL - left.totalPnL);
    const emotionSummaries = this.buildCategorySummaries(closedTrades, (trade) => [trade.emotion])
      .filter((item) => item.count >= 3)
      .sort((left, right) => left.totalPnL - right.totalPnL || left.winRate - right.winRate);
    const dayStats = this.calculateDayOfWeekPnL(closedTrades)
      .filter((item) => item.count > 0)
      .sort((left, right) => left.pnl - right.pnl);

    const items: any[] = [];
    const bestStrategy = strategySummaries[0];
    const riskEmotion = emotionSummaries[0];
    const worstDay = dayStats[0];

    if (bestStrategy) {
      items.push({
        id: 'best-strategy',
        title: 'Best Strategy',
        category: 'strategy',
        tone: 'positive',
        metricKind: 'currency',
        metricValue: bestStrategy.expectancy,
        metricLabel: 'Expectancy',
        summary: `Strategi ${bestStrategy.name} saat ini paling sehat dengan expectancy ${this.formatCurrency(bestStrategy.expectancy)} dari ${bestStrategy.count} trade.`,
      });
    }

    if (riskEmotion) {
      items.push({
        id: 'risk-emotion',
        title: 'Risk Emotion',
        category: 'emotion',
        tone: 'warning',
        metricKind: 'currency',
        metricValue: riskEmotion.totalPnL,
        metricLabel: 'Total P/L',
        summary: `Emosi ${riskEmotion.name} paling sering merugikan dengan total P/L ${this.formatCurrency(riskEmotion.totalPnL)} dari ${riskEmotion.count} trade.`,
      });
    }

    if (worstDay) {
      items.push({
        id: 'worst-trading-day',
        title: 'Worst Trading Day',
        category: 'timing',
        tone: 'warning',
        metricKind: 'currency',
        metricValue: worstDay.pnl,
        metricLabel: 'Total P/L',
        summary: `Hari ${worstDay.day} menjadi hari terberat sejauh ini dengan total P/L ${this.formatCurrency(worstDay.pnl)}.`,
      });
    }

    return items;
  }

  private calculateDayOfWeekPnL(trades: any[]) {
    const days: Record<string, { pnl: number; count: number }> = {
      Senin: { pnl: 0, count: 0 },
      Selasa: { pnl: 0, count: 0 },
      Rabu: { pnl: 0, count: 0 },
      Kamis: { pnl: 0, count: 0 },
      Jumat: { pnl: 0, count: 0 },
    };
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    for (const trade of trades) {
      const dayName = dayNames[new Date(trade.dateSell!).getDay()];
      if (!days[dayName]) continue;
      days[dayName].pnl += this.calculateTradePnL(trade).pnl;
      days[dayName].count += 1;
    }

    return Object.entries(days).map(([day, data]) => ({ day, ...data }));
  }

  private buildCategorySummaries(trades: any[], getKeys: (trade: any) => Array<string | null | undefined>) {
    const grouped = new Map<string, any[]>();
    trades.forEach((trade) => {
      const keys = getKeys(trade).map((key) => String(key || '').trim()).filter(Boolean);
      keys.forEach((key) => {
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(trade);
      });
    });

    return Array.from(grouped.entries()).map(([name, items]) => {
      const results = items.map((trade) => ({ ...trade, ...this.calculateTradePnL(trade) }));
      const wins = results.filter((result) => result.pnl > 0);
      const losses = results.filter((result) => result.pnl <= 0);
      const totalPnL = results.reduce((sum, result) => sum + result.pnl, 0);
      const totalWin = wins.reduce((sum, result) => sum + result.pnl, 0);
      const totalLoss = Math.abs(losses.reduce((sum, result) => sum + result.pnl, 0));
      const winRate = results.length > 0 ? (wins.length / results.length) * 100 : 0;
      const avgWin = wins.length > 0 ? totalWin / wins.length : 0;
      const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;
      const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

      return {
        name,
        count: results.length,
        totalPnL,
        winRate,
        expectancy,
      };
    });
  }

  private parseLocalDate(dateString?: string | null) {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private isSameDay(left: Date, right: Date) {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  }

  private subtractDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() - days);
    return next;
  }

  private formatDateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private formatMonthKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private buildDailyDateRange(startDate: Date, endDate: Date) {
    const dates: string[] = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      dates.push(this.formatDateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }

  private formatShortDate(dateString: string) {
    const date = this.parseLocalDate(dateString);
    if (!date) return dateString;
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date);
  }

  private buildRangeLabel(startDate?: string, endDate?: string) {
    if (startDate && endDate) {
      return startDate === endDate
        ? this.formatLongDate(startDate)
        : `${this.formatLongDate(startDate)} - ${this.formatLongDate(endDate)}`;
    }
    if (startDate) return `Dari ${this.formatLongDate(startDate)}`;
    if (endDate) return `Sampai ${this.formatLongDate(endDate)}`;
    return 'Semua Tanggal';
  }

  private formatLongDate(dateString: string) {
    const date = this.parseLocalDate(dateString);
    if (!date) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  private parseCalendarMonth(value: string | undefined, fallbackDate: Date) {
    if (!value) return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), 1);
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), 1);
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (month < 0 || month > 11) return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), 1);
    return new Date(year, month, 1);
  }

  private formatCurrency(value: number) {
    const absoluteValue = Math.abs(Number(value) || 0);
    const prefix = Number(value) < 0 ? '-' : '';
    return `${prefix}Rp${absoluteValue.toLocaleString('id-ID')}`;
  }
}
