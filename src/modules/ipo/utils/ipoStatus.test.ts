import { describe, expect, it } from 'vitest';
import { getIpoEventStatus } from '@/modules/ipo/utils/ipoStatus';
import type { IpoEvent } from '@/modules/ipo/types/ipo';

function createEvent(overrides: Partial<IpoEvent>): IpoEvent {
  return {
    id: 'ipo-1',
    stockCode: 'TEST',
    ipoDate: '2026-06-25',
    offeringPrice: 100,
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getIpoEventStatus', () => {
  it('returns upcoming when offering date has not started yet', () => {
    const status = getIpoEventStatus(
      createEvent({
        offeringDate: '2026-06-24',
        ipoDate: '2026-06-30',
      }),
      new Date('2026-06-23T10:00:00.000Z'),
    );

    expect(status).toBe('upcoming');
  });

  it('returns active when offering has started and ipo date has not passed', () => {
    const status = getIpoEventStatus(
      createEvent({
        offeringDate: '2026-06-20',
        ipoDate: '2026-06-25',
      }),
      new Date('2026-06-23T10:00:00.000Z'),
    );

    expect(status).toBe('active');
  });

  it('returns completed when ipo date is already in the past even if offering date was later in source data', () => {
    const status = getIpoEventStatus(
      createEvent({
        offeringDate: '2026-07-07',
        ipoDate: '2026-04-10',
      }),
      new Date('2026-06-23T10:00:00.000Z'),
    );

    expect(status).toBe('completed');
  });
});
