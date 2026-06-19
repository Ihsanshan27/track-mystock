// === Trade Calculations ===

export function calculateTradePnL(trade) {
  const { buyPrice, sellPrice, lots, buyFee = 0.15, sellFee = 0.25, market = 'ID' } = trade;
  const shares = market === 'US' ? lots : lots * 100;

  const totalBuy = buyPrice * shares;
  const totalSell = sellPrice ? sellPrice * shares : 0;

  const buyCommission = totalBuy * (buyFee / 100);
  const sellCommission = totalSell * (sellFee / 100);
  const totalFee = buyCommission + sellCommission;

  const pnl = sellPrice ? totalSell - totalBuy - totalFee : 0;
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

export function calculateUnrealizedPnL(buyPrice, currentPrice, lots, buyFee = 0.15, market = 'ID') {
  const shares = market === 'US' ? lots : lots * 100;
  const totalBuy = buyPrice * shares;
  const totalCurrent = currentPrice * shares;
  const fee = totalBuy * (buyFee / 100);
  const pnl = totalCurrent - totalBuy - fee;
  const pnlPercent = totalBuy > 0 ? (pnl / totalBuy) * 100 : 0;
  return { pnl, pnlPercent, totalBuy, totalCurrent };
}

// === Portfolio/Stats ===

export function calculateStats(trades) {
  const closedTrades = trades.filter(t => t.sellPrice && t.dateSell);

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
    };
  }

  const results = closedTrades.map(t => {
    const calc = calculateTradePnL(t);
    return { ...t, ...calc };
  });

  const wins = results.filter(r => r.pnl > 0);
  const losses = results.filter(r => r.pnl <= 0);

  const totalPnL = results.reduce((sum, r) => sum + r.pnl, 0);
  const totalWin = wins.reduce((sum, r) => sum + r.pnl, 0);
  const totalLoss = Math.abs(losses.reduce((sum, r) => sum + r.pnl, 0));

  const avgWin = wins.length > 0 ? totalWin / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;
  const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0;

  const holdingDays = closedTrades
    .filter(t => t.dateBuy && t.dateSell)
    .map(t => {
      const d1 = new Date(t.dateBuy);
      const d2 = new Date(t.dateSell);
      return Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    });
  const avgHoldingDays = holdingDays.length > 0
    ? holdingDays.reduce((s, d) => s + d, 0) / holdingDays.length
    : 0;

  const sortedByPnL = [...results].sort((a, b) => b.pnl - a.pnl);
  const bestTrade = sortedByPnL[0] || null;
  const worstTrade = sortedByPnL[sortedByPnL.length - 1] || null;

  const winRate = (wins.length / closedTrades.length) * 100;
  const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

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
  };
}

// === Equity Curve ===

export function calculateEquityCurve(trades, initialCapital = 10000000) {
  const closed = trades
    .filter(t => t.sellPrice && t.dateSell)
    .sort((a, b) => new Date(a.dateSell).getTime() - new Date(b.dateSell).getTime());

  let equity = initialCapital;
  let peak = initialCapital;

  const curve = [{
    date: closed[0]?.dateBuy || new Date().toISOString().split('T')[0],
    equity: initialCapital,
    drawdown: 0,
    drawdownPercent: 0,
    peak: initialCapital
  }];

  for (const t of closed) {
    const { pnl } = calculateTradePnL(t);
    equity += pnl;
    if (equity > peak) {
      peak = equity;
    }
    const drawdown = peak - equity;
    const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;

    curve.push({
      date: t.dateSell,
      equity,
      drawdown,
      drawdownPercent,
      peak
    });
  }

  return curve;
}

// === Monthly P&L ===

export function calculateMonthlyPnL(trades) {
  const closed = trades.filter(t => t.sellPrice && t.dateSell);
  const monthly: Record<string, number> = {};

  for (const t of closed) {
    const date = new Date(t.dateSell);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const { pnl } = calculateTradePnL(t);
    monthly[key] = (monthly[key] || 0) + pnl;
  }

  return Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, pnl]) => {
      const [y, m] = month.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return { month: `${monthNames[parseInt(m) - 1]} ${y}`, pnl };
    });
}

// === Strategy Stats ===

