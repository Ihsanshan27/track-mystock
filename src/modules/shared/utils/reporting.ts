import {
  calculateEquityCurve,
  calculatePortfolioBalance,
  calculateStats,
  calculateTradePnL,
  calculateUnrealizedPnL,
  calculateMonthlyPnL,
} from '@/modules/trades/calculations';

export function buildReportSnapshot({
  trades = [],
  cashflows = [],
  dividends = [],
  settings = {} as any,
  marketPrices = {},
  market = 'ID',
  ownerName = 'User',
}) {
  const filteredTrades = trades.filter((trade) => trade.market === market || (!trade.market && market === 'ID'));
  const filteredCashflows = cashflows.filter((item) => item.market === market || (!item.market && market === 'ID'));
  const filteredDividends = dividends.filter((item) => item.market === market || (!item.market && market === 'ID'));
  const initialCapital = market === 'US' ? (settings.initialCapitalUS ?? 1000) : (settings.initialCapital ?? 10000000);

  const stats = calculateStats(filteredTrades);
  const balance = calculatePortfolioBalance(filteredTrades, filteredCashflows, filteredDividends, initialCapital);
  const equityCurve = calculateEquityCurve(filteredTrades, initialCapital);
  const monthlyPerformance = calculateMonthlyPnL(filteredTrades);

  const openPositions = filteredTrades
    .filter((trade) => !trade.sellPrice || !trade.dateSell)
    .map((trade) => {
      const tradeCalc = calculateTradePnL(trade);
      const currentPrice = Number(marketPrices?.[trade.stockCode] || 0);
      const unrealized = currentPrice > 0
        ? calculateUnrealizedPnL(trade.buyPrice, currentPrice, trade.lots, trade.buyFee, trade.market || 'ID')
        : { pnl: 0, pnlPercent: 0 };

      return {
        id: trade.id,
        stockCode: trade.stockCode,
        lots: trade.lots,
        shares: tradeCalc.shares,
        buyPrice: trade.buyPrice,
        currentPrice,
        totalBuy: tradeCalc.totalBuy,
        floatingPnL: unrealized.pnl,
        floatingPnLPercent: unrealized.pnlPercent,
        strategy: trade.strategy || '-',
      };
    });

  const totalInvested = openPositions.reduce((sum, position) => sum + position.totalBuy, 0);
  const totalFloating = openPositions.reduce((sum, position) => sum + position.floatingPnL, 0);

  const portfolioSummary = openPositions.map((position) => ({
    ...position,
    allocationPercent: totalInvested > 0 ? (position.totalBuy / totalInvested) * 100 : 0,
  }));

  return {
    generatedAt: new Date().toISOString(),
    market,
    currency: market === 'US' ? 'USD' : 'IDR',
    ownerName,
    summary: {
      totalTrades: stats.totalTrades,
      winRate: stats.winRate,
      totalRealizedPnL: stats.totalPnL,
      totalFloatingPnL: totalFloating,
      openPositionsCount: openPositions.length,
      totalInvested,
      realizedEquity: balance.realizedEquity,
      buyingPower: balance.buyingPower,
      totalDividend: balance.totalDividend,
      bestTradeStock: stats.bestTrade?.stockCode || null,
      profitFactor: Number.isFinite(stats.profitFactor) ? stats.profitFactor : null,
    },
    portfolioSummary,
    monthlyPerformance,
    equityCurve,
  };
}
