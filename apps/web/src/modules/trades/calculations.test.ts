import { describe, expect, it } from 'vitest';
import {
  calculateEquityCurve,
  calculateStats,
  calculateTradePnL,
  calculateUnrealizedPnL,
  getTradeQuantityUnits,
} from '@/modules/trades/calculations';

describe('trade calculations', () => {
  it('calculates Indonesian stock quantity in share units', () => {
    expect(getTradeQuantityUnits({ lots: 2, market: 'ID', assetType: 'stock' })).toBe(200);
  });

  it('calculates mutual fund quantity without lot conversion', () => {
    expect(getTradeQuantityUnits({ lots: 25, market: 'ID', assetType: 'mutual_fund' })).toBe(25);
  });

  it('calculates closed trade pnl including commissions', () => {
    const result = calculateTradePnL({
      buyPrice: 100,
      sellPrice: 110,
      lots: 1,
      buyFee: 0.15,
      sellFee: 0.25,
      market: 'ID',
    });

    expect(result.totalBuy).toBe(10000);
    expect(result.totalSell).toBe(11000);
    expect(result.buyCommission).toBe(15);
    expect(result.sellCommission).toBe(27.5);
    expect(result.pnl).toBe(957.5);
    expect(result.pnlPercent).toBeCloseTo(9.575);
  });

  it('calculates unrealized pnl for US stock positions', () => {
    const result = calculateUnrealizedPnL(100, 120, 5, 0, 'US', 'stock');

    expect(result.totalBuy).toBe(500);
    expect(result.totalCurrent).toBe(600);
    expect(result.pnl).toBe(100);
    expect(result.pnlPercent).toBe(20);
  });

  it('calculates aggregate stats for closed trades', () => {
    const result = calculateStats([
      {
        buyPrice: 100,
        sellPrice: 110,
        lots: 1,
        buyFee: 0.15,
        sellFee: 0.25,
        market: 'ID',
        dateBuy: '2026-06-01',
        dateSell: '2026-06-02',
      },
      {
        buyPrice: 200,
        sellPrice: 180,
        lots: 1,
        buyFee: 0.15,
        sellFee: 0.25,
        market: 'ID',
        dateBuy: '2026-06-03',
        dateSell: '2026-06-05',
      },
    ]);

    expect(result.totalTrades).toBe(2);
    expect(result.winCount).toBe(1);
    expect(result.lossCount).toBe(1);
    expect(result.bestTrade?.pnl).toBeGreaterThan(0);
    expect(result.worstTrade?.pnl).toBeLessThan(0);
  });

  it('builds equity curve from chronologically closed trades', () => {
    const curve = calculateEquityCurve(
      [
        {
          buyPrice: 100,
          sellPrice: 120,
          lots: 1,
          buyFee: 0,
          sellFee: 0,
          market: 'ID',
          dateBuy: '2026-06-01',
          dateSell: '2026-06-02',
        },
        {
          buyPrice: 200,
          sellPrice: 190,
          lots: 1,
          buyFee: 0,
          sellFee: 0,
          market: 'ID',
          dateBuy: '2026-06-03',
          dateSell: '2026-06-04',
        },
      ],
      10000000,
    );

    expect(curve).toHaveLength(3);
    expect(curve[0].equity).toBe(10000000);
    expect(curve[1].equity).toBe(10002000);
    expect(curve[2].drawdown).toBeGreaterThan(0);
  });
});
