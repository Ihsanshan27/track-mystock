import { describe, expect, it, vi } from 'vitest';
import { buildIpoDomain } from '@/modules/shared/context/dataContextIpoDomain';
import type { IpoAccount, IpoEntry, IpoEvent } from '@/modules/ipo/types/ipo';

vi.mock('@/modules/shared/services/apiClient', () => ({
  isApiConfigured: false,
}));

function createEvent(overrides: Partial<IpoEvent> = {}): IpoEvent {
  return {
    id: 'event-1',
    stockCode: 'TEST',
    ipoDate: '2026-06-25',
    offeringDate: '2026-06-20',
    offeringPrice: 150,
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function createEntry(overrides: Partial<IpoEntry> = {}): IpoEntry {
  return {
    id: 'entry-1',
    ipoEventId: 'event-1',
    no: 1,
    accountName: 'Akun Alpha',
    email: 'alpha@example.com',
    buyPrice: 100,
    lots: 2,
    sellPrice: 0,
    slTl: '-',
    action: 'KEEP',
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildIpoDomain', () => {
  it('syncs entry buy price to offering price when adding entry', () => {
    const persistData = vi.fn();
    const setIpoEntries = vi.fn();
    const setIpoAccounts = vi.fn();
    const setIpoEvents = vi.fn();

    const domain = buildIpoDomain({
      ensureWritable: () => true,
      ipoAccounts: [],
      ipoEntries: [],
      ipoEvents: [createEvent({ offeringPrice: 168 })],
      logUserActivity: vi.fn(),
      persistData,
      setIpoAccounts,
      setIpoEntries,
      setIpoEvents,
      showToast: vi.fn(),
      cacheLocalState: vi.fn(),
    });

    const createdEntry = domain.addIpoEntry(
      createEntry({ id: 'entry-seed', buyPrice: 120, createdAt: '2026-06-02T00:00:00.000Z' }),
    ) as IpoEntry;

    expect(createdEntry?.buyPrice).toBe(168);
    expect(setIpoEntries).toHaveBeenCalled();
    expect(setIpoAccounts).toHaveBeenCalled();
    expect(persistData).toHaveBeenCalledWith('ipoEntries', expect.any(Array));
    expect(persistData).toHaveBeenCalledWith('ipoAccounts', expect.any(Array));
  });

  it('updates related entry buy prices when ipo offering price changes', () => {
    const existingAccounts: IpoAccount[] = [
      {
        id: 'acc-1',
        name: 'Akun Alpha',
        email: 'alpha@example.com',
        normalizedKey: 'akun alpha',
        createdAt: '2026-06-01T00:00:00.000Z',
        lastUsedAt: '2026-06-01T00:00:00.000Z',
      },
    ];
    const existingEntries: IpoEntry[] = [createEntry({ ipoAccountId: 'acc-1', buyPrice: 150 })];
    const setIpoEntries = vi.fn();

    const domain = buildIpoDomain({
      ensureWritable: () => true,
      ipoAccounts: existingAccounts,
      ipoEntries: existingEntries,
      ipoEvents: [createEvent({ offeringPrice: 150 })],
      logUserActivity: vi.fn(),
      persistData: vi.fn(),
      setIpoAccounts: vi.fn(),
      setIpoEntries,
      setIpoEvents: vi.fn(),
      showToast: vi.fn(),
      cacheLocalState: vi.fn(),
    });

    domain.updateIpoEvent('event-1', { offeringPrice: 175 });

    expect(setIpoEntries).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'entry-1',
        buyPrice: 175,
      }),
    ]);
  });
});