export function calculateStrategyStats(trades) {
  const closed = trades.filter(t => t.sellPrice && t.dateSell && t.strategy);
  const strategies: Record<string, { wins: number; losses: number; totalPnL: number; count: number }> = {};

  for (const t of closed) {
    if (!strategies[t.strategy]) {
      strategies[t.strategy] = { wins: 0, losses: 0, totalPnL: 0, count: 0 };
    }
    const { pnl } = calculateTradePnL(t);
    strategies[t.strategy].count++;
    strategies[t.strategy].totalPnL += pnl;
    if (pnl > 0) strategies[t.strategy].wins++;
    else strategies[t.strategy].losses++;
  }

  return Object.entries(strategies).map(([name, data]) => ({
    name,
    ...data,
    winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
  }));
}

// === Day of Week ===

export function calculateDayOfWeekPnL(trades) {
  const closed = trades.filter(t => t.sellPrice && t.dateSell);
  const days = {
    Senin: { pnl: 0, count: 0 },
    Selasa: { pnl: 0, count: 0 },
    Rabu: { pnl: 0, count: 0 },
    Kamis: { pnl: 0, count: 0 },
    Jumat: { pnl: 0, count: 0 },
  };

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  for (const t of closed) {
    const dayName = dayNames[new Date(t.dateSell).getDay()];
    if (days[dayName]) {
      const { pnl } = calculateTradePnL(t);
      days[dayName].pnl += pnl;
      days[dayName].count++;
    }
  }

  return Object.entries(days).map(([day, data]) => ({ day, ...data }));
}

// === Emotion Stats ===

export function calculateEmotionStats(trades) {
  const closed = trades.filter(t => t.sellPrice && t.dateSell && t.emotion);
  const emotions: Record<string, { wins: number; losses: number; totalPnL: number; count: number }> = {};

  for (const t of closed) {
    if (!emotions[t.emotion]) {
      emotions[t.emotion] = { wins: 0, losses: 0, totalPnL: 0, count: 0 };
    }
    const { pnl } = calculateTradePnL(t);
    emotions[t.emotion].count++;
    emotions[t.emotion].totalPnL += pnl;
    if (pnl > 0) emotions[t.emotion].wins++;
    else emotions[t.emotion].losses++;
  }

  return Object.entries(emotions).map(([emotion, data]) => ({
    emotion,
    ...data,
    winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
  }));
}

// === Tag Stats ===

