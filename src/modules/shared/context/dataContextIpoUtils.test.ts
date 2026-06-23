import { describe, expect, it } from 'vitest';
import { normalizeIpoCollections } from '@/modules/shared/context/dataContextIpoUtils';

describe('normalizeIpoCollections', () => {
  it('groups entries with the same normalized account name into one ipo account', () => {
    const result = normalizeIpoCollections(
      [
        {
          id: 'entry-1',
          ipoEventId: 'ipo-1',
          accountName: 'Akun Utama',
          email: 'USER@MAIL.COM',
          createdAt: '2026-06-01T00:00:00.000Z',
        },
        {
          id: 'entry-2',
          ipoEventId: 'ipo-2',
          accountName: ' akun   utama ',
          email: 'user@mail.com',
          createdAt: '2026-06-02T00:00:00.000Z',
        },
      ],
      [],
    );

    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0].name).toBe('akun utama');
    expect(result.entries[0].ipoAccountId).toBe(result.entries[1].ipoAccountId);
    expect(result.entries[0].email).toBe('user@mail.com');
    expect(result.entries[1].email).toBe('user@mail.com');
  });
});
