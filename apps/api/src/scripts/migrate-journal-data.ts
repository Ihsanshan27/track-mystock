import 'dotenv/config';
import 'reflect-metadata';
import { Prisma, PrismaClient } from '@prisma/client';
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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hashSegment(input: string, seed: number) {
  let hash = seed;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function toStableUuid(input: string) {
  const normalized = input.trim().toLowerCase();
  const hex = [
    hashSegment(normalized, 0x811c9dc5),
    hashSegment(`${normalized}:a`, 0x9e3779b9),
    hashSegment(`${normalized}:b`, 0x85ebca6b),
    hashSegment(`${normalized}:c`, 0xc2b2ae35),
  ].join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function normalizeUuid(value: unknown, scope: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  if (UUID_PATTERN.test(normalized)) return normalized;
  return toStableUuid(`${scope}:${normalized}`);
}

function toDate(value: unknown) {
  if (!value) return undefined;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function normalizePortfolioRef(value: unknown, portfolioIdMap: Map<string, string>, ownerUserId: string) {
  const sourceId = String(value || '').trim() || 'default';
  return portfolioIdMap.get(sourceId) || normalizeUuid(sourceId, `portfolio:${ownerUserId}`)!;
}

function normalizeFinanceAccountRef(value: unknown, ownerUserId: string) {
  const sourceId = String(value || '').trim();
  if (!sourceId) return null;
  return normalizeUuid(sourceId, `finance-account:${ownerUserId}`);
}

function normalizeIpoEventRef(value: unknown, ownerUserId: string) {
  const sourceId = String(value || '').trim();
  if (!sourceId) return null;
  return normalizeUuid(sourceId, `ipo-event:${ownerUserId}`);
}

function normalizeIpoAccountRef(value: unknown, ownerUserId: string) {
  const sourceId = String(value || '').trim();
  if (!sourceId) return null;
  return normalizeUuid(sourceId, `ipo-account:${ownerUserId}`);
}

async function ensurePortfolios(
  ownerUserId: string,
  portfolioItems: any[],
  dependencyRows: { trades: any[]; cashflows: any[]; dividends: any[] },
) {
  const portfolioIdMap = new Map<string, string>();
  const sourceItems = Array.isArray(portfolioItems) ? portfolioItems : [];

  for (const [index, item] of sourceItems.entries()) {
    const sourceId = String(item?.id || '').trim() || (index === 0 ? 'default' : `portfolio-${index}`);
    portfolioIdMap.set(sourceId, normalizeUuid(sourceId, `portfolio:${ownerUserId}`)!);
  }

  const requiresDefaultPortfolio =
    sourceItems.length === 0
    || dependencyRows.trades.some((item) => !String(item?.portfolioId || '').trim() || String(item?.portfolioId).trim() === 'default')
    || dependencyRows.cashflows.some((item) => !String(item?.portfolioId || '').trim() || String(item?.portfolioId).trim() === 'default')
    || dependencyRows.dividends.some((item) => !String(item?.portfolioId || '').trim() || String(item?.portfolioId).trim() === 'default');

  if (requiresDefaultPortfolio && !portfolioIdMap.has('default')) {
    portfolioIdMap.set('default', normalizeUuid('default', `portfolio:${ownerUserId}`)!);
  }

  const upserts = sourceItems.length > 0
    ? sourceItems
    : [{
        id: 'default',
        name: 'Portofolio Utama',
        description: 'Auto-created during journal_data migration',
        isDefault: true,
        displayOrder: 0,
      }];

  let migrated = 0;
  for (const [index, item] of upserts.entries()) {
    const sourceId = String(item?.id || '').trim() || 'default';
    const normalizedId = normalizePortfolioRef(sourceId, portfolioIdMap, ownerUserId);

    await prisma.portfolio.upsert({
      where: { id: normalizedId },
      update: {
        name: String(item?.name || `Portofolio ${index + 1}`),
        description: item?.description ?? null,
        isDefault: Boolean(item?.isDefault ?? (sourceId === 'default' || index === 0)),
        displayOrder: Number(item?.displayOrder ?? index),
        financeAccountId: normalizeUuid(item?.financeAccountId, `finance-account:${ownerUserId}`),
      },
      create: {
        id: normalizedId,
        ownerUserId,
        workspaceId: null,
        name: String(item?.name || `Portofolio ${index + 1}`),
        description: item?.description ?? null,
        isDefault: Boolean(item?.isDefault ?? (sourceId === 'default' || index === 0)),
        displayOrder: Number(item?.displayOrder ?? index),
        financeAccountId: normalizeUuid(item?.financeAccountId, `finance-account:${ownerUserId}`),
        createdAt: toDate(item?.createdAt),
        updatedAt: toDate(item?.updatedAt),
      },
    });
    migrated += 1;
  }

  return { portfolioIdMap, migrated };
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
          hint: 'Import legacy journal_data export first if you want to run JSON-to-relational migration.',
          migratedPortfolios: 0,
          migratedTrades: 0,
          migratedCashflows: 0,
          migratedDividends: 0,
          migratedWatchlist: 0,
          migratedNotes: 0,
          migratedFinanceAccounts: 0,
          migratedFinanceTransactions: 0,
          migratedIpoEvents: 0,
          migratedIpoAccounts: 0,
          migratedIpoEntries: 0,
          skippedRows: 0,
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

  const rowsByUser = new Map<string, Record<string, any[]>>();
  for (const row of rows) {
    const userRows = rowsByUser.get(row.user_id) || {};
    userRows[row.data_key] = Array.isArray(row.data) ? (row.data as any[]) : [];
    rowsByUser.set(row.user_id, userRows);
  }

  let migratedPortfolios = 0;
  let migratedTrades = 0;
  let migratedCashflows = 0;
  let migratedDividends = 0;
  let migratedWatchlist = 0;
  let migratedNotes = 0;
  let migratedFinanceAccounts = 0;
  let migratedFinanceTransactions = 0;
  let migratedIpoEvents = 0;
  let migratedIpoAccounts = 0;
  let migratedIpoEntries = 0;
  let skippedRows = 0;

  for (const [ownerUserId, userRows] of rowsByUser.entries()) {
    const user = await prisma.user.findUnique({
      where: { id: ownerUserId },
      select: { id: true },
    });

    if (!user) {
      skippedRows += 1;
      continue;
    }

    const portfolios = userRows.portfolios || [];
    const trades = userRows.trades || [];
    const cashflows = userRows.cashflows || [];
    const dividends = userRows.dividends || [];
    const watchlist = userRows.watchlist || [];
    const notes = userRows.notes || [];
    const financeAccounts = userRows.financeAccounts || [];
    const financeTransactions = userRows.financeTransactions || [];
    const ipoEvents = userRows.ipoEvents || [];
    const ipoAccounts = userRows.ipoAccounts || [];
    const ipoEntries = userRows.ipoEntries || [];

    const { portfolioIdMap, migrated } = await ensurePortfolios(ownerUserId, portfolios, { trades, cashflows, dividends });
    migratedPortfolios += migrated;

    for (const item of trades) {
      if (!item?.stockCode || !item?.dateBuy) continue;
      const normalizedId = normalizeUuid(item?.id, `trade:${ownerUserId}`);
      if (!normalizedId) continue;

      await prisma.trade.upsert({
        where: { id: normalizedId },
        update: {
          portfolioId: normalizePortfolioRef(item?.portfolioId, portfolioIdMap, ownerUserId),
          assetType: item?.assetType === 'mutual_fund' ? 'mutual_fund' : 'stock',
          market: item?.market === 'US' ? 'US' : 'ID',
          stockCode: String(item.stockCode).toUpperCase(),
          dateBuy: new Date(item.dateBuy),
          dateSell: item.dateSell ? new Date(item.dateSell) : null,
          buyPrice: new Prisma.Decimal(toNumber(item.buyPrice)),
          sellPrice: item.sellPrice == null ? null : new Prisma.Decimal(toNumber(item.sellPrice)),
          lots: toNumber(item.lots),
          buyFee: new Prisma.Decimal(toNumber(item.buyFee)),
          sellFee: new Prisma.Decimal(toNumber(item.sellFee)),
          strategy: item.strategy ?? null,
          reasonEntry: item.reasonEntry ?? null,
          reasonExit: item.reasonExit ?? null,
          emotion: item.emotion ?? null,
          rating: item.rating == null ? null : toNumber(item.rating),
          notes: item.notes ?? null,
          tags: {
            deleteMany: {},
            create: toStringArray(item.tags).map((tag) => ({ tag })),
          },
        },
        create: {
          id: normalizedId,
          ownerUserId,
          workspaceId: null,
          portfolioId: normalizePortfolioRef(item?.portfolioId, portfolioIdMap, ownerUserId),
          assetType: item?.assetType === 'mutual_fund' ? 'mutual_fund' : 'stock',
          market: item?.market === 'US' ? 'US' : 'ID',
          stockCode: String(item.stockCode).toUpperCase(),
          dateBuy: new Date(item.dateBuy),
          dateSell: item.dateSell ? new Date(item.dateSell) : null,
          buyPrice: new Prisma.Decimal(toNumber(item.buyPrice)),
          sellPrice: item.sellPrice == null ? null : new Prisma.Decimal(toNumber(item.sellPrice)),
          lots: toNumber(item.lots),
          buyFee: new Prisma.Decimal(toNumber(item.buyFee)),
          sellFee: new Prisma.Decimal(toNumber(item.sellFee)),
          strategy: item.strategy ?? null,
          reasonEntry: item.reasonEntry ?? null,
          reasonExit: item.reasonExit ?? null,
          emotion: item.emotion ?? null,
          rating: item.rating == null ? null : toNumber(item.rating),
          notes: item.notes ?? null,
          createdAt: toDate(item.createdAt),
          updatedAt: toDate(item.updatedAt),
          tags: {
            create: toStringArray(item.tags).map((tag) => ({ tag })),
          },
        },
      });
      migratedTrades += 1;
    }

    for (const item of cashflows) {
      if (!item?.date) continue;
      const normalizedId = normalizeUuid(item?.id, `cashflow:${ownerUserId}`);
      if (!normalizedId) continue;

      await prisma.cashflow.upsert({
        where: { id: normalizedId },
        update: {
          portfolioId: normalizePortfolioRef(item?.portfolioId, portfolioIdMap, ownerUserId),
          type: item?.type === 'withdraw' ? 'withdraw' : 'deposit',
          amount: new Prisma.Decimal(toNumber(item.amount)),
          entryDate: new Date(item.date),
          notes: item?.notes ?? null,
          linkedFinanceTransactionId: normalizeUuid(item?.linkedFinanceTransactionId, `finance-transaction:${ownerUserId}`),
        },
        create: {
          id: normalizedId,
          ownerUserId,
          workspaceId: null,
          portfolioId: normalizePortfolioRef(item?.portfolioId, portfolioIdMap, ownerUserId),
          type: item?.type === 'withdraw' ? 'withdraw' : 'deposit',
          amount: new Prisma.Decimal(toNumber(item.amount)),
          entryDate: new Date(item.date),
          notes: item?.notes ?? null,
          linkedFinanceTransactionId: normalizeUuid(item?.linkedFinanceTransactionId, `finance-transaction:${ownerUserId}`),
          createdAt: toDate(item.createdAt),
          updatedAt: toDate(item.updatedAt),
        },
      });
      migratedCashflows += 1;
    }

    for (const item of dividends) {
      const receivedAt = item?.dateReceived || item?.payDate;
      if (!item?.stockCode || !receivedAt) continue;
      const normalizedId = normalizeUuid(item?.id, `dividend:${ownerUserId}`);
      if (!normalizedId) continue;

      await prisma.dividend.upsert({
        where: { id: normalizedId },
        update: {
          portfolioId: normalizePortfolioRef(item?.portfolioId, portfolioIdMap, ownerUserId),
          stockCode: String(item.stockCode).toUpperCase(),
          amountPerShare: new Prisma.Decimal(toNumber(item.amountPerShare)),
          lots: toNumber(item.lots),
          totalAmount: new Prisma.Decimal(toNumber(item.totalAmount ?? item.amount)),
          dateReceived: new Date(receivedAt),
        },
        create: {
          id: normalizedId,
          ownerUserId,
          workspaceId: null,
          portfolioId: normalizePortfolioRef(item?.portfolioId, portfolioIdMap, ownerUserId),
          stockCode: String(item.stockCode).toUpperCase(),
          amountPerShare: new Prisma.Decimal(toNumber(item.amountPerShare)),
          lots: toNumber(item.lots),
          totalAmount: new Prisma.Decimal(toNumber(item.totalAmount ?? item.amount)),
          dateReceived: new Date(receivedAt),
          createdAt: toDate(item.createdAt),
          updatedAt: toDate(item.updatedAt),
        },
      });
      migratedDividends += 1;
    }

    for (const item of watchlist) {
      if (!item?.stockCode) continue;
      const normalizedId = normalizeUuid(item?.id, `watchlist:${ownerUserId}`);
      if (!normalizedId) continue;

      await prisma.watchlistItem.upsert({
        where: { id: normalizedId },
        update: {
          stockCode: String(item.stockCode).toUpperCase(),
          targetPrice: item.targetPrice == null ? null : new Prisma.Decimal(toNumber(item.targetPrice)),
          targetSellPrice: item.targetSellPrice == null ? null : new Prisma.Decimal(toNumber(item.targetSellPrice)),
          reason: item.reason ?? null,
          status: item.status === 'entered' || item.status === 'passed' ? item.status : 'waiting',
          priority: item.priority === 'high' || item.priority === 'low' ? item.priority : 'medium',
          manualRecommendation: ['BUY', 'SELL', 'HOLD', 'NEUTRAL', 'NONE'].includes(String(item.manualRecommendation))
            ? String(item.manualRecommendation) as any
            : null,
          categories: {
            deleteMany: {},
            create: toStringArray(item.categories).map((category) => ({ category })),
          },
        },
        create: {
          id: normalizedId,
          ownerUserId,
          workspaceId: null,
          stockCode: String(item.stockCode).toUpperCase(),
          targetPrice: item.targetPrice == null ? null : new Prisma.Decimal(toNumber(item.targetPrice)),
          targetSellPrice: item.targetSellPrice == null ? null : new Prisma.Decimal(toNumber(item.targetSellPrice)),
          reason: item.reason ?? null,
          status: item.status === 'entered' || item.status === 'passed' ? item.status : 'waiting',
          priority: item.priority === 'high' || item.priority === 'low' ? item.priority : 'medium',
          manualRecommendation: ['BUY', 'SELL', 'HOLD', 'NEUTRAL', 'NONE'].includes(String(item.manualRecommendation))
            ? String(item.manualRecommendation) as any
            : null,
          createdAt: toDate(item.createdAt),
          updatedAt: toDate(item.updatedAt),
          categories: {
            create: toStringArray(item.categories).map((category) => ({ category })),
          },
        },
      });
      migratedWatchlist += 1;
    }

    for (const item of notes) {
      if (!item?.title || !item?.content) continue;
      const normalizedId = normalizeUuid(item?.id, `note:${ownerUserId}`);
      if (!normalizedId) continue;

      await prisma.note.upsert({
        where: { id: normalizedId },
        update: {
          title: String(item.title),
          content: String(item.content),
        },
        create: {
          id: normalizedId,
          ownerUserId,
          workspaceId: null,
          title: String(item.title),
          content: String(item.content),
          createdAt: toDate(item.createdAt),
          updatedAt: toDate(item.updatedAt),
        },
      });
      migratedNotes += 1;
    }

    for (const item of financeAccounts) {
      if (!item?.name || !item?.institutionName) continue;
      const normalizedId = normalizeFinanceAccountRef(item?.id, ownerUserId);
      if (!normalizedId) continue;

      await prisma.financeAccount.upsert({
        where: { id: normalizedId },
        update: {
          name: String(item.name),
          institutionName: String(item.institutionName),
          type: item.type === 'ewallet' ? 'ewallet' : 'bank',
          currency: 'IDR',
          openingBalance: new Prisma.Decimal(toNumber(item.openingBalance)),
          isActive: item.isActive !== false,
          notes: item.notes ?? null,
        },
        create: {
          id: normalizedId,
          ownerUserId,
          workspaceId: null,
          name: String(item.name),
          institutionName: String(item.institutionName),
          type: item.type === 'ewallet' ? 'ewallet' : 'bank',
          currency: 'IDR',
          openingBalance: new Prisma.Decimal(toNumber(item.openingBalance)),
          isActive: item.isActive !== false,
          notes: item.notes ?? null,
          createdAt: toDate(item.createdAt),
          updatedAt: toDate(item.updatedAt),
        },
      });
      migratedFinanceAccounts += 1;
    }

    for (const item of financeTransactions) {
      if (!item?.accountId || !item?.date || !item?.description) continue;
      const normalizedId = normalizeUuid(item?.id, `finance-transaction:${ownerUserId}`);
      const accountId = normalizeFinanceAccountRef(item?.accountId, ownerUserId);
      if (!normalizedId || !accountId) continue;

      await prisma.financeTransaction.upsert({
        where: { id: normalizedId },
        update: {
          accountId,
          type: ['income', 'expense', 'transfer_in', 'transfer_out', 'adjustment'].includes(String(item.type))
            ? item.type
            : 'expense',
          amount: new Prisma.Decimal(toNumber(item.amount)),
          entryDate: new Date(item.date),
          description: String(item.description),
          counterpartyAccountId: normalizeFinanceAccountRef(item?.counterpartyAccountId, ownerUserId),
          linkedCashflowId: normalizeUuid(item?.linkedCashflowId, `cashflow:${ownerUserId}`),
          linkedPortfolioId: item?.linkedPortfolioId
            ? normalizePortfolioRef(item?.linkedPortfolioId, portfolioIdMap, ownerUserId)
            : null,
          cashflowSyncMode: ['mirror', 'transfer_to_portfolio', 'transfer_from_portfolio'].includes(String(item.cashflowSyncMode))
            ? item.cashflowSyncMode
            : null,
          category: item.category ?? null,
          transferGroupId: normalizeUuid(item?.transferGroupId, `finance-transfer-group:${ownerUserId}`),
          tags: {
            deleteMany: {},
            create: toStringArray(item.tags).map((tag) => ({ tag })),
          },
        },
        create: {
          id: normalizedId,
          ownerUserId,
          workspaceId: null,
          accountId,
          type: ['income', 'expense', 'transfer_in', 'transfer_out', 'adjustment'].includes(String(item.type))
            ? item.type
            : 'expense',
          amount: new Prisma.Decimal(toNumber(item.amount)),
          entryDate: new Date(item.date),
          description: String(item.description),
          counterpartyAccountId: normalizeFinanceAccountRef(item?.counterpartyAccountId, ownerUserId),
          linkedCashflowId: normalizeUuid(item?.linkedCashflowId, `cashflow:${ownerUserId}`),
          linkedPortfolioId: item?.linkedPortfolioId
            ? normalizePortfolioRef(item?.linkedPortfolioId, portfolioIdMap, ownerUserId)
            : null,
          cashflowSyncMode: ['mirror', 'transfer_to_portfolio', 'transfer_from_portfolio'].includes(String(item.cashflowSyncMode))
            ? item.cashflowSyncMode
            : null,
          category: item.category ?? null,
          transferGroupId: normalizeUuid(item?.transferGroupId, `finance-transfer-group:${ownerUserId}`),
          createdAt: toDate(item.createdAt),
          updatedAt: toDate(item.updatedAt),
          tags: {
            create: toStringArray(item.tags).map((tag) => ({ tag })),
          },
        },
      });
      migratedFinanceTransactions += 1;
    }

    for (const item of ipoEvents) {
      if (!item?.stockCode || !item?.ipoDate) continue;
      const normalizedId = normalizeIpoEventRef(item?.id, ownerUserId);
      if (!normalizedId) continue;

      await prisma.ipoEvent.upsert({
        where: { id: normalizedId },
        update: {
          stockCode: String(item.stockCode).toUpperCase(),
          underwriter: item.underwriter ?? null,
          offeringDate: item.offeringDate ? new Date(item.offeringDate) : null,
          ipoDate: new Date(item.ipoDate),
          offeringPrice: new Prisma.Decimal(toNumber(item.offeringPrice)),
          notes: item.notes ?? null,
          sector: item.sector ?? null,
          registrar: item.registrar ?? null,
          targetBoard: item.targetBoard ?? null,
          bookbuildingStartDate: item.bookbuildingStartDate ? new Date(item.bookbuildingStartDate) : null,
          bookbuildingEndDate: item.bookbuildingEndDate ? new Date(item.bookbuildingEndDate) : null,
          lotPoolingAmount: item.lotPoolingAmount == null ? null : new Prisma.Decimal(toNumber(item.lotPoolingAmount)),
          allotmentDate: item.allotmentDate ? new Date(item.allotmentDate) : null,
          refundDate: item.refundDate ? new Date(item.refundDate) : null,
          distributionDate: item.distributionDate ? new Date(item.distributionDate) : null,
        },
        create: {
          id: normalizedId,
          ownerUserId,
          workspaceId: null,
          stockCode: String(item.stockCode).toUpperCase(),
          underwriter: item.underwriter ?? null,
          offeringDate: item.offeringDate ? new Date(item.offeringDate) : null,
          ipoDate: new Date(item.ipoDate),
          offeringPrice: new Prisma.Decimal(toNumber(item.offeringPrice)),
          notes: item.notes ?? null,
          sector: item.sector ?? null,
          registrar: item.registrar ?? null,
          targetBoard: item.targetBoard ?? null,
          bookbuildingStartDate: item.bookbuildingStartDate ? new Date(item.bookbuildingStartDate) : null,
          bookbuildingEndDate: item.bookbuildingEndDate ? new Date(item.bookbuildingEndDate) : null,
          lotPoolingAmount: item.lotPoolingAmount == null ? null : new Prisma.Decimal(toNumber(item.lotPoolingAmount)),
          allotmentDate: item.allotmentDate ? new Date(item.allotmentDate) : null,
          refundDate: item.refundDate ? new Date(item.refundDate) : null,
          distributionDate: item.distributionDate ? new Date(item.distributionDate) : null,
          createdAt: toDate(item.createdAt),
          updatedAt: toDate(item.updatedAt),
        },
      });
      migratedIpoEvents += 1;
    }

    for (const item of ipoAccounts) {
      if (!item?.name || !item?.email) continue;
      const normalizedId = normalizeIpoAccountRef(item?.id, ownerUserId);
      if (!normalizedId) continue;

      await prisma.ipoAccount.upsert({
        where: { id: normalizedId },
        update: {
          name: String(item.name),
          email: String(item.email),
          normalizedKey: item.normalizedKey || `${String(item.name).trim().toLowerCase()}::${String(item.email).trim().toLowerCase()}`,
          lastUsedAt: item.lastUsedAt ? new Date(item.lastUsedAt) : new Date(),
        },
        create: {
          id: normalizedId,
          ownerUserId,
          workspaceId: null,
          name: String(item.name),
          email: String(item.email),
          normalizedKey: item.normalizedKey || `${String(item.name).trim().toLowerCase()}::${String(item.email).trim().toLowerCase()}`,
          lastUsedAt: item.lastUsedAt ? new Date(item.lastUsedAt) : new Date(),
          createdAt: toDate(item.createdAt),
          updatedAt: toDate(item.updatedAt),
        },
      });
      migratedIpoAccounts += 1;
    }

    for (const [index, item] of ipoEntries.entries()) {
      if (!item?.ipoEventId || !item?.accountName || !item?.email) continue;
      const normalizedId = normalizeUuid(item?.id, `ipo-entry:${ownerUserId}`);
      const ipoEventId = normalizeIpoEventRef(item?.ipoEventId, ownerUserId);
      if (!normalizedId || !ipoEventId) continue;

      await prisma.ipoEntry.upsert({
        where: { id: normalizedId },
        update: {
          ipoEventId,
          ipoAccountId: normalizeIpoAccountRef(item?.ipoAccountId, ownerUserId),
          rowNo: toNumber(item.no ?? item.rowNo, index + 1),
          accountName: String(item.accountName),
          email: String(item.email),
          buyPrice: new Prisma.Decimal(toNumber(item.buyPrice)),
          lots: toNumber(item.lots),
          sellPrice: new Prisma.Decimal(toNumber(item.sellPrice)),
          slTl: item.slTl === '-' ? 'NONE' : (['SL', 'TL', 'NONE'].includes(String(item.slTl)) ? item.slTl : 'NONE'),
          action: item.action === 'KEEP' ? 'KEEP' : 'SELL',
          notes: item.notes ?? null,
        },
        create: {
          id: normalizedId,
          ownerUserId,
          workspaceId: null,
          ipoEventId,
          ipoAccountId: normalizeIpoAccountRef(item?.ipoAccountId, ownerUserId),
          rowNo: toNumber(item.no ?? item.rowNo, index + 1),
          accountName: String(item.accountName),
          email: String(item.email),
          buyPrice: new Prisma.Decimal(toNumber(item.buyPrice)),
          lots: toNumber(item.lots),
          sellPrice: new Prisma.Decimal(toNumber(item.sellPrice)),
          slTl: item.slTl === '-' ? 'NONE' : (['SL', 'TL', 'NONE'].includes(String(item.slTl)) ? item.slTl : 'NONE'),
          action: item.action === 'KEEP' ? 'KEEP' : 'SELL',
          notes: item.notes ?? null,
          createdAt: toDate(item.createdAt),
          updatedAt: toDate(item.updatedAt),
        },
      });
      migratedIpoEntries += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        migratedPortfolios,
        migratedTrades,
        migratedCashflows,
        migratedDividends,
        migratedWatchlist,
        migratedNotes,
        migratedFinanceAccounts,
        migratedFinanceTransactions,
        migratedIpoEvents,
        migratedIpoAccounts,
        migratedIpoEntries,
        skippedRows,
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
