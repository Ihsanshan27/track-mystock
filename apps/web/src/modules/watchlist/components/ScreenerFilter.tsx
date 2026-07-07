import React from 'react';
import SelectionToggleCard from '@/modules/shared/components/SelectionToggleCard';

const SIGNAL_LABELS = {
    BOW: { label: 'Buy on Weakness', color: '#10B981', dim: 'rgba(16,185,129,0.12)' },
    BOB: { label: 'Buy on Breakout', color: '#6366F1', dim: 'rgba(99,102,241,0.12)' },
    ACCUMULATION: { label: 'Accumulation', color: '#F59E0B', dim: 'rgba(245,158,11,0.12)' },
    OVERSOLD_BOUNCE: { label: 'Oversold Bounce', color: '#8B5CF6', dim: 'rgba(139,92,246,0.12)' },
    MOMENTUM: { label: 'Momentum', color: '#3B82F6', dim: 'rgba(59,130,246,0.12)' },
};

const ScreenerFilter = ({ filters, setFilters }) => {
    const handleSelect = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

    return (
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>🎯 Filter Screener</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pilih sinyal & kriteria teknikal</p>
            </div>

            {/* Trading Signals */}
            <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '10px', paddingBottom: '7px', borderBottom: '1px solid var(--border-color)' }}>
                    🚦 Sinyal Trading
                </div>
                <select name="signal" value={filters.signal || ''} onChange={handleSelect} className="form-select" style={{ fontSize: '0.85rem' }}>
                    <option value="">Semua Sinyal</option>
                    <option value="BOW">🎯 Buy on Weakness (BOW)</option>
                    <option value="BOB">💥 Buy on Breakout (BOB)</option>
                    <option value="ACCUMULATION">📦 Accumulation Phase</option>
                    <option value="OVERSOLD_BOUNCE">🔄 Oversold Bounce</option>
                    <option value="MOMENTUM">🚀 Momentum Trend</option>
                </select>
            </div>

            {/* Technical Indicators */}
            <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '10px', paddingBottom: '7px', borderBottom: '1px solid var(--border-color)' }}>
                    📊 Indikator Teknikal
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {[
                        { name: 'macdGoldenCross', label: 'MACD Golden Cross', sub: 'Sinyal beli klasik', color: '#10B981', dim: 'rgba(16,185,129,0.12)' },
                        { name: 'stochasticOversold', label: 'Stochastic Oversold', sub: '%K < 20, potensi rebound', color: '#8B5CF6', dim: 'rgba(139,92,246,0.12)' },
                        { name: 'emaGoldenCross', label: 'EMA Golden Cross', sub: 'EMA50 cross EMA200', color: '#F59E0B', dim: 'rgba(245,158,11,0.12)' },
                    ].map(item => (
                        <div key={item.name} style={{ '--accent-green': item.color } as React.CSSProperties}>
                            <SelectionToggleCard
                                checked={filters[item.name] || false}
                                onToggle={() => setFilters({ ...filters, [item.name]: !(filters[item.name] || false) })}
                                title={item.label}
                                description={item.sub}
                                compact
                                rightContent={(
                                    <span
                                        className={filters[item.name] ? 'badge badge-green' : 'badge'}
                                        style={filters[item.name]
                                            ? { background: item.dim, color: item.color, border: `1px solid ${item.color}` }
                                            : { background: 'var(--bg-input)', color: 'var(--text-muted)' }}
                                    >
                                        {filters[item.name] ? 'Aktif' : 'Pilih'}
                                    </span>
                                )}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Chart Patterns */}
            <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '10px', paddingBottom: '7px', borderBottom: '1px solid var(--border-color)' }}>
                    📈 Pola Chart
                </div>
                <select name="pattern" value={filters.pattern || ''} onChange={handleSelect} className="form-select" style={{ fontSize: '0.85rem' }}>
                    <option value="">Semua Pola</option>
                    <option value="double_bottom">📊 Double Bottom (W)</option>
                    <option value="ihns">🔄 Inverted H&S</option>
                    <option value="bull_flag">🚩 Bull Flag / Pennant</option>
                    <option value="ascending_triangle">📐 Ascending Triangle</option>
                    <option value="candle_bullish">🕯️ Bullish Candlestick</option>
                </select>
            </div>

            {/* Sentiment */}
            <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '10px', paddingBottom: '7px', borderBottom: '1px solid var(--border-color)' }}>
                    📰 Sentimen Berita
                </div>
                <select name="sentiment" value={filters.sentiment || ''} onChange={handleSelect} className="form-select" style={{ fontSize: '0.85rem' }}>
                    <option value="">Semua Sentimen</option>
                    <option value="Positive">📈 Positif (Bullish)</option>
                    <option value="Neutral">🔸 Netral & Positif</option>
                </select>
            </div>

            <button
                onClick={() => setFilters({ macdGoldenCross: false, stochasticOversold: false, emaGoldenCross: false, signal: '', pattern: '', sentiment: '' })}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', marginTop: 'auto' }}
            >
                ↺ Reset Semua Filter
            </button>
        </div>
    );
};

export default ScreenerFilter;