export function calculateTagStats(trades) {
  const closed = trades.filter(t => t.sellPrice && t.dateSell && t.tags && t.tags.length > 0);
  const tagsData: Record<string, { wins: number; losses: number; totalPnL: number; count: number }> = {};

  for (const t of closed) {
    const { pnl } = calculateTradePnL(t);
    for (const tag of t.tags) {
      if (!tagsData[tag]) {
        tagsData[tag] = { wins: 0, losses: 0, totalPnL: 0, count: 0 };
      }
      tagsData[tag].count++;
      tagsData[tag].totalPnL += pnl;
      if (pnl > 0) tagsData[tag].wins++;
      else tagsData[tag].losses++;
    }
  }

  return Object.entries(tagsData)
    .map(([tagName, data]) => ({
      tagName,
      ...data,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count); // sort by most used tag
}

// === Calendar Heatmap Data ===

export function calculateDailyPnL(trades) {
  const closed = trades.filter(t => t.sellPrice && t.dateSell);
  const daily: Record<string, number> = {};

  for (const t of closed) {
    const date = t.dateSell;
    const { pnl } = calculateTradePnL(t);
    daily[date] = (daily[date] || 0) + pnl;
  }

  return daily;
}

// === Top Stocks ===

export function calculateTopStocks(trades) {
  const closed = trades.filter(t => t.sellPrice && t.dateSell);
  const stocks: Record<string, { trades: number; totalPnL: number; wins: number }> = {};

  for (const t of closed) {
    if (!stocks[t.stockCode]) {
      stocks[t.stockCode] = { trades: 0, totalPnL: 0, wins: 0 };
    }
    const { pnl } = calculateTradePnL(t);
    stocks[t.stockCode].trades++;
    stocks[t.stockCode].totalPnL += pnl;
    if (pnl > 0) stocks[t.stockCode].wins++;
  }

  return Object.entries(stocks)
    .map(([code, data]) => ({
      code,
      ...data,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
    }))
    .sort((a, b) => b.totalPnL - a.totalPnL);
}

function formatInsightCurrency(value) {
  const absoluteValue = Math.abs(Number(value) || 0);
  const prefix = Number(value) < 0 ? '-' : '';
  return `${prefix}Rp${absoluteValue.toLocaleString('id-ID')}`;
}

const MIN_INSIGHT_SAMPLE = 3;

function getClosedTradesForInsights(trades) {
  return trades.filter((trade) => trade?.dateSell && trade?.sellPrice != null);
}

function calculateHoldingDays(dateBuy, dateSell) {
  if (!dateBuy || !dateSell) return null;
  const buy = new Date(dateBuy);
  const sell = new Date(dateSell);
  if (Number.isNaN(buy.getTime()) || Number.isNaN(sell.getTime())) return null;
  return Math.max(1, Math.ceil(Math.abs(sell.getTime() - buy.getTime()) / (1000 * 60 * 60 * 24)));
}

function buildResultSummary(trades) {
  if (!trades.length) {
    return {
      count: 0,
      wins: 0,
      losses: 0,
      totalPnL: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      expectancy: 0,
    };
  }

  const results = trades.map((trade) => ({
    trade,
    ...calculateTradePnL(trade),
  }));
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
    count: results.length,
    wins: wins.length,
    losses: losses.length,
    totalPnL,
    winRate,
    avgWin,
    avgLoss,
    expectancy,
  };
}

function buildCategorySummaries(trades, getKeys) {
  const grouped = new Map();

  trades.forEach((trade) => {
    const keys = getKeys(trade).map((key) => String(key || '').trim()).filter(Boolean);
    keys.forEach((key) => {
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(trade);
    });
  });

  return Array.from(grouped.entries()).map(([name, items]) => ({
    name,
    ...buildResultSummary(items),
  }));
}

function compareByStrategyInsight(left, right) {
  return (
    right.expectancy - left.expectancy ||
    right.totalPnL - left.totalPnL ||
    right.count - left.count ||
    left.name.localeCompare(right.name, 'id')
  );
}

function compareByEmotionInsight(left, right) {
  return (
    right.winRate - left.winRate ||
    right.totalPnL - left.totalPnL ||
    right.count - left.count ||
    left.name.localeCompare(right.name, 'id')
  );
}

function compareByTagInsight(left, right) {
  return (
    right.expectancy - left.expectancy ||
    right.totalPnL - left.totalPnL ||
    right.count - left.count ||
    left.name.localeCompare(right.name, 'id')
  );
}

export function calculateStrategyInsights(trades) {
  return buildCategorySummaries(getClosedTradesForInsights(trades), (trade) => [trade.strategy])
    .filter((item) => item.count >= MIN_INSIGHT_SAMPLE)
    .sort(compareByStrategyInsight);
}

export function calculateEmotionInsights(trades) {
  return buildCategorySummaries(getClosedTradesForInsights(trades), (trade) => [trade.emotion])
    .filter((item) => item.count >= MIN_INSIGHT_SAMPLE)
    .sort(compareByEmotionInsight);
}

export function calculateTagInsights(trades) {
  return buildCategorySummaries(getClosedTradesForInsights(trades), (trade) => Array.isArray(trade.tags) ? trade.tags : [])
    .filter((item) => item.count >= MIN_INSIGHT_SAMPLE)
    .sort(compareByTagInsight);
}

export function calculateTimingInsights(trades) {
  const closedTrades = getClosedTradesForInsights(trades);
  const dayStats = calculateDayOfWeekPnL(closedTrades)
    .filter((item) => item.count > 0)
    .sort((a, b) => a.pnl - b.pnl);

  const holdingRows = closedTrades
    .map((trade) => {
      const holdingDays = calculateHoldingDays(trade.dateBuy, trade.dateSell);
      if (holdingDays == null) return null;
      return {
        trade,
        holdingDays,
      };
    })
    .filter(Boolean);

  const averageHoldingDays = holdingRows.length > 0
    ? holdingRows.reduce((sum, row) => sum + row.holdingDays, 0) / holdingRows.length
    : 0;

  const fasterTrades = holdingRows
    .filter((row) => row.holdingDays <= averageHoldingDays)
    .map((row) => row.trade);
  const slowerTrades = holdingRows
    .filter((row) => row.holdingDays > averageHoldingDays)
    .map((row) => row.trade);

  const fasterSummary = buildResultSummary(fasterTrades);
  const slowerSummary = buildResultSummary(slowerTrades);
  const healthierBucket = fasterSummary.expectancy >= slowerSummary.expectancy
    ? { key: 'faster', label: 'Holding <= rata-rata', summary: fasterSummary }
    : { key: 'slower', label: 'Holding > rata-rata', summary: slowerSummary };

  return {
    averageHoldingDays,
    bestDay: dayStats[dayStats.length - 1] || null,
    worstDay: dayStats[0] || null,
    holdingPattern: holdingRows.length > 0
      ? {
          faster: fasterSummary,
          slower: slowerSummary,
          healthierBucket,
        }
      : null,
  };
}

function buildInsightItem({
  id,
  title,
  category,
  tone,
  summary,
  metricLabel,
  metricValue,
  metricKind,
  supportingValue,
  priority,
}) {
  return {
    id,
    title,
    category,
    tone,
    summary,
    metricLabel,
    metricValue,
    metricKind,
    supportingValue,
    priority,
  };
}

export function calculateAnalyticsInsights(trades) {
  const closedTrades = getClosedTradesForInsights(trades);
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

  const strategyInsights = calculateStrategyInsights(closedTrades);
  const emotionInsights = calculateEmotionInsights(closedTrades);
  const tagInsights = calculateTagInsights(closedTrades);
  const timingInsights = calculateTimingInsights(closedTrades);

  const items = [];
  const bestStrategy = strategyInsights[0];
  const weakStrategy = strategyInsights.length > 0 ? [...strategyInsights].sort((a, b) => compareByStrategyInsight(a, b)).reverse()[0] : null;
  const bestEmotion = emotionInsights[0];
  const riskEmotion = emotionInsights.length > 0
    ? [...emotionInsights].sort((a, b) => a.totalPnL - b.totalPnL || a.winRate - b.winRate || b.count - a.count)[0]
    : null;
  const bestTag = tagInsights[0];
  const worstDay = timingInsights.worstDay;
  const bestDay = timingInsights.bestDay;
  const holdingPattern = timingInsights.holdingPattern;

  if (bestStrategy) {
    items.push(buildInsightItem({
      id: 'best-strategy',
      title: 'Best Strategy',
      category: 'strategy',
      tone: 'positive',
      summary: `Strategi ${bestStrategy.name} saat ini paling sehat dengan expectancy ${formatInsightCurrency(bestStrategy.expectancy)} dari ${bestStrategy.count} trade.`,
      metricLabel: 'Expectancy',
      metricValue: bestStrategy.expectancy,
      metricKind: 'currency',
      supportingValue: `${bestStrategy.count} trade • Win rate ${bestStrategy.winRate.toFixed(1)}%`,
      priority: 1,
    }));
  }

  if (weakStrategy) {
    items.push(buildInsightItem({
      id: 'weak-strategy',
      title: 'Weak Strategy',
      category: 'strategy',
      tone: 'warning',
      summary: `Strategi ${weakStrategy.name} perlu dievaluasi karena expectancy ${formatInsightCurrency(weakStrategy.expectancy)} dari ${weakStrategy.count} trade.`,
      metricLabel: 'Expectancy',
      metricValue: weakStrategy.expectancy,
      metricKind: 'currency',
      supportingValue: `${weakStrategy.count} trade • Total P/L ${weakStrategy.totalPnL.toLocaleString('id-ID')}`,
      priority: 2,
    }));
  }

  if (bestEmotion) {
    items.push(buildInsightItem({
      id: 'best-emotion-context',
      title: 'Best Emotion Context',
      category: 'emotion',
      tone: 'positive',
      summary: `Kondisi emosi ${bestEmotion.name} paling konsisten dengan win rate ${bestEmotion.winRate.toFixed(1)}% dari ${bestEmotion.count} trade.`,
      metricLabel: 'Win Rate',
      metricValue: bestEmotion.winRate,
      metricKind: 'percent',
      supportingValue: `${bestEmotion.count} trade • Total P/L ${formatInsightCurrency(bestEmotion.totalPnL)}`,
      priority: 3,
    }));
  }

  if (riskEmotion) {
    items.push(buildInsightItem({
      id: 'risk-emotion',
      title: 'Risk Emotion',
      category: 'emotion',
      tone: 'warning',
      summary: `Emosi ${riskEmotion.name} paling sering merugikan dengan total P/L ${formatInsightCurrency(riskEmotion.totalPnL)} dari ${riskEmotion.count} trade.`,
      metricLabel: 'Total P/L',
      metricValue: riskEmotion.totalPnL,
      metricKind: 'currency',
      supportingValue: `${riskEmotion.count} trade • Win rate ${riskEmotion.winRate.toFixed(1)}%`,
      priority: 4,
    }));
  }

  if (bestTag) {
    items.push(buildInsightItem({
      id: 'best-tag',
      title: 'Best Tag',
      category: 'tag',
      tone: 'positive',
      summary: `Tag #${bestTag.name} saat ini paling sehat dengan expectancy ${formatInsightCurrency(bestTag.expectancy)} dari ${bestTag.count} trade.`,
      metricLabel: 'Expectancy',
      metricValue: bestTag.expectancy,
      metricKind: 'currency',
      supportingValue: `${bestTag.count} trade • Win rate ${bestTag.winRate.toFixed(1)}%`,
      priority: 5,
    }));
  }

  if (worstDay) {
    items.push(buildInsightItem({
      id: 'worst-trading-day',
      title: 'Worst Trading Day',
      category: 'timing',
      tone: 'warning',
      summary: `Hari ${worstDay.day} menjadi hari terberat sejauh ini dengan total P/L ${formatInsightCurrency(worstDay.pnl)}.`,
      metricLabel: 'Total P/L',
      metricValue: worstDay.pnl,
      metricKind: 'currency',
      supportingValue: `${worstDay.count} trade ditutup`,
      priority: 6,
    }));
  }

  if (bestDay) {
    items.push(buildInsightItem({
      id: 'best-trading-day',
      title: 'Best Trading Day',
      category: 'timing',
      tone: 'neutral',
      summary: `Hari ${bestDay.day} menghasilkan P/L terbaik sejauh ini sebesar ${formatInsightCurrency(bestDay.pnl)}.`,
      metricLabel: 'Total P/L',
      metricValue: bestDay.pnl,
      metricKind: 'currency',
      supportingValue: `${bestDay.count} trade ditutup`,
      priority: 7,
    }));
  }

  if (holdingPattern) {
    items.push(buildInsightItem({
      id: 'holding-pattern',
      title: 'Holding Pattern',
      category: 'timing',
      tone: holdingPattern.healthierBucket.key === 'faster' ? 'positive' : 'neutral',
      summary: `${holdingPattern.healthierBucket.label} terlihat lebih sehat dengan expectancy ${formatInsightCurrency(holdingPattern.healthierBucket.summary.expectancy)} dibanding rata-rata holding ${timingInsights.averageHoldingDays.toFixed(1)} hari.`,
      metricLabel: 'Avg Holding',
      metricValue: timingInsights.averageHoldingDays,
      metricKind: 'days',
      supportingValue: `<= avg: ${holdingPattern.faster.count} trade • > avg: ${holdingPattern.slower.count} trade`,
      priority: 8,
    }));
  }

  return {
    items: items.sort((a, b) => a.priority - b.priority),
    categoryStates: {
      strategy: { hasEnoughData: strategyInsights.length > 0, count: strategyInsights.length, minSample: MIN_INSIGHT_SAMPLE },
      emotion: { hasEnoughData: emotionInsights.length > 0, count: emotionInsights.length, minSample: MIN_INSIGHT_SAMPLE },
      tag: { hasEnoughData: tagInsights.length > 0, count: tagInsights.length, minSample: MIN_INSIGHT_SAMPLE },
    },
  };
}

// === Calculator Functions ===

export function calcProfitLoss({ buyPrice, sellPrice, lots, buyFee = 0.15, sellFee = 0.25, market = 'ID' }) {
  return calculateTradePnL({ buyPrice, sellPrice, lots, buyFee, sellFee, market });
}

export function calcBrokerFee({ price, lots, buyFeePercent = 0.15, sellFeePercent = 0.25, ppnPercent = 11 }) {
  const shares = lots * 100;
  const totalValue = price * shares;

  const buyCommission = totalValue * (buyFeePercent / 100);
  const buyPPN = buyCommission * (ppnPercent / 100);
  const totalBuyFee = buyCommission + buyPPN;

  const sellCommission = totalValue * (sellFeePercent / 100);
  const sellPPN = sellCommission * (ppnPercent / 100);
  const pphSell = totalValue * 0.001; // 0.1% PPh Final
  const totalSellFee = sellCommission + sellPPN + pphSell;

  return {
    totalValue,
    buyCommission,
    buyPPN,
    totalBuyFee,
    sellCommission,
    sellPPN,
    pphSell,
    totalSellFee,
    totalFee: totalBuyFee + totalSellFee,
  };
}

export function calcAveragePrice(purchases) {
  // purchases = [{ price, lots }, ...]
  let totalValue = 0;
  let totalLots = 0;

  for (const p of purchases) {
    if (p.price > 0 && p.lots > 0) {
      totalValue += p.price * p.lots * 100;
      totalLots += p.lots;
    }
  }

  const avgPrice = totalLots > 0 ? totalValue / (totalLots * 100) : 0;

  return { avgPrice, totalLots, totalValue, totalShares: totalLots * 100 };
}

export function calcPositionSize({ capital, riskPercent, entryPrice, stopLoss }) {
  const riskAmount = capital * (riskPercent / 100);
  const riskPerShare = Math.abs(entryPrice - stopLoss);

  if (riskPerShare <= 0) return { lots: 0, riskAmount, totalInvestment: 0, riskPerShare: 0 };

  const shares = Math.floor(riskAmount / riskPerShare);
  const lots = Math.floor(shares / 100);
  const totalInvestment = lots * 100 * entryPrice;

  return { lots, riskAmount, totalInvestment, riskPerShare, shares: lots * 100 };
}

export function calcTargetPrice({ buyPrice, targetPercent, buyFee = 0.15, sellFee = 0.25 }) {
  const targetPrice = buyPrice * (1 + targetPercent / 100);
  const shares = 100; // per lot
  const totalBuy = buyPrice * shares;
  const totalSell = targetPrice * shares;
  const fee = totalBuy * (buyFee / 100) + totalSell * (sellFee / 100);
  const profit = totalSell - totalBuy - fee;

  return { targetPrice, profitPerLot: profit, feePerLot: fee };
}

// === Portfolio Balance & Buying Power ===

export function calculatePortfolioBalance(trades, cashflows = [], dividends = [], initialCapital = 10000000, market?: 'ID' | 'US') {
  const filteredTrades = market 
    ? trades.filter(t => t.market === market || (!t.market && market === 'ID'))
    : trades;
  
  const filteredCashflows = market
    ? cashflows.filter(c => c.market === market || (!c.market && market === 'ID'))
    : cashflows;

  const filteredDividends = market
    ? dividends.filter(d => d.market === market || (!d.market && market === 'ID'))
    : dividends;

  const netCashflow = filteredCashflows.reduce((sum, cf) => {
    return sum + (cf.type === 'deposit' ? cf.amount : -cf.amount);
  }, 0);

  const totalCapital = initialCapital + netCashflow;

  let realizedPnL = 0;
  const closedTrades = filteredTrades.filter(t => t.sellPrice && t.dateSell);
  for (const t of closedTrades) {
    const { pnl } = calculateTradePnL(t);
    realizedPnL += pnl;
  }

  const totalDividend = filteredDividends.reduce((sum, d) => sum + (d.totalAmount || 0), 0);

  const realizedEquity = totalCapital + realizedPnL + totalDividend;

  let investedAmount = 0;
  const openTrades = filteredTrades.filter(t => !t.sellPrice || !t.dateSell);
  for (const t of openTrades) {
    const { totalBuy, buyCommission } = calculateTradePnL(t);
    investedAmount += (totalBuy + buyCommission);
  }

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
    openPositionsCount: openTrades.length
  };
}

