import { formatRupiah, formatUSD, formatPercent } from '@/modules/shared/utils/formatters';

/**
 * Returns market-aware formatting helpers.
 *
 * Usage:
 *   const { formatMoney, isUS } = useMarketFormatter('ID');
 *   <span>{formatMoney(amount)}</span>
 */
export function useMarketFormatter(market: string) {
  const isUS = market === 'US';
  const formatMoney = isUS ? formatUSD : formatRupiah;
  return { formatMoney, isUS, formatPercent };
}
