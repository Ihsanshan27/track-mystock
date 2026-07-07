import { bullishengulfingpattern, morningstar, bullishharamicross, threewhitesoldiers } from 'technicalindicators';

// ─────────────────────────────────────────────────────────────────────────────
// CANDLESTICK PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

export function isCandleBullish(ohlcv) {
    if (!ohlcv || ohlcv.length < 3) return { hasCandlePattern: false };
    const input = {
        open: ohlcv.map(d => d.open),
        high: ohlcv.map(d => d.high),
        low: ohlcv.map(d => d.low),
        close: ohlcv.map(d => d.close),
    };
    const engulfing = bullishengulfingpattern(input);
    const morningStar = morningstar(input);
    const harami = bullishharamicross(input);
    const whiteSoldiers = threewhitesoldiers(input);

    const isEngulfing = engulfing.length > 0 && engulfing[engulfing.length - 1];
    const isMorningStar = morningStar.length > 0 && morningStar[morningStar.length - 1];
    const isHarami = harami.length > 0 && harami[harami.length - 1];
    const isWhiteSoldiers = whiteSoldiers.length > 0 && whiteSoldiers[whiteSoldiers.length - 1];

    return {
        isBullishEngulfing: isEngulfing,
        isMorningStar,
        isHarami,
        isThreeWhiteSoldiers: isWhiteSoldiers,
        hasCandlePattern: isEngulfing || isMorningStar || isHarami || isWhiteSoldiers,
        patternName: isEngulfing ? 'Bullish Engulfing' :
            isMorningStar ? 'Morning Star' :
                isWhiteSoldiers ? 'Three White Soldiers' :
                    isHarami ? 'Bullish Harami' : null
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASSIC CHART PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

export function isDoubleBottom(ohlcv) {
    if (ohlcv.length < 20) return false;
    const recent = ohlcv.slice(-20);
    const lows = recent.map(d => d.low);
    const min1Info = findMin(lows.slice(0, 10));
    const min2Info = findMin(lows.slice(10));
    const diff = Math.abs(min1Info.val - min2Info.val) / min1Info.val;
    return diff < 0.05;
}

export function isInvertedHeadAndShoulders(ohlcv) {
    if (ohlcv.length < 30) return false;
    const recent = ohlcv.slice(-30);
    const lows = recent.map(d => d.low);
    const ls = findMin(lows.slice(0, 10));
    const head = findMin(lows.slice(10, 20));
    const rs = findMin(lows.slice(20));
    if (head.val < ls.val && head.val < rs.val) {
        return Math.abs(ls.val - rs.val) / ls.val < 0.05;
    }
    return false;
}

export function isBullFlag(ohlcv) {
    if (ohlcv.length < 15) return false;
    const firstHalf = ohlcv.slice(-15, -7);
    const recentHalf = ohlcv.slice(-7);
    const startPrice = firstHalf[0].close;
    const peakPrice = Math.max(...firstHalf.map(d => d.high));
    if ((peakPrice - startPrice) / startPrice < 0.1) return false;
    const recentHigh = Math.max(...recentHalf.map(d => d.high));
    return recentHigh < peakPrice;
}

export function isAscendingTriangle(ohlcv) {
    if (ohlcv.length < 20) return false;
    const recent = ohlcv.slice(-20);
    const highs = recent.map(d => d.high);
    const lows = recent.map(d => d.low);
    const maxHigh = Math.max(...highs);
    const flatHighsCount = highs.filter(h => (maxHigh - h) / maxHigh < 0.02).length;
    if (flatHighsCount < 3) return false;
    const firstHalfLows = Math.min(...lows.slice(0, 10));
    const secondHalfLows = Math.min(...lows.slice(10));
    return secondHalfLows > firstHalfLows * 1.02;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRADING SIGNALS — ACTIONABLE SETUPS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BUY ON WEAKNESS (BOW)
 * Stock has pulled back from recent high into a support zone and showing
 * early signs of reversal — ideal entry on dip.
 */
export function isBuyOnWeakness(ohlcv, stochData) {
    if (ohlcv.length < 20) return false;
    const closes = ohlcv.slice(-20).map(d => d.close);
    const lastClose = closes[closes.length - 1];
    const recentHigh = Math.max(...closes);

    // Price pulled back 5–25% from recent high
    const pullbackPct = ((recentHigh - lastClose) / recentHigh) * 100;
    if (pullbackPct < 5 || pullbackPct > 25) return false;

    // Stochastic in oversold zone (< 35) — buying pressure potential
    const stoch = stochData?.[stochData.length - 1];
    const isOversold = stoch && stoch.k < 35;

    // Price starting to recover (last candle > 3 candles ago)
    const isRecovering = lastClose > closes[closes.length - 4];

    return isOversold || isRecovering;
}

/**
 * BUY ON BREAKOUT (BOB)
 * Price breaks above the resistance of the last 20 candles with volume surge.
 */
export function isBuyOnBreakout(ohlcv) {
    if (ohlcv.length < 25) return false;

    const history = ohlcv.slice(-25, -2);   // previous 23 candles as base
    const latest = ohlcv.slice(-2);          // last 2 candles as breakout signal

    const resistance = Math.max(...history.map(d => d.close));
    const lastClose = latest[latest.length - 1].close;

    // Must break ≥0.5% above resistance
    if (lastClose <= resistance * 1.005) return false;

    // Volume confirmation: last candle volume > 120% of avg of prior 20
    const avgVol = history.slice(-20).reduce((s, d) => s + (d.volume || 0), 0) / 20;
    const lastVol = latest[latest.length - 1].volume || 0;

    return lastVol > avgVol * 1.2;
}

/**
 * ACCUMULATION PHASE
 * Price is consolidating in a tight range with buyers slowly accumulating.
 * Often precedes a significant upward move.
 */
export function isAccumulation(ohlcv) {
    if (ohlcv.length < 15) return false;
    const recent = ohlcv.slice(-15);
    const closes = recent.map(d => d.close);
    const high = Math.max(...closes);
    const low = Math.min(...closes);

    // Range must be tight (< 8% spread between high and low)
    const rangePercent = (high - low) / low * 100;
    if (rangePercent >= 8) return false;

    // Volume should be building (avg vol last 5 days > avg vol first 10 days)
    const earlyVol = recent.slice(0, 10).reduce((s, d) => s + (d.volume || 0), 0) / 10;
    const recentVol = recent.slice(-5).reduce((s, d) => s + (d.volume || 0), 0) / 5;
    const volumeBuilding = recentVol > earlyVol * 1.1;

    // Price holding or slightly rising (not falling)
    const isStableOrRising = closes[closes.length - 1] >= closes[0] * 0.97;

    return volumeBuilding && isStableOrRising;
}

/**
 * OVERSOLD BOUNCE SETUP
 * Strong sell-off puts price deeply oversold, now showing first signs of bounce.
 */
export function isOversoldBounce(ohlcv, stochData) {
    if (ohlcv.length < 10) return false;
    const closes = ohlcv.slice(-10).map(d => d.close);
    const last = closes[closes.length - 1];
    const prev3Avg = (closes[closes.length - 4] + closes[closes.length - 3] + closes[closes.length - 2]) / 3;

    // Strong prior sell-off in the last 10 days
    const maxPrior = Math.max(...closes.slice(0, 7));
    const selloffPct = ((maxPrior - Math.min(...closes.slice(0, 9))) / maxPrior) * 100;
    const hadSelloff = selloffPct >= 8;

    // Stochastic deeply oversold
    const stoch = stochData?.[stochData.length - 1];
    const deeplyOversold = stoch && stoch.k < 20;

    // Last candle is bouncing up
    const isBouncing = last > prev3Avg;

    return hadSelloff && deeplyOversold && isBouncing;
}

/**
 * TREND FOLLOWING (Momentum)
 * Price consistently making higher highs + higher lows with volume.
 */
export function isMomentumTrend(ohlcv) {
    if (ohlcv.length < 20) return false;
    const recent = ohlcv.slice(-20);

    let higherHighs = 0;
    let higherLows = 0;

    for (let i = 1; i < recent.length; i++) {
        if (recent[i].high > recent[i - 1].high) higherHighs++;
        if (recent[i].low > recent[i - 1].low) higherLows++;
    }

    // At least 60% of candles making higher highs AND higher lows
    const hhRatio = higherHighs / (recent.length - 1);
    const hlRatio = higherLows / (recent.length - 1);

    return hhRatio >= 0.6 && hlRatio >= 0.55;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function findMin(arr) {
    let min = arr[0]; let idx = 0;
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] < min) { min = arr[i]; idx = i; }
    }
    return { val: min, index: idx };
}
