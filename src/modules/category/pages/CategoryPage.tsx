import React, { useState, useEffect, useCallback } from 'react';
import { EMITEN_DATA, SECTORS, SECTOR_META, getTickersBySector } from '@/modules/shared/utils/commodityData';
import { fetchQuotesBatch } from '@/modules/shared/services/yahooFinanceService';
import { TrendingUp, TrendingDown, Loader2, RefreshCw, Layers, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface QuoteData {
    ticker: string;
    price: number | null;
    changePct: number;
    name: string;
    ok: boolean;
}

interface StockRowProps {
    emiten: { ticker: string; name: string };
    quote?: QuoteData;
}

// ------------------
// Single mini stock row
// ------------------
const StockRow = ({ emiten, quote }: StockRowProps) => {
    const hasPrices = quote?.ok && quote.price !== null;
    const isUp = hasPrices && quote.changePct >= 0;
    // Use real company name from Yahoo Finance API if available, else fall back to static
    const displayName = quote?.name || emiten.name;

    return (
        <div
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)', background: 'rgba(15,23,42,0.4)',
                transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,41,59,0.7)'; e.currentTarget.style.borderColor = 'var(--border-color-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.4)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                <span style={{
                    fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)',
                    background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                    padding: '1px 7px', borderRadius: 'var(--radius-sm)', letterSpacing: '0.02em', flexShrink: 0,
                }}>
                    {emiten.ticker}
                </span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {displayName}
                </span>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                {hasPrices ? (
                    <>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Rp {Math.round(quote.price).toLocaleString('id-ID')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', fontSize: '0.72rem', fontWeight: 700, color: isUp ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {isUp ? '+' : ''}{quote.changePct.toFixed(2)}%
                        </div>
                    </>
                ) : (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                )}
            </div>
        </div>
    );
};

interface SectorCardProps {
    sector: string;
    emitens: Array<{ ticker: string; name: string }>;
    quotes: Record<string, QuoteData>;
    loadedSectors: Set<unknown>;
}

