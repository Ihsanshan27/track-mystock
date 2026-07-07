import { generateId } from '@/modules/shared/utils/storage';
import type { IpoAccount, IpoEntry } from '@/modules/ipo/types/ipo';

type IpoEntryLike = {
  ipoAccountId?: string;
  accountName?: string;
  email?: string;
  createdAt?: string;
  [key: string]: unknown;
};

type IpoAccountLike = {
  id?: string;
  name?: string;
  email?: string;
  normalizedKey?: string;
  createdAt?: string;
  lastUsedAt?: string;
};

export function normalizeIpoText(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function normalizeIpoEmail(value: unknown) {
  return normalizeIpoText(value).toLowerCase();
}

export function buildIpoAccountKey(accountName: unknown) {
  const normalizedName = normalizeIpoText(accountName).toLowerCase();
  return normalizedName;
}

export function normalizeIpoCollections(entries: any[] = [], accounts: any[] = []) {
  const accountMap = new Map();

  (accounts || []).forEach((account) => {
    const normalizedName = normalizeIpoText(account.name);
    const normalizedEmail = normalizeIpoEmail(account.email);
    const normalizedKey = account.normalizedKey || buildIpoAccountKey(normalizedName);
    if (!normalizedKey) return;
    accountMap.set(normalizedKey, {
      id: account.id || generateId(),
      name: normalizedName || account.name || 'Tanpa nama akun',
      email: normalizedEmail,
      normalizedKey,
      createdAt: account.createdAt || new Date().toISOString(),
      lastUsedAt: account.lastUsedAt || account.createdAt || new Date().toISOString(),
    });
  });

  const normalizedEntries = (entries || []).map((entry) => {
    const normalizedName = normalizeIpoText(entry.accountName);
    const normalizedEmail = normalizeIpoEmail(entry.email);
    const normalizedKey = buildIpoAccountKey(normalizedName);

    if (!normalizedKey) {
      return {
        ...entry,
        accountName: normalizedName || entry.accountName || 'Tanpa nama akun',
        email: normalizedEmail,
      };
    }

    let account = accountMap.get(normalizedKey);
    if (!account) {
      account = {
        id: entry.ipoAccountId || generateId(),
        name: normalizedName || entry.accountName || 'Tanpa nama akun',
        email: normalizedEmail,
        normalizedKey,
        createdAt: entry.createdAt || new Date().toISOString(),
        lastUsedAt: entry.createdAt || new Date().toISOString(),
      };
      accountMap.set(normalizedKey, account);
    } else {
      account.lastUsedAt = entry.createdAt || account.lastUsedAt || new Date().toISOString();
      if (normalizedName) {
        account.name = normalizedName;
      }
    }

    return {
      ...entry,
      ipoAccountId: account.id,
      accountName: account.name,
      email: normalizedEmail,
    };
  });

  const normalizedAccounts = Array.from(accountMap.values()).sort(
    (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
  );

  return {
    entries: normalizedEntries as unknown as IpoEntry[],
    accounts: normalizedAccounts as unknown as IpoAccount[],
  };
}
