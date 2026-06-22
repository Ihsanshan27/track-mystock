import { useMemo } from 'react';
import { calculateUnrealizedPnL } from '@/modules/trades/calculations';

interface Trade {
  id: string;
  assetType?: 'stock' | 'mutual_fund';
  stockCode: string;
  market?: string;
  lots: number;
  buyPrice: number;
  sellPrice?: number;
  dateSell?: string;
  buyFee?: number;
}

interface UseOpenPositionMetricsOptions {
  /** Filter trades to only this market ('ID' | 'US'). Defaults to all open trades. */
  market?: string;
  /** Live market prices keyed by stock code */
  marketPrices?: Record<string, number>;
}

/**
 * Calculates aggregated metrics for currently open positions.
 *
 * Returns:
 *   - openTrades: filtered list of open trades
 *   - totalInvested: sum of (buyPrice * shares) for all open trades
 *   - totalFloating: sum of unrealized P/L based on marketPrices or last sell price
 *   - tradingBalance: totalInvested + totalFloating
 */
export function useOpenPositionMetrics(
  trades: Trade[],
  options: UseOpenPositionMetricsOptions = {}
) {
  const { market, marketPrices } = options;

  const openTrades = useMemo(() => {
    return trades.filter((t) => {
      const isOpen = t.sellPrice == null || !t.dateSell;
      if (!isOpen) return false;
      if (market) {
        return market === 'US' ? t.market === 'US' : t.market !== 'US' || !t.market;
      }
      return true;
    });
  }, [trades, market]);

  const totalInvested = useMemo(() => {
    return openTrades.reduce((sum, t) => {
      const isUS = t.market === 'US';
      const shares = t.assetType === 'mutual_fund' ? t.lots : (isUS ? t.lots : t.lots * 100);
      return sum + t.buyPrice * shares;
    }, 0);
  }, [openTrades]);

  const totalFloating = useMemo(() => {
    return openTrades.reduce((sum, t) => {
      const currentPrice =
        (marketPrices && marketPrices[t.stockCode]) || t.sellPrice || 0;
      if (currentPrice > 0) {
        const unrealized = calculateUnrealizedPnL(
          t.buyPrice,
          currentPrice,
          t.lots,
          t.buyFee,
          t.market || 'ID',
          t.assetType || 'stock'
        );
        return sum + unrealized.pnl;
      }
      return sum;
    }, 0);
  }, [openTrades, marketPrices]);

  const tradingBalance = totalInvested + totalFloating;

  return { openTrades, totalInvested, totalFloating, tradingBalance };
}