// ------------------
// Single sector card (collapsible)
// ------------------
const SectorCard = ({ sector, emitens, quotes, loadedSectors }: SectorCardProps) => {
    const [open, setOpen] = useState(false);
    const meta = SECTOR_META[sector] || { icon: '📦', color: 'var(--text-secondary)', dim: 'rgba(100,116,139,0.15)' };
    const isLoaded = loadedSectors.has(sector);

    const prices = emitens.map(e => quotes[e.ticker]).filter((q): q is QuoteData => q != null && q.ok && q.price !== null);
    const avgChange = prices.length > 0
        ? prices.reduce((s, q) => s + q.changePct, 0) / prices.length
        : null;
    const gainers = prices.filter(q => q.changePct > 0).length;
    const losers = prices.filter(q => q.changePct < 0).length;

    return (
        <div
            className="card"
            style={{ overflow: 'hidden', transition: 'box-shadow 0.25s, border-color 0.25s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--border-color-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = ''; }}
        >
            {/* Sector Header */}
            <div
                onClick={() => setOpen(v => !v)}
                style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', userSelect: 'none' }}
            >
                {/* Icon */}
                <div style={{
                    width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: meta.dim,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0,
                    border: `1px solid ${meta.color}30`,
                }}>
                    {meta.icon}
                </div>

                {/* Title */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
                        {sector}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '3px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{emitens.length} emiten</span>
                        {isLoaded && prices.length > 0 && (
                            <>
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent-green)' }}>▲ {gainers}</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent-red)' }}>▼ {losers}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Avg Change Badge */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                    {isLoaded && avgChange !== null ? (
                        <span style={{
                            fontSize: '0.8rem', fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)',
                            background: avgChange >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)',
                            color: avgChange >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                        }}>
                            {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}% avg
                        </span>
                    ) : isLoaded ? (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>no data</span>
                    ) : (
                        <Loader2 size={14} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />
                    )}
                    <span style={{ color: 'var(--text-muted)' }}>
                        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                </div>
            </div>

            {/* Expanded Stock List */}
            {open && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '12px' }}>
                        {emitens.map(e => (
                            <StockRow key={e.ticker} emiten={e} quote={quotes[e.ticker]} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ------------------
// Main Page
// ------------------
const CategoryPage = () => {
    const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
    const [loadedSectors, setLoadedSectors] = useState<Set<unknown>>(new Set());
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('sector'); // 'sector' | 'change'

    const loadAllQuotes = useCallback(async () => {
        setLoading(true);

        const allTickers = [...new Set(EMITEN_DATA.map(e => e.ticker))];
        const results = await fetchQuotesBatch(allTickers);

        setQuotes(results as Record<string, QuoteData>);
        setLoadedSectors(new Set(SECTORS));
        setLoading(false);
        setLastUpdated(new Date());
    }, []);

    useEffect(() => {
        loadAllQuotes();
    }, [loadAllQuotes]);

    // Filter sectors/emitens by search
    const filteredSectors = SECTORS.filter(sector => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        if (sector.toLowerCase().includes(q)) return true;
        return getTickersBySector(sector).some(e => e.ticker.toLowerCase().includes(q) || e.name.toLowerCase().includes(q));
    });

    // Sort
    const sortedSectors = [...filteredSectors].sort((a, b) => {
        if (sortBy === 'change') {
            const getAvg = (sector: string) => {
                const prices = getTickersBySector(sector).map(e => quotes[e.ticker]).filter((q): q is QuoteData => q != null && q.ok && q.price !== null);
                return prices.length > 0 ? prices.reduce((s, q) => s + q.changePct, 0) / prices.length : -999;
            };
            return getAvg(b) - getAvg(a);
        }
        return 0; // keep original sector order
    });

    // Summary stats
    const allQuotes = Object.values(quotes).filter((q): q is QuoteData => q != null && q.ok && q.price !== null);
    const totalGainers = allQuotes.filter(q => q.changePct > 0).length;
    const totalLosers = allQuotes.filter(q => q.changePct < 0).length;
    const loadProgress = Math.round((loadedSectors.size / SECTORS.length) * 100);

    return (
        <div className="page-container">
            {/* Page Header */}
            <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(139,92,246,0.3)', flexShrink: 0,
                    }}>
                        <Layers size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                            Emiten per Komoditas
                        </h1>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {lastUpdated
                                ? `Data diperbarui: ${lastUpdated.toLocaleTimeString('id-ID')} • real-time via Yahoo Finance`
                                : loading
                                    ? `Memuat harga pasar... ${loadProgress}%`
                                    : 'Data siap'}
                        </p>
                    </div>
                    <button
                        onClick={loadAllQuotes}
                        disabled={loading}
                        className="btn btn-secondary"
                        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                    >
                        <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        Refresh
                    </button>
                </div>

                {/* Progress bar */}
                {loading && (
                    <div style={{ height: '3px', background: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginTop: '12px' }}>
                        <div style={{ height: '100%', width: `${loadProgress}%`, background: 'linear-gradient(90deg, #8B5CF6, #6366F1)', borderRadius: 'var(--radius-full)', transition: 'width 0.4s ease' }} />
                    </div>
                )}

                {/* Stats bar */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                    {[
                        { label: 'Sektor', value: SECTORS.length, icon: '📂' },
                        { label: 'Total Emiten', value: [...new Set(EMITEN_DATA.map(e => e.ticker))].length, icon: '📋' },
                        { label: 'Naik Hari Ini', value: totalGainers, icon: '📈', color: 'var(--accent-green)' },
                        { label: 'Turun Hari Ini', value: totalLosers, icon: '📉', color: 'var(--accent-red)' },
                    ].map(stat => (
                        <div key={stat.label} className="stat-card" style={{ padding: '11px 16px', flex: '0 1 auto', minWidth: '100px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1rem' }}>{stat.icon}</span>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: stat.color || 'var(--text-primary)' }}>{stat.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Search & Sort */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari sektor atau kode saham... (cth: COAL, ADRO, CPO)"
                            className="form-input"
                            style={{ paddingLeft: '38px', fontSize: '0.875rem' }}
                        />
                        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    </div>
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="form-select"
                        style={{ width: '180px', fontSize: '0.875rem' }}
                    >
                        <option value="sector">Urut: Sektor (Default)</option>
                        <option value="change">Urut: % Perubahan ↓</option>
                    </select>
                </div>
            </div>

            {/* Sector Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px' }}>
                {sortedSectors.map(sector => (
                    <SectorCard
                        key={sector}
                        sector={sector}
                        emitens={getTickersBySector(sector)}
                        quotes={quotes}
                        loadedSectors={loadedSectors}
                    />
                ))}
            </div>

            {sortedSectors.length === 0 && (
                <div className="card" style={{ padding: '60px 24px', textAlign: 'center', gridColumn: '1 / -1' }}>
                    <div className="empty-state-icon">🔍</div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Tidak Ditemukan</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Tidak ada sektor atau emiten yang cocok dengan pencarian "{search}".
                    </p>
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    );
};

export default CategoryPage;
