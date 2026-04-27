import { fetchMultipleStocks } from './yahooFinanceService';

// Default IDX tickers to screen (blue chips IDX)
export const DEFAULT_TICKERS = ['BBCA', 'BBRI', 'TLKM', 'ASII', 'BMRI', 'GOTO', 'BREN', 'PGEO', 'ADRO', 'MDKA'];

// Static news headlines — supplement until real news API is integrated
const STATIC_NEWS = {
    BBCA: [{ title: 'Kinerja BBCA Diprediksi Tumbuh 10% di Q3', source: 'Kontan' }, { title: 'Asing Borong Saham BBCA', source: 'CNBC' }],
    BBRI: [{ title: 'BRI Bukukan Laba Bersih Record Q1', source: 'Kontan' }, { title: 'Dividen Yield BBRI Tetap Menarik', source: 'Bisnis' }],
    TLKM: [{ title: 'Telkom Perluas Jaringan 5G ke 10 Kota Baru', source: 'Kontan' }, { title: 'TLKM Laba Q2 Naik 8%', source: 'CNBC' }],
    ASII: [{ title: 'Penjualan Mobil Astra Melambat, Ini Penyebabnya', source: 'CNBC' }, { title: 'ASII Diversifikasi ke Bisnis Digital', source: 'Bisnis' }],
    BMRI: [{ title: 'Bank Mandiri Raih Laba Tertinggi Sepanjang Sejarah', source: 'Bisnis' }, { title: 'BMRI Siapkan Dividen Yield 5%+', source: 'Kontan' }],
    GOTO: [{ title: 'GOTO Mulai Tunjukkan Tren Reversal Jangka Pendek', source: 'Bisnis' }, { title: 'Persaingan E-Commerce Ketat, GOTO Fokus Efisiensi', source: 'CNBC' }],
    BREN: [{ title: 'BREN Dapat Kontrak Baru Energi Terbarukan', source: 'Kontan' }, { title: 'Saham Energi Terbarukan Bergairah', source: 'CNBC' }],
    PGEO: [{ title: 'Harga Minyak Turun, PGEO Terkoreksi', source: 'Investor Daily' }],
    ADRO: [{ title: 'ADRO Siap Bagikan Dividen Interim Jumbo', source: 'Kontan' }, { title: 'Harga Batu Bara Cenderung Naik', source: 'Bisnis' }],
    MDKA: [{ title: 'Harga Tembaga Global Menguat, MDKA Ikut Terdongkrak', source: 'Kontan' }],
};

const STATIC_SENTIMENT = {
    BBCA: 'Positive', BBRI: 'Positive', TLKM: 'Positive', ASII: 'Neutral',
    BMRI: 'Positive', GOTO: 'Neutral', BREN: 'Positive',
    PGEO: 'Negative', ADRO: 'Positive', MDKA: 'Positive',
};

/**
 * Fetch real OHLCV data for a list of tickers from Yahoo Finance (via CORS proxy).
 * Returns only successfully fetched stocks — NO mock/dummy fallback.
 * @param {string[]} tickers
 * @returns {Promise<Object[]>}
 */
export async function getScreenerData(tickers = DEFAULT_TICKERS) {
    const stockData = await fetchMultipleStocks(tickers);

    return stockData.map(stock => ({
        ...stock,
        news: STATIC_NEWS[stock.ticker] || [],
        sentiment: STATIC_SENTIMENT[stock.ticker] || 'Neutral',
    }));
}