export function calculateOpenPositionSnapshot(trade, marketPrices = {}) {
  const market = trade.market || 'ID';
  const shares = market === 'US' ? trade.lots : trade.lots * 100;
  const totalBuy = trade.buyPrice * shares;
  const buyCommission = totalBuy * ((trade.buyFee || 0) / 100);
  const livePrice = Number(marketPrices?.[trade.stockCode]) || Number(trade.sellPrice) || 0;
  const priceUsed = livePrice > 0 ? livePrice : trade.buyPrice;
  const marketValue = priceUsed * shares;
  const floatingPnL = marketValue - totalBuy - buyCommission;

  return {
    shares,
    totalBuy,
    buyCommission,
    priceUsed,
    marketValue,
    floatingPnL,
    hasLivePrice: livePrice > 0,
    usedFallbackPrice: livePrice <= 0,
  };
}

export function calculatePortfolioAssetMetrics(
  trades,
  cashflows = [],
  dividends = [],
  initialCapital = 10000000,
  marketPrices = {},
  market?: 'ID' | 'US'
) {
  const balance = calculatePortfolioBalance(trades, cashflows, dividends, initialCapital, market);
  const filteredTrades = market
    ? trades.filter(t => (market === 'US' ? t.market === 'US' : t.market !== 'US' || !t.market))
    : trades;

  const openTrades = filteredTrades.filter(t => !t.sellPrice || !t.dateSell);
  const snapshots = openTrades.map((trade) => calculateOpenPositionSnapshot(trade, marketPrices));
  const displayInvestedAmount = snapshots.reduce((sum, snapshot) => sum + snapshot.totalBuy, 0);
  const totalFloatingPnL = snapshots.reduce((sum, snapshot) => {
    return snapshot.hasLivePrice ? sum + snapshot.floatingPnL : sum;
  }, 0);
  const totalMarketValue = snapshots.reduce((sum, snapshot) => sum + snapshot.marketValue, 0);
  const hasMarketValueFallback = snapshots.some((snapshot) => snapshot.usedFallbackPrice);
  const totalAsset = balance.buyingPower + balance.investedAmount + totalFloatingPnL;

  return {
    ...balance,
    displayInvestedAmount,
    totalFloatingPnL,
    totalMarketValue,
    totalAsset,
    hasMarketValueFallback,
  };
}

