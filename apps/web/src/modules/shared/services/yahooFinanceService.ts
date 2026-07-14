/**
 * Yahoo Finance Service
 * Fetches OHLCV & quote data for IDX stocks (using .JK suffix)
 *
 * Implements localStorage caching with TTL to speed up page loads
 * and prevent hammering the API on refresh.
 */

const CACHE_PREFIX = 'js_yf_';
const CACHE_TTL_QUOTE = 5 * 60 * 1000;  // 5 minutes for last price
const CACHE_TTL_OHLCV = 30 * 60 * 1000; // 30 minutes for daily history

function getCache(key) {
    try {
        const item = localStorage.getItem(CACHE_PREFIX + key);
        if (!item) return null;
        const parsed = JSON.parse(item);
        if (Date.now() > parsed.expiry) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return parsed.data;
    } catch {
        return null;
    }
}

function setCache(key, data, ttl) {
    try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
            data,
            expiry: Date.now() + ttl
        }));
    } catch {
        // Ignore quota errors silently
    }
}

// CORS proxy chain
const PROXIES = [
    { prefix: 'https://api.allorigins.win/raw?url=', encode: true },
    { prefix: 'https://corsproxy.io/?', encode: true },
    { prefix: 'https://api.codetabs.com/v1/proxy?quest=', encode: false },
];

async function proxyFetch(url) {
    // Add a cache-buster so proxies like allorigins don't return stale 404s
    const fetchUrl = url + (url.includes('?') ? '&' : '?') + `_cb=${Date.now()}`;

    for (const proxy of PROXIES) {
        try {
            const proxiedUrl = proxy.prefix + (proxy.encode ? encodeURIComponent(fetchUrl) : fetchUrl);
            console.log(`[proxyFetch] Trying proxy: ${proxy.prefix} for url: ${url}`);
            const res = await fetch(proxiedUrl, { signal: AbortSignal.timeout(8000) });
            console.log(`[proxyFetch] Proxy response status: ${res.status}`);
            if (!res.ok) continue;
            const text = await res.text();
            if (!text || text.trim().startsWith('<')) {
                console.log(`[proxyFetch] Invalid response text (HTML or empty) from ${proxy.prefix}`);
                continue;
            }

            const json = JSON.parse(text);
            // Ensure we don't return parsed HTML or bad errors masking as OK
            if (json && json.chart && json.chart.error) {
                console.log(`[proxyFetch] Chart error in JSON from ${proxy.prefix}`);
                continue;
            }

            console.log(`[proxyFetch] Success with proxy: ${proxy.prefix}`);
            return json;
        } catch (err) {
            console.warn(`[proxyFetch] Proxy failed: ${proxy.prefix}. Error:`, err);
            // try next proxy
        }
    }
    throw new Error(`Semua proxy CORS gagal atau saham tidak ditemukan untuk URL: ${url}`);
}

const YF_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';

function normalizeYahooSymbol(ticker) {
    if (!ticker) return ticker;
    if (ticker.startsWith('^') || ticker.includes('=') || ticker.includes('.')) {
        return ticker;
    }
    return `${ticker}.JK`;
}

/**
 * Fetch OHLCV + meta (name) for a ticker (cached)
 */
export async function fetchStockOHLCV(ticker, range = '60d') {
    const symbol = normalizeYahooSymbol(ticker);
    const cacheKey = `ohlcv_${symbol}_${range}`;

    const cached = getCache(cacheKey);
    if (cached && cached.length > 0) return cached;

    const url = `${YF_CHART}/${symbol}?interval=1d&range=${range}`;
    const json = await proxyFetch(url);

    const result = json?.chart?.result?.[0];
    if (!result || !result.timestamp) throw new Error(`Data kosong untuk ${symbol}`);

    const { timestamp } = result;
    const { open, high, low, close, volume } = result.indicators.quote[0];

    const data = timestamp.map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        open: open[i] ?? null,
        high: high[i] ?? null,
        low: low[i] ?? null,
        close: close[i] ?? null,
        volume: volume[i] ?? null,
    })).filter(d => d.close !== null);

    if (data.length > 0) {
        setCache(cacheKey, data, CACHE_TTL_OHLCV);
    }
    return data;
}

