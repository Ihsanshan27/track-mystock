import { describe, expect, it } from 'vitest';
import {
  buildFinanceOverview,
  getFinanceAccountBalance,
  getFinanceTransactionDelta,
  isTransferTransaction,
} from '@/modules/finance/utils/finance';
import type { FinanceAccount, FinanceTransaction } from '@/modules/finance/types/finance';

const accounts: FinanceAccount[] = [
  {
    id: 'acc-1',
    name: 'BCA',
    institutionName: 'BCA',
    type: 'bank',
    currency: 'IDR',
    openingBalance: 1_000_000,
    isActive: true,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'acc-2',
    name: 'Jago',
    institutionName: 'Bank Jago',
    type: 'bank',
    currency: 'IDR',
    openingBalance: 500_000,
    isActive: false,
    createdAt: '2026-06-01T00:00:00.000Z',
  },
];

const transactions: FinanceTransaction[] = [
  {
    id: 'tx-1',
    accountId: 'acc-1',
    type: 'income',
    amount: 250_000,
    date: '2026-06-02',
    description: 'Setoran',
    createdAt: '2026-06-02T00:00:00.000Z',
  },
  {
    id: 'tx-2',
    accountId: 'acc-1',
    type: 'expense',
    amount: 100_000,
    date: '2026-06-03',
    description: 'Tarik dana',
    linkedCashflowId: 'cf-1',
    createdAt: '2026-06-03T00:00:00.000Z',
  },
  {
    id: 'tx-3',
    accountId: 'acc-2',
    type: 'adjustment',
    amount: -50_000,
    date: '2026-06-04',
    description: 'Penyesuaian',
    createdAt: '2026-06-04T00:00:00.000Z',
  },
];

describe('finance utils', () => {
  it('calculates signed delta per transaction type', () => {
    expect(getFinanceTransactionDelta({ type: 'income', amount: 1000 })).toBe(1000);
    expect(getFinanceTransactionDelta({ type: 'expense', amount: 1000 })).toBe(-1000);
    expect(getFinanceTransactionDelta({ type: 'transfer_in', amount: 1000 })).toBe(1000);
    expect(getFinanceTransactionDelta({ type: 'transfer_out', amount: 1000 })).toBe(-1000);
    expect(getFinanceTransactionDelta({ type: 'adjustment', amount: -500 })).toBe(-500);
  });

  it('builds account balance from opening balance and transactions', () => {
    expect(getFinanceAccountBalance(accounts[0], transactions)).toBe(1_150_000);
    expect(getFinanceAccountBalance(accounts[1], transactions)).toBe(450_000);
  });

  it('builds finance overview totals correctly', () => {
    const overview = buildFinanceOverview(accounts, transactions);

    expect(overview.totalBalance).toBe(1_600_000);
    expect(overview.totalIncome).toBe(250_000);
    expect(overview.totalExpense).toBe(100_000);
    expect(overview.totalLinkedToTrading).toBe(100_000);
    expect(overview.activeAccounts).toBe(1);
    expect(overview.inactiveAccounts).toBe(1);
    expect(overview.transactionCount).toBe(3);
  });

  it('detects transfer transaction types', () => {
    expect(isTransferTransaction('transfer_in')).toBe(true);
    expect(isTransferTransaction('transfer_out')).toBe(true);
    expect(isTransferTransaction('income')).toBe(false);
  });
});
