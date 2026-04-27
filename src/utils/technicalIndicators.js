import { MACD, EMA, Stochastic } from 'technicalindicators';

export function calculateIndicators(ohlcv) {
    if (!ohlcv || ohlcv.length === 0) return {};

    const closePrices = ohlcv.map(d => d.close);
    const highPrices = ohlcv.map(d => d.high);
    const lowPrices = ohlcv.map(d => d.low);

    // MACD
    const macdInput = {
        values: closePrices,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    };
    let macdResult = [];
    try { macdResult = MACD.calculate(macdInput); } catch (e) { }

    // EMA (e.g. 50 and 200 for Golden Cross)
    let ema50Result = [];
    let ema200Result = [];
    try {
        ema50Result = EMA.calculate({ period: 50, values: closePrices });
        ema200Result = EMA.calculate({ period: 200, values: closePrices });
    } catch (e) { }

    // Stochastic (14, 3, 3)
    const stochInput = {
        high: highPrices,
        low: lowPrices,
        close: closePrices,
        period: 14,
        signalPeriod: 3
    };
    let stochResult = [];
    try { stochResult = Stochastic.calculate(stochInput); } catch (e) { }

    return {
        macd: macdResult,
        ema50: ema50Result,
        ema200: ema200Result,
        stochastic: stochResult,
    };
}

export function isMacdGoldenCross(macdData) {
    if (!macdData || macdData.length < 2) return false;
    const current = macdData[macdData.length - 1];
    const previous = macdData[macdData.length - 2];

    if (!current || !previous || current.MACD === undefined || current.signal === undefined) return false;

    // Golden cross: MACD crosses Signal Line from below
    return previous.MACD <= previous.signal && current.MACD > current.signal;
}

export function isStochasticOversold(stochData) {
    if (!stochData || stochData.length === 0) return false;
    const current = stochData[stochData.length - 1];

    if (!current || current.k === undefined || current.d === undefined) return false;

    // %K crosses above %D in oversold region (< 20)
    return current.k < 20 && current.d < 20 && current.k > current.d;
}

/**
 * EMA Golden Cross: EMA50 crosses above EMA200 from below
 */
export function isEmaGoldenCross(ema50Data, ema200Data) {
    if (!ema50Data || !ema200Data || ema50Data.length < 2 || ema200Data.length < 2) return false;

    // EMA50 has fewer elements due to longer calculation period offset
    // Align by taking last 2 of each
    const ema50Curr = ema50Data[ema50Data.length - 1];
    const ema50Prev = ema50Data[ema50Data.length - 2];

    // EMA200 may be shorter array — align it with EMA50 length difference
    const offset = ema50Data.length - ema200Data.length;
    const ema200Curr = ema200Data[ema200Data.length - 1];
    const ema200Prev = ema200Data[ema200Data.length - 2];

    if (!ema50Curr || !ema200Curr) return false;

    // Golden cross: EMA50 crosses EMA200 from below
    return ema50Prev <= ema200Prev && ema50Curr > ema200Curr;
}

/**
 * Get the latest EMA50 and EMA200 values for display
 */
export function getLatestEmaValues(ema50Data, ema200Data) {
    return {
        ema50: ema50Data?.length ? ema50Data[ema50Data.length - 1] : null,
        ema200: ema200Data?.length ? ema200Data[ema200Data.length - 1] : null,
    };
}
