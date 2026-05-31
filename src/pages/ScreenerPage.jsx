import React, { useState, useEffect, useCallback, useRef } from 'react';
import ScreenerFilter from '../components/ScreenerFilter';
import StockCard from '../components/StockCard';
import { getScreenerData } from '../services/screenerService';
import { fetchQuotesBatch } from '../services/yahooFinanceService';
import { isMacdGoldenCross, isStochasticOversold, isEmaGoldenCross, getLatestEmaValues, calculateIndicators } from '../utils/technicalIndicators';
import {
    isDoubleBottom, isInvertedHeadAndShoulders, isBullFlag, isAscendingTriangle, isCandleBullish,
    isBuyOnWeakness, isBuyOnBreakout, isAccumulation, isOversoldBounce, isMomentumTrend,
} from '../utils/patternRecognition';
import { generateAnalysis } from '../utils/generateAnalysis';
import { EMITEN_DATA, SECTORS, getTickersBySector } from '../data/commodityData';
import { Search, RefreshCw, AlertTriangle, Zap } from 'lucide-react';

const Skeleton = () => (
    <div className="card" style={{ overflow: 'hidden', opacity: 0.6 }}>
        <div style={{ height: '3px', background: 'var(--border-color)' }} />
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[['80px', '22px'], ['140px', '14px'], ['100%', '80px'], ['100%', '50px'], ['100%', '36px']].map(([w, h], i) => (
                <div key={i} style={{ width: w, height: h, background: 'var(--border-color)', borderRadius: '6px', animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:0.3} }`}</style>
    </div>
);

function enrichStock(stock) {
    const ohlcv = stock.ohlcv;
    if (!ohlcv || ohlcv.length < 10) return null;

    const ind = calculateIndicators(ohlcv);
    const emaValues = getLatestEmaValues(ind.ema50, ind.ema200);

    const indicators = {
        isMacdGoldenCross: isMacdGoldenCross(ind.macd),
        isStochasticOversold: isStochasticOversold(ind.stochastic),
        isEmaGoldenCross: isEmaGoldenCross(ind.ema50, ind.ema200),
        emaValues,
    };

    // Chart patterns
    const candleInfo = isCandleBullish(ohlcv);
    const matchedPatterns = [];
    if (isDoubleBottom(ohlcv)) matchedPatterns.push('Double Bottom');
    if (isInvertedHeadAndShoulders(ohlcv)) matchedPatterns.push('IHNS');
    if (isBullFlag(ohlcv)) matchedPatterns.push('Bull Flag');
    if (isAscendingTriangle(ohlcv)) matchedPatterns.push('Asc. Triangle');
    if (candleInfo.hasCandlePattern && candleInfo.patternName) matchedPatterns.push(candleInfo.patternName);

    // Trading signals (actionable setups)
    const matchedSignals = [];
    if (isBuyOnWeakness(ohlcv, ind.stochastic)) matchedSignals.push('BOW');
    if (isBuyOnBreakout(ohlcv)) matchedSignals.push('BOB');
    if (isAccumulation(ohlcv)) matchedSignals.push('ACCUMULATION');
    if (isOversoldBounce(ohlcv, ind.stochastic)) matchedSignals.push('OVERSOLD_BOUNCE');
    if (isMomentumTrend(ohlcv)) matchedSignals.push('MOMENTUM');

    const analysis = generateAnalysis({
        patterns: matchedPatterns,
        signals: matchedSignals,
        indicators,
        sentiment: stock.sentiment,
        ticker: stock.ticker,
        emaValues,
    });

    // Signal strength score for ranking
    const score =
        (indicators.isMacdGoldenCross ? 2 : 0) +
        (indicators.isStochasticOversold ? 2 : 0) +
        (indicators.isEmaGoldenCross ? 3 : 0) +
        matchedPatterns.length * 2 +
        matchedSignals.length * 3;

    return { ...stock, indicators, patterns: { matchedPatterns }, signals: matchedSignals, analysis, score };
}

function filterStocks(stocks, filters) {
    return stocks.filter(stock => {
        if (filters.macdGoldenCross && !stock.indicators.isMacdGoldenCross) return false;
        if (filters.stochasticOversold && !stock.indicators.isStochasticOversold) return false;
        if (filters.emaGoldenCross && !stock.indicators.isEmaGoldenCross) return false;
        if (filters.signal) {
            if (!stock.signals?.includes(filters.signal)) return false;
        }
        if (filters.pattern) {
            const matched = stock.patterns.matchedPatterns;
            if (filters.pattern === 'double_bottom' && !matched.includes('Double Bottom')) return false;
            if (filters.pattern === 'ihns' && !matched.includes('IHNS')) return false;
            if (filters.pattern === 'bull_flag' && !matched.includes('Bull Flag')) return false;
            if (filters.pattern === 'ascending_triangle' && !matched.includes('Asc. Triangle')) return false;
            if (filters.pattern === 'candle_bullish' && !matched.some(m => ['Bullish Engulfing', 'Morning Star', 'Three White Soldiers', 'Bullish Harami'].includes(m))) return false;
        }
        if (filters.sentiment === 'Positive' && stock.sentiment !== 'Positive') return false;
        if (filters.sentiment === 'Neutral' && stock.sentiment === 'Negative') return false;
        return true;
    });
}

const ScreenerPage = () => {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanMode, setScanMode] = useState('Top Gainers Default'); // State for UI representation
    const [error, setError] = useState(null);
    const [tickerInput, setTickerInput] = useState('');
    const [filters, setFilters] = useState({
        macdGoldenCross: false,
        stochasticOversold: false,
        emaGoldenCross: false,
        signal: '',
        pattern: '',
        sentiment: '',
    });

    const isFirstRun = useRef(true);

    const activeFilterCount = [
        filters.macdGoldenCross, filters.stochasticOversold, filters.emaGoldenCross,
        !!filters.signal, !!filters.pattern, !!filters.sentiment,
    ].filter(Boolean).length;

    const loadData = useCallback(async (customTickers = null, applyFullScan = false) => {
        setLoading(true);
        setError(null);

        try {
            let tickersToScan = [];

            if (customTickers && customTickers.length > 0) {
                // 1. SPECIFIC TICKERS SCANNED
                tickersToScan = customTickers;
                setScanMode('Kustom / Sektor');
            } else if (applyFullScan) {
                // 2. FULL MARKET SCAN (because filters are active)
                tickersToScan = [...new Set(EMITEN_DATA.map(e => e.ticker))];
                setScanMode('Scan Seluruh Pasar (120+ Saham)');
            } else {
                // 3. DEFAULT (No Input, No Filters -> Top 10 Gainers)
                setScanMode('Top 10 Gainers Hari Ini');
                const allTickers = [...new Set(EMITEN_DATA.map(e => e.ticker))];
                const quotes = await fetchQuotesBatch(allTickers);

                tickersToScan = Object.values(quotes)
                    .filter(q => q && q.ok && q.price !== null)
                    .sort((a, b) => b.changePct - a.changePct)
                    .map(q => q.ticker)
                    .slice(0, 10);
            }

            const rawData = await getScreenerData(tickersToScan);
            if (rawData.length > 0) {
                const enriched = rawData.map(enrichStock).filter(Boolean);
                // Sort by signal strength score
                enriched.sort((a, b) => {
                    if (b.score === a.score && applyFullScan === false && (!customTickers || customTickers.length === 0)) {
                        // Keep top gainer order if they have same score in Top Gainer mode
                        const changeA = stock => {
                            const last = stock.ohlcv[stock.ohlcv.length - 1].close;
                            const prev = stock.ohlcv[stock.ohlcv.length - 2].close;
                            return (last - prev) / prev;
                        };
                        return changeA(b) - changeA(a);
                    }
                    return b.score - a.score;
                });
                setStocks(enriched);
            } else {
                setError('Tidak ada data yang berhasil dimuat. Coba lagi.');
            }
        } catch (err) {
            setError(`Gagal memuat data: ${err.message}`);
        }

        setLoading(false);
    }, []);

    // Initial Load (Default mode)
    useEffect(() => {
        if (isFirstRun.current) {
            loadData();
            isFirstRun.current = false;
        }
    }, [loadData]);

    // Re-scan Full Market automatically if filters are modified but no tickers are specified
    const prevFilterCountRef = useRef(0);
    useEffect(() => {
        if (isFirstRun.current) return;

        // If we just enabled filters and there is no custom input, run full scan
        if (activeFilterCount > 0 && prevFilterCountRef.current === 0 && !tickerInput.trim()) {
            loadData(null, true);
        }
        // If we cleared all filters and have no custom input, revert to Top Gainers
        else if (activeFilterCount === 0 && prevFilterCountRef.current > 0 && !tickerInput.trim()) {
            loadData();
        }

        prevFilterCountRef.current = activeFilterCount;
    }, [filters, activeFilterCount, tickerInput, loadData]);

    const handleScan = () => {
        const tickers = tickerInput.split(/[\s,]+/).map(t => t.trim().toUpperCase()).filter(Boolean);
        loadData(tickers.length > 0 ? tickers : null, activeFilterCount > 0);
    };

    const filteredStocks = filterStocks(stocks, filters);
    return (
        <div className="page-container">
            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-glow-green)', flexShrink: 0 }}>
                        <Zap size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                            Advanced Stock Screener
                        </h1>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Temukan saham dengan setup teknikal terbaik — BOW, BOB, reversal, accumulation, dan momentum
                        </p>
                    </div>
                </div>

                {/* Ticker Search & Sector Select */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <input
                            value={tickerInput}
                            onChange={e => setTickerInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleScan()}
                            placeholder="Kosongkan untuk Top Gainers/Full Scan, atau masukkan kode (cth: BBCA, ADRO)"
                            className="form-input"
                            style={{ paddingLeft: '40px', fontSize: '0.875rem' }}
                        />
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>

                    <select
                        onChange={e => {
                            if (!e.target.value) return;
                            const sectorTickers = getTickersBySector(e.target.value).map(t => t.ticker).join(', ');
                            setTickerInput(sectorTickers);
                            loadData(sectorTickers.split(', '), activeFilterCount > 0);
                        }}
                        className="form-select"
                        style={{ width: '180px', fontSize: '0.85rem' }}
                    >
                        <option value="">📂 Pilih Sektor...</option>
                        {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <button onClick={handleScan} disabled={loading} className="btn btn-primary" style={{ flexShrink: 0 }}>
                        <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        {loading ? 'Scanning...' : 'Scan'}
                    </button>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                    {[
                        { label: 'Mode Scan Aktif', value: scanMode, icon: scanMode.includes('Top') ? '🔥' : '📡', accent: 'blue' },
                        { label: 'Total Saham Di-scan', value: stocks.length, icon: '📋' },
                        { label: 'Memenuhi Filter', value: filteredStocks.length, icon: '✅', accent: 'green' },
                        { label: 'Filter Aktif', value: activeFilterCount, icon: '🎯', accent: activeFilterCount > 0 ? 'yellow' : null },
                    ].map(stat => (
                        <div key={stat.label} className="stat-card" style={{ padding: '12px 18px', flex: '0 1 auto', minWidth: '120px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.2rem' }}>{stat.icon}</span>
                            <div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</div>
                                <div style={{ fontSize: stat.value.length > 20 ? '0.85rem' : '1.1rem', fontWeight: 700, color: stat.accent === 'green' ? 'var(--accent-green)' : stat.accent === 'blue' ? 'var(--accent-blue)' : stat.accent === 'yellow' ? 'var(--accent-yellow)' : 'var(--text-primary)' }}>
                                    {loading ? '—' : stat.value}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px', alignItems: 'start' }}>
                {/* Sidebar */}
                <div style={{ position: 'sticky', top: '88px' }}>
                    <ScreenerFilter filters={filters} setFilters={setFilters} />
                </div>

                {/* Results */}
                <div>
                    {/* Error Banner */}
                    {error && (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', background: 'var(--accent-red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                            <AlertTriangle size={16} style={{ color: 'var(--accent-red)', flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--accent-red)', margin: '0 0 8px' }}>{error}</p>
                                <button onClick={() => loadData()} className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '4px 12px' }}>Coba Lagi</button>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Hasil Screening
                            {!loading && filteredStocks.some(s => s.signals?.length > 0) && scanMode !== 'Top 10 Gainers Hari Ini' && (
                                <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '8px' }}>
                                    diurutkan kekuatan sinyal
                                </span>
                            )}
                        </h3>
                    </div>

                    {loading ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
                            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} />)}
                        </div>
                    ) : filteredStocks.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
                            {filteredStocks.map(stock => (
                                <StockCard key={stock.ticker} stock={stock} indicators={stock.indicators} patterns={stock.patterns} signals={stock.signals || []} />
                            ))}
                        </div>
                    ) : !error ? (
                        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
                            <div className="empty-state-icon">🔍</div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Tidak Ada Saham yang Cocok</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '360px', margin: '0 auto 24px' }}>
                                Coba longgarkan filter indikator.
                            </p>
                            <button onClick={() => setFilters({ macdGoldenCross: false, stochasticOversold: false, emaGoldenCross: false, signal: '', pattern: '', sentiment: '' })} className="btn btn-primary">
                                Reset Semua Filter
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    );
};

export default ScreenerPage;
