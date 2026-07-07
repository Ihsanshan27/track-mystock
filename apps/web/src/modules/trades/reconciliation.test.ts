import { describe, expect, it } from 'vitest';
import { reconcilePortfolioData } from './utils/reconciliation';

describe('Reconciliation logic', () => {
  it('detects negative buying power deficit', () => {
    const warnings = reconcilePortfolioData({
      trades: [
        {
          id: '1',
          stockCode: 'BBRI',
          market: 'ID',
          dateBuy: '2026-06-01',
          lots: 100, // 10,000 shares
          buyPrice: 5000, // Total buy = 50,000,000 IDR
          buyFee: 0.15,
          sellFee: 0.25,
        }
      ],
      cashflows: [], // No cashflows
      dividends: [],
      initialCapital: 10000000, // Only 10M capital
      market: 'ID',
    });

    const deficit = warnings.find(w => w.id === 'buying-power-deficit');
    expect(deficit).toBeDefined();
    expect(deficit?.type).toBe('danger');
  });

  it('detects inconsistent sell data (price set, date empty)', () => {
    const warnings = reconcilePortfolioData({
      trades: [
        {
          id: '1',
          stockCode: 'BBRI',
          market: 'ID',
          dateBuy: '2026-06-01',
          lots: 10,
          buyPrice: 5000,
          buyFee: 0.15,
          sellFee: 0.25,
          sellPrice: 5500, // Sell price set
          // dateSell missing
        }
      ],
      cashflows: [],
      dividends: [],
      initialCapital: 100000000,
      market: 'ID',
    });

    const warning = warnings.find(w => w.id === 'inconsistent-sell-1');
    expect(warning).toBeDefined();
  });

  it('detects date order anomaly', () => {
    const warnings = reconcilePortfolioData({
      trades: [
        {
          id: '1',
          stockCode: 'BBRI',
          market: 'ID',
          dateBuy: '2026-06-05',
          dateSell: '2026-06-01', // Date sell is BEFORE date buy!
          lots: 10,
          buyPrice: 5000,
          sellPrice: 5500,
          buyFee: 0.15,
          sellFee: 0.25,
        }
      ],
      cashflows: [],
      dividends: [],
      initialCapital: 100000000,
      market: 'ID',
    });

    const warning = warnings.find(w => w.id === 'chronology-anomaly-1');
    expect(warning).toBeDefined();
  });
});