export function calculatePortfolioAssetIdrEquivalent(idMetrics, usMetrics, usdToIdrRate = 16200) {
  const normalizedRate = Number(usdToIdrRate) > 0 ? Number(usdToIdrRate) : 16200;
  return (idMetrics?.totalAsset || 0) + ((usMetrics?.totalAsset || 0) * normalizedRate);
}

// === Gamifikasi & Achievements ===

export function calculateAchievements(trades, dividends = []) {
  const closed = trades.filter(t => t.sellPrice && t.dateSell);
  const achievements = [];
  
  // 1. First Blood
  achievements.push({
    id: 'first_blood',
    name: 'First Blood',
    desc: 'Mencatat transaksi pertama di jurnal',
    icon: 'Activity',
    unlocked: trades.length > 0
  });

  // 2. Profit Maker
  const hasProfit = closed.some(t => calculateTradePnL(t).pnl > 0);
  achievements.push({
    id: 'profit_maker',
    name: 'Profit Maker',
    desc: 'Mencetak profit pertama kalinya',
    icon: 'TrendingUp',
    unlocked: hasProfit
  });

  // 3. Diamond Hands
  const hasDiamond = closed.some(t => {
    const { pnl } = calculateTradePnL(t);
    const d1 = new Date(t.dateBuy);
    const d2 = new Date(t.dateSell);
    const days = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
    return pnl > 0 && days >= 30;
  });
  achievements.push({
    id: 'diamond_hands',
    name: 'Diamond Hands',
    desc: 'Hold posisi lebih dari 30 hari & profit',
    icon: 'Shield',
    unlocked: hasDiamond
  });

  // 4. Consistent Winner
  let consistent = false;
  if (closed.length >= 10) {
     const wins = closed.filter(t => calculateTradePnL(t).pnl > 0).length;
     if (wins / closed.length >= 0.6) consistent = true;
  }
  achievements.push({
    id: 'consistent',
    name: 'Consistent Winner',
    desc: 'Mencapai win rate di atas 60% (>10 trade)',
    icon: 'Award',
    unlocked: consistent
  });

  // 5. Dividend Hunter
  achievements.push({
    id: 'dividend_hunter',
    name: 'Passive Income',
    desc: 'Mencetak dividen pertama',
    icon: 'DollarSign',
    unlocked: dividends.length > 0
  });

  return achievements;
}

