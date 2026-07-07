import React, { useState } from 'react';
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Newspaper, ChevronDown, ChevronUp, Brain } from 'lucide-react';

const SIGNAL_BADGES = {
    BOW: { label: '🎯 Buy on Weakness', color: '#10B981', dim: 'rgba(16,185,129,0.15)' },
    BOB: { label: '💥 Buy on Breakout', color: '#6366F1', dim: 'rgba(99,102,241,0.15)' },
    ACCUMULATION: { label: '📦 Accumulation', color: '#F59E0B', dim: 'rgba(245,158,11,0.15)' },
    OVERSOLD_BOUNCE: { label: '🔄 Oversold Bounce', color: '#8B5CF6', dim: 'rgba(139,92,246,0.15)' },
    MOMENTUM: { label: '🚀 Momentum', color: '#3B82F6', dim: 'rgba(59,130,246,0.15)' },
};

const PATTERN_BADGES = {
    'Double Bottom': { bg: 'rgba(59,130,246,0.12)', color: '#60A5FA' },
    'IHNS': { bg: 'rgba(139,92,246,0.12)', color: '#A78BFA' },
    'Bull Flag': { bg: 'rgba(16,185,129,0.12)', color: '#34D399' },
    'Asc. Triangle': { bg: 'rgba(245,158,11,0.12)', color: '#FBB924' },
    'Bullish Engulfing': { bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
    'Morning Star': { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
    'Three White Soldiers': { bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
    'Bullish Harami': { bg: 'rgba(139,92,246,0.12)', color: '#8B5CF6' },
};

const StockCard = ({ stock, indicators, patterns, signals = [] }) => {
    const [analysisOpen, setAnalysisOpen] = useState(false);

    const lastClose = stock.ohlcv[stock.ohlcv.length - 1].close;
    const prevClose = stock.ohlcv[stock.ohlcv.length - 2].close;
    const change = ((lastClose - prevClose) / prevClose) * 100;
    const isUp = change >= 0;
    const isPositive = stock.sentiment === 'Positive';
    const isNegative = stock.sentiment === 'Negative';

    const sentimentStyle = {
        background: isPositive ? 'rgba(16,185,129,0.12)' : isNegative ? 'rgba(239,68,68,0.12)' : 'rgba(100,116,139,0.15)',
        color: isPositive ? '#10B981' : isNegative ? '#EF4444' : 'var(--text-secondary)',
    };

    const emaValues = indicators.emaValues || {};
    const hasEma = emaValues.ema50 && emaValues.ema200;
    const topSignal = signals[0] && SIGNAL_BADGES[signals[0]];

    return (
        <div
            className="card"
            style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'transform 0.25s, box-shadow 0.25s, border-color 0.25s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
        >
            {/* Top accent bar */}
            <div style={{ height: '3px', background: topSignal ? `linear-gradient(90deg, ${topSignal.color}, ${topSignal.color}88)` : isUp ? 'linear-gradient(90deg, var(--accent-green), var(--accent-blue))' : 'linear-gradient(90deg, var(--accent-red), #E11D48)' }} />

            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>

                {/* Signal Badges — shown first if any */}
                {signals.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {signals.map(sig => {
                            const s = SIGNAL_BADGES[sig];
                            if (!s) return null;
                            return (
                                <span key={sig} style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: s.dim, color: s.color, border: `1px solid ${s.color}44`, letterSpacing: '0.03em' }}>
                                    {s.label}
                                </span>
                            );
                        })}
                    </div>
                )}

                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', marginBottom: '3px' }}>
                            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                                {stock.ticker}
                            </span>
                            {patterns?.matchedPatterns?.slice(0, 2).map(p => {
                                const style = PATTERN_BADGES[p] || { bg: 'var(--bg-input)', color: 'var(--text-secondary)' };
                                return (
                                    <span key={p} style={{ fontSize: '0.58rem', fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--radius-full)', background: style.bg, color: style.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        {p}
                                    </span>
                                );
                            })}
                            {indicators.isEmaGoldenCross && (
                                <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--radius-full)', background: 'rgba(245,158,11,0.15)', color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    EMA ⭐
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{stock.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px' }}>{stock.sector}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Rp {Math.round(lastClose).toLocaleString('id-ID')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '3px', fontSize: '0.85rem', fontWeight: 700, color: isUp ? '#10B981' : '#EF4444' }}>
                            {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                            {isUp ? '+' : ''}{change.toFixed(2)}%
                        </div>
                    </div>
                </div>

                {/* Mini Chart */}
                <div style={{ height: '72px', background: 'rgba(15,23,42,0.5)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stock.ohlcv} margin={{ top: 6, right: 6, left: 6, bottom: 6 }}>
                            <YAxis domain={['auto', 'auto']} hide />
                            <Line type="monotone" dataKey="close" stroke={isUp ? '#10B981' : '#EF4444'} strokeWidth={2} dot={false} isAnimationActive animationDuration={1000} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Indicators Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                    {[
                        { label: 'MACD', active: indicators.isMacdGoldenCross, activeText: '⚡ Cross', color: '#10B981', dim: 'rgba(16,185,129,0.12)' },
                        { label: 'Stoch', active: indicators.isStochasticOversold, activeText: '🔔 OB', color: '#8B5CF6', dim: 'rgba(139,92,246,0.12)' },
                        { label: 'EMA', active: indicators.isEmaGoldenCross, activeText: '⭐ Cross', color: '#F59E0B', dim: 'rgba(245,158,11,0.12)', neutralText: hasEma ? (emaValues.ema50 > emaValues.ema200 ? '↑ Bull' : '↓ Bear') : 'N/A' },
                    ].map(ind => (
                        <div key={ind.label} style={{ background: ind.active ? ind.dim : 'rgba(30,41,59,0.5)', border: `1px solid ${ind.active ? ind.color + '44' : 'var(--border-color)'}`, borderRadius: 'var(--radius-md)', padding: '7px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: ind.active ? ind.color : 'var(--text-muted)', marginBottom: '2px' }}>{ind.label}</div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: ind.active ? ind.color : 'var(--text-secondary)' }}>
                                {ind.active ? ind.activeText : (ind.neutralText || 'Neutral')}
                            </div>
                        </div>
                    ))}
                </div>

                {/* EMA Values */}
                {hasEma && (
                    <div style={{ display: 'flex', gap: '6px', fontSize: '0.7rem' }}>
                        <div style={{ flex: 1, background: 'rgba(15,23,42,0.4)', borderRadius: 'var(--radius-sm)', padding: '5px 8px', border: '1px solid var(--border-color)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>EMA50 </span>
                            <span style={{ color: emaValues.ema50 > emaValues.ema200 ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                                {Math.round(emaValues.ema50).toLocaleString('id-ID')}
                            </span>
                        </div>
                        <div style={{ flex: 1, background: 'rgba(15,23,42,0.4)', borderRadius: 'var(--radius-sm)', padding: '5px 8px', border: '1px solid var(--border-color)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>EMA200 </span>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                                {Math.round(emaValues.ema200).toLocaleString('id-ID')}
                            </span>
                        </div>
                    </div>
                )}

                {/* News */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600 }}>
                            <Newspaper size={12} /><span>Sentimen Berita</span>
                        </div>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.06em', ...sentimentStyle }}>
                            {stock.sentiment}
                        </span>
                    </div>
                    {stock.news?.[0] && (
                        <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {stock.news[0].title}
                        </div>
                    )}
                    {stock.news?.length > 1 && <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '4px' }}>+{stock.news.length - 1} berita</div>}
                </div>

                {/* AI Analysis */}
                {stock.analysis && (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '11px' }}>
                        <button onClick={() => setAnalysisOpen(v => !v)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#60A5FA', fontSize: '0.75rem', fontWeight: 700 }}>
                                <Brain size={13} /><span>Analisis Teknikal</span>
                            </div>
                            <span style={{ color: 'var(--text-muted)' }}>
                                {analysisOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </span>
                        </button>
                        {analysisOpen && (
                            <div style={{ marginTop: '10px', fontSize: '0.77rem', color: 'var(--text-secondary)', lineHeight: 1.7, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 'var(--radius-md)', padding: '12px', whiteSpace: 'pre-line' }}>
                                {stock.analysis}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockCard;
