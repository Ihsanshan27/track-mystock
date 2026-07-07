import 'dotenv/config';
import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { createPrismaAdapter } from '../prisma/prisma-client.factory';

const prisma = new PrismaClient({
  adapter: createPrismaAdapter(),
});

type JournalDataRow = {
  user_id: string;
  data_key: string;
  data: unknown;
};

const JOURNAL_KEYS = [
  'portfolios',
  'trades',
  'cashflows',
  'dividends',
  'watchlist',
  'notes',
  'financeAccounts',
  'financeTransactions',
  'ipoEvents',
  'ipoAccounts',
  'ipoEntries',
] as const;

type JournalKey = (typeof JOURNAL_KEYS)[number];
type CountByKey = Record<JournalKey, number>;

function createEmptyCounts(): CountByKey {
  return {
    portfolios: 0,
    trades: 0,
    cashflows: 0,
    dividends: 0,
    watchlist: 0,
    notes: 0,
    financeAccounts: 0,
    financeTransactions: 0,
    ipoEvents: 0,
    ipoAccounts: 0,
    ipoEntries: 0,
  };
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

async function main() {
  const journalDataRelation = await prisma.$queryRawUnsafe<Array<{ relation_name: string | null }>>(
    "select to_regclass('public.journal_data')::text as relation_name",
  );

  if (!journalDataRelation[0]?.relation_name) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          skipped: true,
          reason: 'journal_data table not found in current database',
          hint: 'Import legacy journal_data export first if you want to verify JSON-to-relational migration.',
        },
        null,
        2,
      ),
    );
    return;
  }

  const rows = await prisma.$queryRawUnsafe<JournalDataRow[]>(
    `select user_id, data_key, data from journal_data where data_key in (${JOURNAL_KEYS.map((key) => `'${key}'`).join(', ')})`,
  );

  const legacyByUser = new Map<string, CountByKey>();
  const legacyTotals = createEmptyCounts();

  for (const row of rows) {
    if (!JOURNAL_KEYS.includes(row.data_key as JournalKey)) continue;
    const key = row.data_key as JournalKey;
    const count = asArray(row.data).length;
    const next = legacyByUser.get(row.user_id) || createEmptyCounts();
    next[key] = count;
    legacyByUser.set(row.user_id, next);
    legacyTotals[key] += count;
  }

  const userIds = Array.from(legacyByUser.keys());
  const relationalTotals = createEmptyCounts();
  const perUser = [];

  for (const userId of userIds) {
    const legacy = legacyByUser.get(userId) || createEmptyCounts();
    const relational: CountByKey = {
      portfolios: await prisma.portfolio.count({ where: { ownerUserId: userId, workspaceId: null } }),
      trades: await prisma.trade.count({ where: { ownerUserId: userId, workspaceId: null } }),
      cashflows: await prisma.cashflow.count({ where: { ownerUserId: userId, workspaceId: null } }),
      dividends: await prisma.dividend.count({ where: { ownerUserId: userId, workspaceId: null } }),
      watchlist: await prisma.watchlistItem.count({ where: { ownerUserId: userId, workspaceId: null } }),
      notes: await prisma.note.count({ where: { ownerUserId: userId, workspaceId: null } }),
      financeAccounts: await prisma.financeAccount.count({ where: { ownerUserId: userId, workspaceId: null } }),
      financeTransactions: await prisma.financeTransaction.count({ where: { ownerUserId: userId, workspaceId: null } }),
      ipoEvents: await prisma.ipoEvent.count({ where: { ownerUserId: userId, workspaceId: null } }),
      ipoAccounts: await prisma.ipoAccount.count({ where: { ownerUserId: userId, workspaceId: null } }),
      ipoEntries: await prisma.ipoEntry.count({ where: { ownerUserId: userId, workspaceId: null } }),
    };

    const diff = createEmptyCounts();
    let ok = true;
    for (const key of JOURNAL_KEYS) {
      relationalTotals[key] += relational[key];
      diff[key] = relational[key] - legacy[key];
      if (diff[key] !== 0) ok = false;
    }

    perUser.push({ userId, legacy, relational, diff, ok });
  }

  const integrityChecks = {
    tradesMissingPortfolio: await prisma.trade.count({
      where: {
        workspaceId: null,
        portfolioId: { notIn: await prisma.portfolio.findMany({ where: { workspaceId: null }, select: { id: true } }).then((rows) => rows.map((row) => row.id)) },
      },
    }),
    cashflowsMissingPortfolio: await prisma.cashflow.count({
      where: {
        workspaceId: null,
        portfolioId: { notIn: await prisma.portfolio.findMany({ where: { workspaceId: null }, select: { id: true } }).then((rows) => rows.map((row) => row.id)) },
      },
    }),
    dividendsMissingPortfolio: await prisma.dividend.count({
      where: {
        workspaceId: null,
        portfolioId: { notIn: await prisma.portfolio.findMany({ where: { workspaceId: null }, select: { id: true } }).then((rows) => rows.map((row) => row.id)) },
      },
    }),
    financeTransactionsMissingAccount: await prisma.financeTransaction.count({
      where: {
        workspaceId: null,
        accountId: { notIn: await prisma.financeAccount.findMany({ where: { workspaceId: null }, select: { id: true } }).then((rows) => rows.map((row) => row.id)) },
      },
    }),
    ipoEntriesMissingEvent: await prisma.ipoEntry.count({
      where: {
        workspaceId: null,
        ipoEventId: { notIn: await prisma.ipoEvent.findMany({ where: { workspaceId: null }, select: { id: true } }).then((rows) => rows.map((row) => row.id)) },
      },
    }),
    ipoEntriesMissingAccountRef: await prisma.ipoEntry.count({
      where: {
        workspaceId: null,
        ipoAccountId: {
          not: null,
          notIn: await prisma.ipoAccount.findMany({ where: { workspaceId: null }, select: { id: true } }).then((rows) => rows.map((row) => row.id)),
        },
      },
    }),
  };

  const mismatchedUsers = perUser.filter((item) => !item.ok);
  const integrityFailures = Object.values(integrityChecks).some((count) => count > 0);

  console.log(
    JSON.stringify(
      {
        ok: mismatchedUsers.length === 0 && !integrityFailures,
        comparedUsers: perUser.length,
        legacyTotals,
        relationalTotals,
        integrityChecks,
        mismatchedUsers,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