// === Pension Fund Calculator ===

export function calcPensionFund({
  currentAge,
  retireAge,
  monthlyExpense,
  inflationPercent = 4,
  returnPercent = 10,
  swrPercent = 4,
  currentSavings = 0
}) {
  const yearsToRetire = retireAge - currentAge;
  
  if (yearsToRetire <= 0) return null;

  // Hitung inflasi untuk pengeluaran bulanan di masa depan
  const i = inflationPercent / 100;
  const futureMonthlyExpense = monthlyExpense * Math.pow(1 + i, yearsToRetire);
  const futureAnnualExpense = futureMonthlyExpense * 12;

  // 4% rule: Target Dana = Pengeluaran Tahunan / SWR
  const swr = swrPercent / 100;
  const totalFundNeeded = futureAnnualExpense / swr;

  // Future value dari modal/tabungan yang sudah ada saat ini
  const rAnnual = returnPercent / 100;
  const currentSavingsFV = currentSavings * Math.pow(1 + rAnnual, yearsToRetire);

  const shortfall = Math.max(0, totalFundNeeded - currentSavingsFV);

  // Hitung tabungan bulanan yang dibutuhkan (Anuitas)
  const rMonthly = rAnnual / 12;
  const months = yearsToRetire * 12;
  
  let monthlySavingsNeeded = 0;
  if (shortfall > 0 && rMonthly > 0) {
    monthlySavingsNeeded = (shortfall * rMonthly) / (Math.pow(1 + rMonthly, months) - 1);
  } else if (shortfall > 0) {
    monthlySavingsNeeded = shortfall / months;
  }

  // FIRE Number di nilai uang saat ini (Present Value)
  const currentFireNumber = (monthlyExpense * 12) / swr;

  // Coast FIRE: berapa dana yang dibutuhkan SEKARANG agar bisa diendapkan tanpa nabung lagi
  // coastFireNumber = totalFundNeeded / (1 + r)^yearsToRetire
  const coastFireNumber = totalFundNeeded / Math.pow(1 + rAnnual, yearsToRetire);
  const isCoastFIRE = currentSavings >= coastFireNumber;

  return {
    yearsToRetire,
    futureMonthlyExpense,
    totalFundNeeded,
    currentSavingsFV,
    shortfall,
    monthlySavingsNeeded,
    currentFireNumber,
    coastFireNumber,
    isCoastFIRE,
  };
}

