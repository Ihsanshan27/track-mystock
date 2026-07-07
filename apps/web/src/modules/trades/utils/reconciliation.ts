import { calculatePortfolioBalance } from '@/modules/trades/calculations';
import { getFinanceAccountBalance } from '@/modules/finance/utils/finance';
import type { Trade, Cashflow, Dividend, Portfolio } from '@/modules/shared/types/index';
import type { FinanceAccount, FinanceTransaction } from '@/modules/finance/types/finance';

export interface ReconciliationWarning {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  description: string;
  details?: string[];
  stockCode?: string;
  tradeId?: string;
}

export function reconcilePortfolioData({
  trades,
  cashflows = [],
  dividends = [],
  initialCapital = 10000000,
  market = 'ID',
  portfolio,
  financeAccounts = [],
  financeTransactions = [],
}: {
  trades: Trade[];
  cashflows: Cashflow[];
  dividends: Dividend[];
  initialCapital: number;
  market: 'ID' | 'US';
  portfolio?: Portfolio;
  financeAccounts?: FinanceAccount[];
  financeTransactions?: FinanceTransaction[];
}): ReconciliationWarning[] {
  const warnings: ReconciliationWarning[] = [];
  const isUS = market === 'US';
  const formatMoney = (val: number) => {
    return isUS
      ? '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : 'Rp' + val.toLocaleString('id-ID');
  };

  // 1. Calculate Portfolio Balance
  const balance = calculatePortfolioBalance(trades, cashflows, dividends, initialCapital, market);

  // Warning 1: Negative Buying Power (Defisit Kas)
  if (balance.buyingPower < 0) {
    warnings.push({
      id: 'buying-power-deficit',
      type: 'danger',
      title: 'Defisit Saldo Kas (Buying Power Negatif)',
      description: `Kas yang tersedia untuk transaksi aktif tidak mencukupi (Buying Power: ${formatMoney(balance.buyingPower)}). Harap catat Deposit Kas baru ke portofolio ini atau sesuaikan lot transaksi Anda.`,
    });
  }

  // 2. Validate Trade Records
  const tickerLots: Record<string, { buy: number; sell: number; name: string }> = {};

  trades.forEach((trade) => {
    // Only process trades matching current market scope
    const tradeMarket = trade.market || 'ID';
    if (tradeMarket !== market) return;

    const lots = Number(trade.lots) || 0;
    const isClosed = trade.dateSell && trade.sellPrice != null;

    if (!tickerLots[trade.stockCode]) {
      tickerLots[trade.stockCode] = { buy: 0, sell: 0, name: trade.stockCode };
    }
    
    tickerLots[trade.stockCode].buy += lots;
    if (isClosed) {
      tickerLots[trade.stockCode].sell += lots;
    }

    // Warning 2: Inconsistent sell price vs sell date
    if (trade.sellPrice != null && !trade.dateSell) {
      warnings.push({
        id: `inconsistent-sell-${trade.id}`,
        type: 'warning',
        title: 'Harga Jual Tanpa Tanggal Jual',
        description: `Transaksi ${trade.stockCode} memiliki harga jual (${formatMoney(trade.sellPrice)}) tetapi tanggal jual kosong.`,
        tradeId: trade.id,
        stockCode: trade.stockCode,
      });
    } else if (trade.dateSell && trade.sellPrice == null) {
      warnings.push({
        id: `inconsistent-date-${trade.id}`,
        type: 'warning',
        title: 'Tanggal Jual Tanpa Harga Jual',
        description: `Transaksi ${trade.stockCode} memiliki tanggal jual (${trade.dateSell}) tetapi harga jual kosong.`,
        tradeId: trade.id,
        stockCode: trade.stockCode,
      });
    }

    // Warning 3: Invalid dates (Date Buy > Date Sell)
    if (trade.dateBuy && trade.dateSell) {
      const buyTime = new Date(trade.dateBuy).getTime();
      const sellTime = new Date(trade.dateSell).getTime();
      if (!isNaN(buyTime) && !isNaN(sellTime) && buyTime > sellTime) {
        warnings.push({
          id: `chronology-anomaly-${trade.id}`,
          type: 'warning',
          title: 'Kronologi Tanggal Terbalik',
          description: `Tanggal beli ${trade.stockCode} (${trade.dateBuy}) terdeteksi setelah tanggal jual (${trade.dateSell}).`,
          tradeId: trade.id,
          stockCode: trade.stockCode,
        });
      }
    }

    // Warning 4: Non-positive lots/prices
    if (lots <= 0) {
      warnings.push({
        id: `invalid-lots-${trade.id}`,
        type: 'danger',
        title: 'Jumlah Lot Tidak Valid',
        description: `Transaksi ${trade.stockCode} memiliki kuantitas (lot/share) bernilai 0 atau negatif (${lots}).`,
        tradeId: trade.id,
        stockCode: trade.stockCode,
      });
    }
    if (trade.buyPrice <= 0) {
      warnings.push({
        id: `invalid-buyprice-${trade.id}`,
        type: 'danger',
        title: 'Harga Beli Tidak Valid',
        description: `Transaksi ${trade.stockCode} memiliki Harga Beli bernilai 0 atau negatif (${formatMoney(trade.buyPrice)}).`,
        tradeId: trade.id,
        stockCode: trade.stockCode,
      });
    }
    if (isClosed && (trade.sellPrice || 0) <= 0) {
      warnings.push({
        id: `invalid-sellprice-${trade.id}`,
        type: 'danger',
        title: 'Harga Jual Tidak Valid',
        description: `Transaksi ${trade.stockCode} ditutup dengan Harga Jual bernilai 0 atau negatif (${formatMoney(trade.sellPrice || 0)}).`,
        tradeId: trade.id,
        stockCode: trade.stockCode,
      });
    }

    // Warning 5: Fee abnormally high (>5%)
    if (trade.buyFee > 5 || trade.sellFee > 5) {
      warnings.push({
        id: `high-fee-${trade.id}`,
        type: 'info',
        title: 'Persentase Fee Tinggi',
        description: `Transaksi ${trade.stockCode} memiliki fee beli (${trade.buyFee}%) atau fee jual (${trade.sellFee}%) melebihi 5%.`,
        tradeId: trade.id,
        stockCode: trade.stockCode,
      });
    }
  });

  // Warning 6: Over-sell / Lot Imbalance
  // In a transaction list, over-sell happens if total sell quantity exceeds buy quantity for a ticker.
  // Although in our trade-centric model trades buy/sell is packaged in one row, check if any ticker has a buy/sell imbalance.
  Object.values(tickerLots).forEach((ticker) => {
    if (ticker.sell > ticker.buy) {
      warnings.push({
        id: `oversell-${ticker.name}`,
        type: 'danger',
        title: `Over-Sell Saham ${ticker.name}`,
        description: `Total lot yang terjual (${ticker.sell} lot) melebihi total lot yang dibeli (${ticker.buy} lot) untuk saham ${ticker.name}.`,
        stockCode: ticker.name,
      });
    }
  });

  // Warning 8: Orphan Linked Cashflows
  cashflows.forEach((cf) => {
    if (cf.linkedFinanceTransactionId) {
      const exists = financeTransactions.some((tx) => tx.id === cf.linkedFinanceTransactionId);
      if (!exists) {
        warnings.push({
          id: `orphan-cashflow-${cf.id}`,
          type: 'warning',
          title: 'Transaksi Kas Yatim (Orphan)',
          description: `Kas ${cf.type === 'deposit' ? 'deposit' : 'penarikan'} sebesar ${formatMoney(cf.amount)} pada tanggal ${cf.date} terhubung ke transaksi finance yang sudah dihapus.`,
        });
      }
    }
  });

  return warnings;
}
