import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type SerializedTrade = {
  id: string;
  assetType: string;
  market: 'ID' | 'US';
  stockCode: string;
  dateBuy: string;
  dateSell: string | null;
  buyPrice: number;
  sellPrice: number | null;
  lots: number;
  buyFee: number;
  sellFee: number;
  strategy: string | null;
  emotion: string | null;
  tags: string[];
};

type InsightCategorySummary = {
  name: string;
  count: number;
  wins: number;
  losses: number;
  totalPnL: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
};

const MIN_INSIGHT_SAMPLE = 3;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    ownerUserId: string,
    workspaceId: string | null,
    options?: {
      usdToIdrRate?: number;
      initialCapital?: number;
    },
  ) {
    const usdToIdrRate = Number(options?.usdToIdrRate) > 0 ? Number(options?.usdToIdrRate) : 16200;
    const initialCapital = Number(options?.initialCapital) > 0 ? Number(options?.initialCapital) : 10000000;

    const trades = await this.prisma.trade.findMany({
      where: {
        ownerUserId,
        workspaceId,
      },
      include: {
        tags: {
          orderBy: { tag: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const normalizedTrades = trades.map((trade) => {
      const serialized = this.serializeTrade(trade);
      if (serialized.market !== 'US') return serialized;

      return {
        ...serialized,
        buyPrice: serialized.buyPrice * usdToIdrRate,
        sellPrice: serialized.sellPrice != null ? serialized.sellPrice * usdToIdrRate : null,
      };
    });

    const stats = this.calculateStats(normalizedTrades, initialCapital);
    const strategyStats = this.calculateStrategyStats(normalizedTrades);
    const dayOfWeek = this.calculateDayOfWeekPnL(normalizedTrades);
    const emotionStats = this.calculateEmotionStats(normalizedTrades);
    const tagStats = this.calculateTagStats(normalizedTrades);
    const topStocks = this.calculateTopStocks(normalizedTrades);
    const monthlyPnL = this.calculateMonthlyPnL(normalizedTrades);
    const equityCurve = this.calculateEquityCurve(normalizedTrades, initialCapital);
    const analyticsInsights = this.calculateAnalyticsInsights(normalizedTrades);

    return {
      stats,
      strategyStats,
      dayOfWeek,
      emotionStats,
      tagStats,
      topStocks,
      monthlyPnL,
      equityCurve,
      analyticsInsights,
    };
  }

  private serializeTrade(trade: {
    id: string;
    assetType: string;
    market: 'ID' | 'US';
    stockCode: string;
    dateBuy: Date;
    dateSell: Date | null;
    buyPrice: { toString(): string };
    sellPrice: { toString(): string } | null;
    lots: number;
    buyFee: { toString(): string };
    sellFee: { toString(): string };
    strategy: string | null;
    emotion: string | null;
    tags?: Array<{ tag: string }>;
  }): SerializedTrade {
    return {
      id: trade.id,
      assetType: trade.assetType,
      market: trade.market,
      stockCode: trade.stockCode,
      dateBuy: trade.dateBuy.toISOString().slice(0, 10),
      dateSell: trade.dateSell ? trade.dateSell.toISOString().slice(0, 10) : null,
      buyPrice: Number(trade.buyPrice.toString()),
      sellPrice: trade.sellPrice ? Number(trade.sellPrice.toString()) : null,
      lots: trade.lots,
      buyFee: Number(trade.buyFee.toString()),
      sellFee: Number(trade.sellFee.toString()),
      strategy: trade.strategy,
      emotion: trade.emotion,
      tags: trade.tags?.map((item) => item.tag) ?? [],
    };
  }

  private isClosedTrade(trade: SerializedTrade) {
    return Boolean(trade.dateSell && trade.sellPrice != null);
  }

  private getTradeQuantityUnits(trade: SerializedTrade) {
    const quantity = Number(trade.lots) || 0;
    if (trade.assetType === 'mutual_fund') return quantity;
    return trade.market === 'US' ? quantity : quantity * 100;
  }

  private calculateTradePnL(trade: SerializedTrade) {
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
    };
  }

  private calculateStats(trades: SerializedTrade[], initialCapital: number) {
    const closedTrades = trades.filter((trade) => this.isClosedTrade(trade));
    if (closedTrades.length === 0) {
      return {
        totalTrades: 0,
        totalPnL: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        bestTrade: null,
        worstTrade: null,
        avgHoldingDays: 0,
        expectancy: 0,
        winCount: 0,
        lossCount: 0,
        sharpeRatio: 0,
        winLossRatio: 0,
        recoveryFactor: 0,
        maxDrawdownPercent: 0,
        maxDrawdownDuration: 0,
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

    const holdingDays = closedTrades
      .map((trade) => {
        if (!trade.dateBuy || !trade.dateSell) return null;
        const buy = new Date(trade.dateBuy);
        const sell = new Date(trade.dateSell);
        return Math.ceil(Math.abs(sell.getTime() - buy.getTime()) / (1000 * 60 * 60 * 24));
      })
      .filter((value): value is number => value != null);

    const avgHoldingDays = holdingDays.length > 0
      ? holdingDays.reduce((sum, value) => sum + value, 0) / holdingDays.length
      : 0;

    const sortedByPnL = [...results].sort((left, right) => right.pnl - left.pnl);
    const bestTrade = sortedByPnL[0] ?? null;
    const worstTrade = sortedByPnL[sortedByPnL.length - 1] ?? null;
    const winRate = (wins.length / closedTrades.length) * 100;
    const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;
    const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Number.POSITIVE_INFINITY : 0;

    const returns = results.map((result) => result.pnlPercent).filter((value) => value != null);
    let sharpeRatio = 0;
    if (returns.length > 1) {
      const meanReturn = returns.reduce((sum, value) => sum + value, 0) / returns.length;
      const variance = returns.reduce((sum, value) => sum + ((value - meanReturn) ** 2), 0) / (returns.length - 1);
      const stdDev = Math.sqrt(variance);
      sharpeRatio = stdDev > 0 ? meanReturn / stdDev : 0;
    }

    const curve = this.calculateEquityCurve(closedTrades, initialCapital);
    const maxDrawdownValue = Math.max(...curve.map((point) => point.drawdown), 0);
    const maxDrawdownPercent = Math.max(...curve.map((point) => point.drawdownPercent), 0);
    const recoveryFactor = maxDrawdownValue > 0 ? totalPnL / maxDrawdownValue : totalPnL > 0 ? Number.POSITIVE_INFINITY : 0;

    return {
      totalTrades: closedTrades.length,
      totalPnL,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      bestTrade,
      worstTrade,
      avgHoldingDays,
      expectancy,
      winCount: wins.length,
      lossCount: losses.length,
      sharpeRatio,
      winLossRatio,
      recoveryFactor,
      maxDrawdownPercent,
      maxDrawdownDuration: this.calculateMaxDrawdownDuration(curve),
    };
  }

  private calculateMaxDrawdownDuration(curve: Array<{ date: string; equity: number }>) {
    if (curve.length < 2) return 0;

    let maxDurationDays = 0;
    let drawdownStartDate: string | null = null;
    let currentPeak = curve[0].equity;

    for (let index = 1; index < curve.length; index += 1) {
      const point = curve[index];
      if (point.equity >= currentPeak) {
        if (drawdownStartDate) {
          const start = new Date(drawdownStartDate);
          const end = new Date(point.date);
          const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > maxDurationDays) maxDurationDays = diffDays;
          drawdownStartDate = null;
        }
        currentPeak = point.equity;
      } else if (!drawdownStartDate) {
        drawdownStartDate = curve[index - 1].date;
      }
    }

    if (drawdownStartDate) {
      const start = new Date(drawdownStartDate);
      const end = new Date(curve[curve.length - 1].date);
      const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > maxDurationDays) maxDurationDays = diffDays;
    }

    return maxDurationDays;
  }

  private calculateEquityCurve(trades: SerializedTrade[], initialCapital = 10000000) {
    const closedTrades = trades
      .filter((trade) => this.isClosedTrade(trade))
      .sort((left, right) => new Date(left.dateSell!).getTime() - new Date(right.dateSell!).getTime());

    let equity = initialCapital;
    let peak = initialCapital;

    const curve = [{
      date: closedTrades[0]?.dateBuy || new Date().toISOString().slice(0, 10),
      equity: initialCapital,
      drawdown: 0,
      drawdownPercent: 0,
      peak: initialCapital,
    }];

    for (const trade of closedTrades) {
      const { pnl } = this.calculateTradePnL(trade);
      equity += pnl;
      if (equity > peak) peak = equity;
      const drawdown = peak - equity;
      const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;

      curve.push({
        date: trade.dateSell!,
        equity,
        drawdown,
        drawdownPercent,
        peak,
      });
    }

    return curve;
  }

  private calculateMonthlyPnL(trades: SerializedTrade[]) {
    const monthly: Record<string, number> = {};
    for (const trade of trades.filter((item) => this.isClosedTrade(item))) {
      const date = new Date(trade.dateSell!);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = (monthly[key] || 0) + this.calculateTradePnL(trade).pnl;
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return Object.entries(monthly)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([month, pnl]) => {
        const [year, monthNumber] = month.split('-');
        return {
          month: `${monthNames[Number(monthNumber) - 1]} ${year}`,
          pnl,
        };
      });
  }

  private calculateStrategyStats(trades: SerializedTrade[]) {
    const grouped: Record<string, { wins: number; losses: number; totalPnL: number; count: number }> = {};
    for (const trade of trades.filter((item) => this.isClosedTrade(item) && item.strategy)) {
      const key = String(trade.strategy);
      grouped[key] ||= { wins: 0, losses: 0, totalPnL: 0, count: 0 };
      const { pnl } = this.calculateTradePnL(trade);
      grouped[key].count += 1;
      grouped[key].totalPnL += pnl;
      if (pnl > 0) grouped[key].wins += 1;
      else grouped[key].losses += 1;
    }

    return Object.entries(grouped).map(([name, data]) => ({
      name,
      ...data,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    }));
  }

  private calculateDayOfWeekPnL(trades: SerializedTrade[]) {
    const days: Record<string, { pnl: number; count: number }> = {
      Senin: { pnl: 0, count: 0 },
      Selasa: { pnl: 0, count: 0 },
      Rabu: { pnl: 0, count: 0 },
      Kamis: { pnl: 0, count: 0 },
      Jumat: { pnl: 0, count: 0 },
    };
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    for (const trade of trades.filter((item) => this.isClosedTrade(item))) {
      const dayName = dayNames[new Date(trade.dateSell!).getDay()];
      if (!days[dayName]) continue;
      const { pnl } = this.calculateTradePnL(trade);
      days[dayName].pnl += pnl;
      days[dayName].count += 1;
    }

    return Object.entries(days).map(([day, data]) => ({ day, ...data }));
  }

  private calculateEmotionStats(trades: SerializedTrade[]) {
    const grouped: Record<string, { wins: number; losses: number; totalPnL: number; count: number }> = {};
    for (const trade of trades.filter((item) => this.isClosedTrade(item) && item.emotion)) {
      const key = String(trade.emotion);
      grouped[key] ||= { wins: 0, losses: 0, totalPnL: 0, count: 0 };
      const { pnl } = this.calculateTradePnL(trade);
      grouped[key].count += 1;
      grouped[key].totalPnL += pnl;
      if (pnl > 0) grouped[key].wins += 1;
      else grouped[key].losses += 1;
    }

    return Object.entries(grouped).map(([emotion, data]) => ({
      emotion,
      ...data,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    }));
  }

  private calculateTagStats(trades: SerializedTrade[]) {
    const grouped: Record<string, { wins: number; losses: number; totalPnL: number; count: number }> = {};
    for (const trade of trades.filter((item) => this.isClosedTrade(item) && item.tags.length > 0)) {
      const { pnl } = this.calculateTradePnL(trade);
      for (const tag of trade.tags) {
        grouped[tag] ||= { wins: 0, losses: 0, totalPnL: 0, count: 0 };
        grouped[tag].count += 1;
        grouped[tag].totalPnL += pnl;
        if (pnl > 0) grouped[tag].wins += 1;
        else grouped[tag].losses += 1;
      }
    }

    return Object.entries(grouped)
      .map(([tagName, data]) => ({
        tagName,
        ...data,
        winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      }))
      .sort((left, right) => right.count - left.count);
  }

  private calculateTopStocks(trades: SerializedTrade[]) {
    const grouped: Record<string, { trades: number; totalPnL: number; wins: number }> = {};
    for (const trade of trades.filter((item) => this.isClosedTrade(item))) {
      grouped[trade.stockCode] ||= { trades: 0, totalPnL: 0, wins: 0 };
      const { pnl } = this.calculateTradePnL(trade);
      grouped[trade.stockCode].trades += 1;
      grouped[trade.stockCode].totalPnL += pnl;
      if (pnl > 0) grouped[trade.stockCode].wins += 1;
    }

    return Object.entries(grouped)
      .map(([code, data]) => ({
        code,
        ...data,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      }))
      .sort((left, right) => right.totalPnL - left.totalPnL);
  }

  private formatInsightCurrency(value: number) {
    const absoluteValue = Math.abs(Number(value) || 0);
    const prefix = Number(value) < 0 ? '-' : '';
    return `${prefix}Rp${absoluteValue.toLocaleString('id-ID')}`;
  }

  private buildResultSummary(trades: SerializedTrade[]) {
    if (!trades.length) {
      return { count: 0, wins: 0, losses: 0, totalPnL: 0, winRate: 0, avgWin: 0, avgLoss: 0, expectancy: 0 };
    }

    const results = trades.map((trade) => ({ ...trade, ...this.calculateTradePnL(trade) }));
    const wins = results.filter((result) => result.pnl > 0);
    const losses = results.filter((result) => result.pnl <= 0);
    const totalPnL = results.reduce((sum, result) => sum + result.pnl, 0);
    const totalWin = wins.reduce((sum, result) => sum + result.pnl, 0);
    const totalLoss = Math.abs(losses.reduce((sum, result) => sum + result.pnl, 0));
    const winRate = results.length > 0 ? (wins.length / results.length) * 100 : 0;
    const avgWin = wins.length > 0 ? totalWin / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;
    const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

    return { count: results.length, wins: wins.length, losses: losses.length, totalPnL, winRate, avgWin, avgLoss, expectancy };
  }

  private buildCategorySummaries(trades: SerializedTrade[], getKeys: (trade: SerializedTrade) => string[]) {
    const grouped = new Map<string, SerializedTrade[]>();
    trades.forEach((trade) => {
      const keys = getKeys(trade).map((key) => String(key || '').trim()).filter(Boolean);
      keys.forEach((key) => {
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(trade);
      });
    });

    return Array.from(grouped.entries()).map(([name, items]) => ({
      name,
      ...this.buildResultSummary(items),
    }));
  }

  private compareByStrategyInsight(left: InsightCategorySummary, right: InsightCategorySummary) {
    return right.expectancy - left.expectancy
      || right.totalPnL - left.totalPnL
      || right.count - left.count
      || left.name.localeCompare(right.name, 'id');
  }

  private compareByEmotionInsight(left: InsightCategorySummary, right: InsightCategorySummary) {
    return right.winRate - left.winRate
      || right.totalPnL - left.totalPnL
      || right.count - left.count
      || left.name.localeCompare(right.name, 'id');
  }

  private compareByTagInsight(left: InsightCategorySummary, right: InsightCategorySummary) {
    return right.expectancy - left.expectancy
      || right.totalPnL - left.totalPnL
      || right.count - left.count
      || left.name.localeCompare(right.name, 'id');
  }

  private calculateStrategyInsights(trades: SerializedTrade[]) {
    return this.buildCategorySummaries(trades.filter((trade) => this.isClosedTrade(trade)), (trade) => [trade.strategy || ''])
      .filter((item) => item.count >= MIN_INSIGHT_SAMPLE)
      .sort((left, right) => this.compareByStrategyInsight(left, right));
  }

  private calculateEmotionInsights(trades: SerializedTrade[]) {
    return this.buildCategorySummaries(trades.filter((trade) => this.isClosedTrade(trade)), (trade) => [trade.emotion || ''])
      .filter((item) => item.count >= MIN_INSIGHT_SAMPLE)
      .sort((left, right) => this.compareByEmotionInsight(left, right));
  }

  private calculateTagInsights(trades: SerializedTrade[]) {
    return this.buildCategorySummaries(trades.filter((trade) => this.isClosedTrade(trade)), (trade) => trade.tags)
      .filter((item) => item.count >= MIN_INSIGHT_SAMPLE)
      .sort((left, right) => this.compareByTagInsight(left, right));
  }

  private calculateHoldingDays(dateBuy: string, dateSell: string | null) {
    if (!dateBuy || !dateSell) return null;
    const buy = new Date(dateBuy);
    const sell = new Date(dateSell);
    if (Number.isNaN(buy.getTime()) || Number.isNaN(sell.getTime())) return null;
    return Math.max(1, Math.ceil(Math.abs(sell.getTime() - buy.getTime()) / (1000 * 60 * 60 * 24)));
  }

  private calculateTimingInsights(trades: SerializedTrade[]) {
    const closedTrades = trades.filter((trade) => this.isClosedTrade(trade));
    const dayStats = this.calculateDayOfWeekPnL(closedTrades)
      .filter((item) => item.count > 0)
      .sort((left, right) => left.pnl - right.pnl);

    const holdingRows = closedTrades
      .map((trade) => {
        const holdingDays = this.calculateHoldingDays(trade.dateBuy, trade.dateSell);
        if (holdingDays == null) return null;
        return { trade, holdingDays };
      })
      .filter((row): row is { trade: SerializedTrade; holdingDays: number } => row != null);

    const averageHoldingDays = holdingRows.length > 0
      ? holdingRows.reduce((sum, row) => sum + row.holdingDays, 0) / holdingRows.length
      : 0;

    const fasterTrades = holdingRows.filter((row) => row.holdingDays <= averageHoldingDays).map((row) => row.trade);
    const slowerTrades = holdingRows.filter((row) => row.holdingDays > averageHoldingDays).map((row) => row.trade);
    const fasterSummary = this.buildResultSummary(fasterTrades);
    const slowerSummary = this.buildResultSummary(slowerTrades);
    const healthierBucket = fasterSummary.expectancy >= slowerSummary.expectancy
      ? { key: 'faster', label: 'Holding <= rata-rata', summary: fasterSummary }
      : { key: 'slower', label: 'Holding > rata-rata', summary: slowerSummary };

    return {
      averageHoldingDays,
      bestDay: dayStats[dayStats.length - 1] || null,
      worstDay: dayStats[0] || null,
      holdingPattern: holdingRows.length > 0
        ? { faster: fasterSummary, slower: slowerSummary, healthierBucket }
        : null,
    };
  }

  private buildInsightItem(item: {
    id: string;
    title: string;
    category: string;
    tone: string;
    summary: string;
    metricLabel: string;
    metricValue: number;
    metricKind: string;
    supportingValue: string;
    priority: number;
  }) {
    return item;
  }

  private calculateAnalyticsInsights(trades: SerializedTrade[]) {
    const closedTrades = trades.filter((trade) => this.isClosedTrade(trade));
    if (closedTrades.length === 0) {
      return {
        items: [],
        categoryStates: {
          strategy: { hasEnoughData: false, count: 0, minSample: MIN_INSIGHT_SAMPLE },
          emotion: { hasEnoughData: false, count: 0, minSample: MIN_INSIGHT_SAMPLE },
          tag: { hasEnoughData: false, count: 0, minSample: MIN_INSIGHT_SAMPLE },
        },
      };
    }

    const strategyInsights = this.calculateStrategyInsights(closedTrades);
    const emotionInsights = this.calculateEmotionInsights(closedTrades);
    const tagInsights = this.calculateTagInsights(closedTrades);
    const timingInsights = this.calculateTimingInsights(closedTrades);

    const items: Array<ReturnType<AnalyticsService['buildInsightItem']>> = [];
    const bestStrategy = strategyInsights[0];
    const weakStrategy = strategyInsights.length > 0 ? [...strategyInsights].sort((left, right) => this.compareByStrategyInsight(left, right)).reverse()[0] : null;
    const bestEmotion = emotionInsights[0];
    const riskEmotion = emotionInsights.length > 0
      ? [...emotionInsights].sort((left, right) => left.totalPnL - right.totalPnL || left.winRate - right.winRate || right.count - left.count)[0]
      : null;
    const bestTag = tagInsights[0];
    const worstDay = timingInsights.worstDay;
    const bestDay = timingInsights.bestDay;
    const holdingPattern = timingInsights.holdingPattern;

    if (bestStrategy) {
      items.push(this.buildInsightItem({
        id: 'best-strategy',
        title: 'Best Strategy',
        category: 'strategy',
        tone: 'positive',
        summary: `Strategi ${bestStrategy.name} saat ini paling sehat dengan expectancy ${this.formatInsightCurrency(bestStrategy.expectancy)} dari ${bestStrategy.count} trade.`,
        metricLabel: 'Expectancy',
        metricValue: bestStrategy.expectancy,
        metricKind: 'currency',
        supportingValue: `${bestStrategy.count} trade • Win rate ${bestStrategy.winRate.toFixed(1)}%`,
        priority: 1,
      }));
    }

    if (weakStrategy) {
      items.push(this.buildInsightItem({
        id: 'weak-strategy',
        title: 'Weak Strategy',
        category: 'strategy',
        tone: 'warning',
        summary: `Strategi ${weakStrategy.name} perlu dievaluasi karena expectancy ${this.formatInsightCurrency(weakStrategy.expectancy)} dari ${weakStrategy.count} trade.`,
        metricLabel: 'Expectancy',
        metricValue: weakStrategy.expectancy,
        metricKind: 'currency',
        supportingValue: `${weakStrategy.count} trade • Total P/L ${weakStrategy.totalPnL.toLocaleString('id-ID')}`,
        priority: 2,
      }));
    }

    if (bestEmotion) {
      items.push(this.buildInsightItem({
        id: 'best-emotion-context',
        title: 'Best Emotion Context',
        category: 'emotion',
        tone: 'positive',
        summary: `Kondisi emosi ${bestEmotion.name} paling konsisten dengan win rate ${bestEmotion.winRate.toFixed(1)}% dari ${bestEmotion.count} trade.`,
        metricLabel: 'Win Rate',
        metricValue: bestEmotion.winRate,
        metricKind: 'percent',
        supportingValue: `${bestEmotion.count} trade • Total P/L ${this.formatInsightCurrency(bestEmotion.totalPnL)}`,
        priority: 3,
      }));
    }

    if (riskEmotion) {
      items.push(this.buildInsightItem({
        id: 'risk-emotion',
        title: 'Risk Emotion',
        category: 'emotion',
        tone: 'warning',
        summary: `Emosi ${riskEmotion.name} paling sering merugikan dengan total P/L ${this.formatInsightCurrency(riskEmotion.totalPnL)} dari ${riskEmotion.count} trade.`,
        metricLabel: 'Total P/L',
        metricValue: riskEmotion.totalPnL,
        metricKind: 'currency',
        supportingValue: `${riskEmotion.count} trade • Win rate ${riskEmotion.winRate.toFixed(1)}%`,
        priority: 4,
      }));
    }

    if (bestTag) {
      items.push(this.buildInsightItem({
        id: 'best-tag',
        title: 'Best Tag',
        category: 'tag',
        tone: 'positive',
        summary: `Tag #${bestTag.name} saat ini paling sehat dengan expectancy ${this.formatInsightCurrency(bestTag.expectancy)} dari ${bestTag.count} trade.`,
        metricLabel: 'Expectancy',
        metricValue: bestTag.expectancy,
        metricKind: 'currency',
        supportingValue: `${bestTag.count} trade • Win rate ${bestTag.winRate.toFixed(1)}%`,
        priority: 5,
      }));
    }

    if (worstDay) {
      items.push(this.buildInsightItem({
        id: 'worst-trading-day',
        title: 'Worst Trading Day',
        category: 'timing',
        tone: 'warning',
        summary: `Hari ${worstDay.day} menjadi hari terberat sejauh ini dengan total P/L ${this.formatInsightCurrency(worstDay.pnl)}.`,
        metricLabel: 'Total P/L',
        metricValue: worstDay.pnl,
        metricKind: 'currency',
        supportingValue: `${worstDay.count} trade ditutup`,
        priority: 6,
      }));
    }

    if (bestDay) {
      items.push(this.buildInsightItem({
        id: 'best-trading-day',
        title: 'Best Trading Day',
        category: 'timing',
        tone: 'neutral',
        summary: `Hari ${bestDay.day} menghasilkan P/L terbaik sejauh ini sebesar ${this.formatInsightCurrency(bestDay.pnl)}.`,
        metricLabel: 'Total P/L',
        metricValue: bestDay.pnl,
        metricKind: 'currency',
        supportingValue: `${bestDay.count} trade ditutup`,
        priority: 7,
      }));
    }

    if (holdingPattern) {
      items.push(this.buildInsightItem({
        id: 'holding-pattern',
        title: 'Holding Pattern',
        category: 'timing',
        tone: holdingPattern.healthierBucket.key === 'faster' ? 'positive' : 'neutral',
        summary: `${holdingPattern.healthierBucket.label} terlihat lebih sehat dengan expectancy ${this.formatInsightCurrency(holdingPattern.healthierBucket.summary.expectancy)} dibanding rata-rata holding ${timingInsights.averageHoldingDays.toFixed(1)} hari.`,
        metricLabel: 'Avg Holding',
        metricValue: timingInsights.averageHoldingDays,
        metricKind: 'days',
        supportingValue: `<= avg: ${holdingPattern.faster.count} trade • > avg: ${holdingPattern.slower.count} trade`,
        priority: 8,
      }));
    }

    return {
      items: items.sort((left, right) => left.priority - right.priority),
      categoryStates: {
        strategy: { hasEnoughData: strategyInsights.length > 0, count: strategyInsights.length, minSample: MIN_INSIGHT_SAMPLE },
        emotion: { hasEnoughData: emotionInsights.length > 0, count: emotionInsights.length, minSample: MIN_INSIGHT_SAMPLE },
        tag: { hasEnoughData: tagInsights.length > 0, count: tagInsights.length, minSample: MIN_INSIGHT_SAMPLE },
      },
    };
  }
}