// === Average Down Calculator ===

export function calcAverageDown({
  currentAvg,
  currentLots,
  targetAvg,
  currentPrice,
}) {
  // Validasi: target average harus di bawah current average
  if (targetAvg >= currentAvg || currentPrice >= currentAvg) return null;

  const currentShares = currentLots * 100;
  const totalCurrentCost = currentAvg * currentShares;

  // Aljabar: (totalCurrentCost + newLots*100*currentPrice) / (currentShares + newLots*100) = targetAvg
  // => newShares = (targetAvg * currentShares - totalCurrentCost) / (currentPrice - targetAvg)
  const newShares = (targetAvg * currentShares - totalCurrentCost) / (currentPrice - targetAvg);
  const newLots = Math.ceil(newShares / 100);
  const actualNewShares = newLots * 100;
  const additionalCapital = actualNewShares * currentPrice;

  const totalShares = currentShares + actualNewShares;
  const totalCost = totalCurrentCost + additionalCapital;
  const actualNewAvg = totalCost / totalShares;

  const currentLoss = (currentPrice - currentAvg) * currentShares;
  const newLossIfCutNow = (currentPrice - actualNewAvg) * totalShares;

  return {
    newLots,
    additionalCapital,
    totalLots: currentLots + newLots,
    totalShares,
    actualNewAvg,
    totalCost,
    currentLoss,
    newLossIfCutNow,
  };
}

// === Risk/Reward Calculator ===

export function calcRiskReward({
  entryPrice,
  stopLoss,
  takeProfit,
  lots = 1,
}) {
  if (entryPrice <= 0 || stopLoss <= 0 || takeProfit <= 0) return null;
  if (stopLoss >= entryPrice || takeProfit <= entryPrice) return null;

  const shares = lots * 100;
  const riskPerShare = entryPrice - stopLoss;
  const rewardPerShare = takeProfit - entryPrice;

  const riskAmount = riskPerShare * shares;
  const rewardAmount = rewardPerShare * shares;

  const rrRatio = rewardPerShare / riskPerShare;

  // Minimal win rate agar Expected Value >= 0
  // EV = winRate * reward - (1 - winRate) * risk = 0
  // winRate = risk / (risk + reward)
  const minWinRate = (riskPerShare / (riskPerShare + rewardPerShare)) * 100;

  const riskPercent = ((entryPrice - stopLoss) / entryPrice) * 100;
  const rewardPercent = ((takeProfit - entryPrice) / entryPrice) * 100;

  return {
    riskPerShare,
    rewardPerShare,
    riskAmount,
    rewardAmount,
    rrRatio,
    minWinRate,
    riskPercent,
    rewardPercent,
  };
}