/**
 * Fetch latest quote (cached)
 */
export async function fetchQuote(ticker, force = false) {
    const symbol = normalizeYahooSymbol(ticker);
    const cacheKey = `quote_${symbol}`;

    if (!force) {
        const cached = getCache(cacheKey);
        if (cached) return cached;
    }

    const url = `${YF_CHART}/${symbol}?interval=1d&range=5d`;
    try {
        const json = await proxyFetch(url);
        const result = json?.chart?.result?.[0];
        if (!result) throw new Error('no result');

        const meta = result.meta || {};
        const closes = result.indicators.quote[0].close.filter(Boolean);
        const last = closes[closes.length - 1];
        const prev = closes[closes.length - 2] || last;
        const changePct = ((last - prev) / prev) * 100;
        const name = meta.longName || meta.shortName || null;

        const data = { ticker, price: last, changePct, name, ok: true };
        setCache(cacheKey, data, CACHE_TTL_QUOTE);
        return data;
    } catch {
        return { ticker, price: null, changePct: null, name: null, ok: false };
    }
}

/**
 * Batch-fetch quotes in bulk.
 * NOTE: The Yahoo Finance v7/quote endpoint has started returning 401 Unauthorized
 * for public proxy connections. To circumvent this, we fall back to querying the
 * v8/chart API (fetchQuote) in parallel batches, which remains fully operational.
 */
export async function fetchQuotesBatch(tickers, delayMs = 150, force = false) {
    const results = {};
    const uncachedTickers = [];

    // 1. Fill from cache first
    for (const ticker of tickers) {
        const symbol = normalizeYahooSymbol(ticker);
        let cached = null;
        if (!force) {
            cached = getCache(`quote_${symbol}`);
        }
        if (cached) {
            results[ticker] = cached;
        } else {
            uncachedTickers.push(ticker);
        }
    }

    if (uncachedTickers.length === 0) return results;

    // 2. Fetch the rest in parallel batches of 3 to avoid proxy rate-limits
    const BATCH_SIZE = 3;

    for (let i = 0; i < uncachedTickers.length; i += BATCH_SIZE) {
        const batch = uncachedTickers.slice(i, i + BATCH_SIZE);
        
        await Promise.all(
            batch.map(async (ticker) => {
                try {
                    const data = await fetchQuote(ticker, force);
                    if (data && data.ok) {
                        results[ticker] = data;
                    }
                } catch (err) {
                    console.error(`Gagal fetch quote untuk ${ticker} via batch:`, err);
                }
            })
        );

        if (i + BATCH_SIZE < uncachedTickers.length) {
            await new Promise(r => setTimeout(r, delayMs)); // delay between proxy calls
        }
    }

    return results;
}

/**
 * Fetch multiple stocks with OHLCV for the Screener page
 */
export async function fetchMultipleStocks(tickers) {
    const results = [];
    const BATCH_SIZE = 4; // Max concurrent stocks to fetch from proxy at once

    for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
        const batch = tickers.slice(i, i + BATCH_SIZE);

        const settled = await Promise.allSettled(
            batch.map(async (ticker) => {
                const [ohlcv, quote] = await Promise.all([
                    fetchStockOHLCV(ticker, '60d'),
                    fetchQuote(ticker)
                ]);
                return {
                    ticker,
                    ohlcv,
                    name: quote.name || ticker,
                };
            })
        );

        results.push(...settled);

        // Short breath for proxy rate limiting if not last batch
        if (i + BATCH_SIZE < tickers.length) {
            await new Promise(r => setTimeout(r, 400));
        }
    }

    return results
        .map((r) => {
            if (r.status === 'fulfilled') return r.value;
            return null;
        })
        .filter(Boolean);
}
