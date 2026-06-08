/**
 * Rule-based Technical Analysis Text Generator
 * Explains WHY a stock is interesting based on detected signals and patterns.
 */

const PATTERN_DESCRIPTIONS = {
    'Double Bottom': 'Pola Double Bottom (W) terdeteksi — dua kali uji support yang gagal tembus ke bawah. Sinyal reversal bullish yang kuat: peluang entry setelah konfirmasi neckline tertembus.',
    'IHNS': 'Inverted Head and Shoulders teridentifikasi — sinyal pembalikan tren dari bearish ke bullish yang sangat reliabel. Tunggu breakout dari garis neckline sebagai konfirmasi.',
    'Bull Flag': 'Pola Bull Flag terdeteksi — setelah kenaikan tajam (flag pole), harga konsolidasi dalam channel menurun sebelum berpotensi breakout ke atas melanjutkan trend.',
    'Asc. Triangle': 'Ascending Triangle terbentuk — higher lows + resistance horizontal. Compression energi yang berpotensi meledak ke atas saat resistance berhasil ditembus.',
    'Bullish Engulfing': 'Bullish Engulfing di candle terakhir — candle hijau besar menelan candle merah sebelumnya. Sinyal pembalikan momentum dari jual ke beli yang sangat kuat.',
    'Morning Star': 'Morning Star terbentuk — formasi 3 candle klassik. Sinyal kuat bahwa tekanan jual sudah habis dan pembeli mulai mengambil kendali.',
    'Three White Soldiers': 'Three White Soldiers terdeteksi — tiga candle hijau berturut-turut dengan body besar. Konfirmasi momentum bullish yang kuat dan konsisten.',
    'Bullish Harami': 'Bullish Harami teridentifikasi — candle kecil terjebak dalam shadow candle sebelumnya. Mengindikasikan sellers kehilangan momentum dan potensi reversal.',
};

const SIGNAL_DESCRIPTIONS = {
    'BOW': '🎯 Buy on Weakness (BOW): Harga telah koreksi 5–25% dari high terbaru ke zona support, dengan indikator oversold yang mulai berbalik. Setup ideal untuk entry di harga diskon.',
    'BOB': '💥 Buy on Breakout (BOB): Harga baru saja menembus resistance yang sudah bertahan lama, dikonfirmasi oleh volume yang meningkat signifikan. Setup breakout yang valid untuk entry momentum.',
    'ACCUMULATION': '📦 Akumulasi: Harga konsolidasi dalam range sempit dengan volume yang perlahan membangun. Potensi breakout explosive di depan setelah akumulasi selesai.',
    'OVERSOLD_BOUNCE': '🔄 Oversold Bounce: Sell-off yang dalam membawa price ke zona ekstrem oversold. Harga mulai memantul — peluang swing trade jangka pendek.',
    'MOMENTUM': '🚀 Momentum Trend: Saham secara konsisten membentuk higher high dan higher low — tren naik yang sehat. Strategi trend following cocok diterapkan.',
};

const INDICATOR_DESCRIPTIONS = {
    macdGoldenCross: 'MACD Golden Cross terjadi — garis MACD memotong Signal Line dari bawah. Sinyal beli klasik yang mengindikasikan momentum bullish mulai menguat.',
    stochasticOversold: 'Stochastic %K < 20 dan mulai naik melewati %D — kondisi oversold berakhir. Potensi rebound harga yang signifikan dalam jangka pendek.',
    emaGoldenCross: 'EMA Golden Cross: EMA50 memotong EMA200 dari bawah — perubahan tren jangka menengah dari bearish ke bullish terkonfirmasi.',
};

export function generateAnalysis({ patterns = [], signals = [], indicators = {}, sentiment, ticker, emaValues = {} }) {
    const bullets = [];

    // Trading signals first (most actionable)
    for (const signal of signals) {
        if (SIGNAL_DESCRIPTIONS[signal]) bullets.push(SIGNAL_DESCRIPTIONS[signal]);
    }

    // Chart/candle patterns
    for (const pattern of patterns) {
        if (PATTERN_DESCRIPTIONS[pattern]) bullets.push(PATTERN_DESCRIPTIONS[pattern]);
    }

    // Technical indicators
    if (indicators.isMacdGoldenCross) bullets.push(INDICATOR_DESCRIPTIONS.macdGoldenCross);
    if (indicators.isStochasticOversold) bullets.push(INDICATOR_DESCRIPTIONS.stochasticOversold);
    if (indicators.isEmaGoldenCross) bullets.push(INDICATOR_DESCRIPTIONS.emaGoldenCross);

    // EMA positioning
    if (emaValues.ema50 && emaValues.ema200) {
        if (emaValues.ema50 > emaValues.ema200) {
            bullets.push(`EMA50 (${emaValues.ema50.toFixed(0)}) di atas EMA200 (${emaValues.ema200.toFixed(0)}) — struktur tren jangka menengah masih bullish.`);
        } else {
            bullets.push(`EMA50 (${emaValues.ema50.toFixed(0)}) masih di bawah EMA200 (${emaValues.ema200.toFixed(0)}) — saham dalam tekanan. Tunggu cross ke atas sebelum entry agresif.`);
        }
    }

    // Sentiment
    if (sentiment === 'Positive') {
        bullets.push('Sentimen berita positif — katalis fundamental mendukung potensi kenaikan harga.');
    } else if (sentiment === 'Negative') {
        bullets.push('⚠️ Sentimen berita negatif — waspadai risiko downside meski teknikal terlihat bullish.');
    }

    if (bullets.length === 0) {
        return `${ticker} belum menunjukkan sinyal teknikal yang kuat saat ini. Pantau terus untuk konfirmasi pola sebelum entry.`;
    }

    const totalSignals = signals.length + patterns.length + Object.values(indicators).filter(Boolean).length;
    const header = `**${ticker}** — ${totalSignals} sinyal teknikal terdeteksi:`;
    const body = bullets.map((b, i) => `${i + 1}. ${b}`).join('\n');

    let conclusion = '';
    if (signals.includes('BOW') || signals.includes('BOB')) {
        conclusion = `\n\n💡 **Setup aktif teridentifikasi.** Perhatikan level entry, stop loss, dan konfirmasi volume sebelum eksekusi.`;
    } else if (bullets.length >= 3) {
        conclusion = `\n\n💡 Konfluensi ${bullets.length} sinyal memberikan probabilitas keberhasilan yang lebih tinggi.`;
    }

    return `${header}\n${body}${conclusion}`;
}
