import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toNumber } from '../common/prisma.utils';
import { CreateFinanceTransferDto } from './dto/create-finance-transfer.dto';
import { CreateFinanceTransactionDto } from './dto/create-finance-transaction.dto';
import { UpdateFinanceTransactionDto } from './dto/update-finance-transaction.dto';

@Injectable()
export class FinanceTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerUserId: string, workspaceId: string | null) {
    const rows = await this.prisma.financeTransaction.findMany({
      where: { ownerUserId, workspaceId },
      include: {
        tags: {
          orderBy: { tag: 'asc' },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      accountId: row.accountId,
      type: row.type,
      amount: toNumber(row.amount),
      date: row.entryDate.toISOString().slice(0, 10),
      description: row.description,
      counterpartyAccountId: row.counterpartyAccountId,
      linkedCashflowId: row.linkedCashflowId,
      linkedPortfolioId: row.linkedPortfolioId,
      cashflowSyncMode: row.cashflowSyncMode,
      category: row.category,
      transferGroupId: row.transferGroupId,
      tags: row.tags.map((item) => item.tag),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async create(ownerUserId: string, workspaceId: string | null, payload: CreateFinanceTransactionDto) {
    await this.validateReferences(ownerUserId, workspaceId, payload);

    const created = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.financeTransaction.create({
        data: {
          ownerUserId,
          workspaceId,
          accountId: payload.accountId,
          type: payload.type,
          amount: new Prisma.Decimal(payload.amount),
          entryDate: new Date(payload.date),
          description: payload.description,
          counterpartyAccountId: payload.counterpartyAccountId ?? null,
          linkedCashflowId: payload.linkedCashflowId ?? null,
          linkedPortfolioId: payload.linkedPortfolioId ?? null,
          cashflowSyncMode: payload.cashflowSyncMode ?? null,
          category: payload.category ?? null,
          transferGroupId: payload.transferGroupId ?? null,
          tags: payload.tags?.length
            ? {
                create: payload.tags.map((tag) => tag.trim()).filter(Boolean).map((tag) => ({ tag })),
              }
            : undefined,
        },
        include: { tags: true },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'finance_transaction.created',
          targetType: 'finance_transaction',
          targetId: transaction.id,
          metadata: { accountId: transaction.accountId, type: transaction.type },
        },
      });

      return transaction;
    });

    return this.serializeTransaction(created);
  }

  async update(ownerUserId: string, workspaceId: string | null, transactionId: string, payload: UpdateFinanceTransactionDto) {
    const existing = await this.prisma.financeTransaction.findFirst({
      where: { id: transactionId, ownerUserId, workspaceId },
      include: { tags: true },
    });

    if (!existing) {
      throw new NotFoundException('Transaksi finance tidak ditemukan.');
    }

    await this.validateReferences(ownerUserId, workspaceId, payload);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (payload.tags) {
        await tx.financeTransactionTag.deleteMany({
          where: { financeTransactionId: transactionId },
        });
      }

      const transaction = await tx.financeTransaction.update({
        where: { id: transactionId },
        data: {
          accountId: payload.accountId ?? undefined,
          type: payload.type ?? undefined,
          amount: payload.amount == null ? undefined : new Prisma.Decimal(payload.amount),
          entryDate: payload.date ? new Date(payload.date) : undefined,
          description: payload.description ?? undefined,
          counterpartyAccountId:
            payload.counterpartyAccountId === undefined ? undefined : payload.counterpartyAccountId || null,
          linkedCashflowId: payload.linkedCashflowId === undefined ? undefined : payload.linkedCashflowId || null,
          linkedPortfolioId: payload.linkedPortfolioId === undefined ? undefined : payload.linkedPortfolioId || null,
          cashflowSyncMode: payload.cashflowSyncMode === undefined ? undefined : payload.cashflowSyncMode || null,
          category: payload.category === undefined ? undefined : payload.category || null,
          transferGroupId: payload.transferGroupId === undefined ? undefined : payload.transferGroupId || null,
          tags: payload.tags
            ? {
                create: payload.tags.map((tag) => tag.trim()).filter(Boolean).map((tag) => ({ tag })),
              }
            : undefined,
        },
        include: { tags: true },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'finance_transaction.updated',
          targetType: 'finance_transaction',
          targetId: transaction.id,
          metadata: { fieldsUpdated: Object.keys(payload) },
        },
      });

      return transaction;
    });

    return this.serializeTransaction(updated);
  }

  async remove(ownerUserId: string, workspaceId: string | null, transactionId: string) {
    const existing = await this.prisma.financeTransaction.findFirst({
      where: { id: transactionId, ownerUserId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Transaksi finance tidak ditemukan.');
    }

    const where = existing.transferGroupId
      ? { ownerUserId, workspaceId, transferGroupId: existing.transferGroupId }
      : { ownerUserId, workspaceId, id: transactionId };

    const relatedTransactions = await this.prisma.financeTransaction.findMany({
      where,
      select: { id: true, linkedCashflowId: true },
    });

    const linkedCashflowIds = relatedTransactions
      .map((transaction) => transaction.linkedCashflowId)
      .filter((id): id is string => Boolean(id));

    await this.prisma.$transaction(async (tx) => {
      if (linkedCashflowIds.length > 0) {
        await tx.cashflow.deleteMany({
          where: {
            ownerUserId,
            workspaceId,
            id: { in: linkedCashflowIds },
          },
        });
      }

      await tx.financeTransaction.deleteMany({ where });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'finance_transaction.deleted',
          targetType: 'finance_transaction',
          targetId: transactionId,
          metadata: {
            transferGroupId: existing.transferGroupId,
            deletedCount: relatedTransactions.length,
          },
        },
      });
    });

    return { id: transactionId };
  }

  async createTransfer(ownerUserId: string, workspaceId: string | null, payload: CreateFinanceTransferDto) {
    if (payload.fromAccountId === payload.toAccountId) {
      throw new BadRequestException('Rekening asal dan tujuan tidak boleh sama.');
    }

    const [fromAccount, toAccount] = await Promise.all([
      this.prisma.financeAccount.findFirst({
        where: { id: payload.fromAccountId, ownerUserId, workspaceId },
      }),
      this.prisma.financeAccount.findFirst({
        where: { id: payload.toAccountId, ownerUserId, workspaceId },
      }),
    ]);

    if (!fromAccount || !toAccount) {
      throw new BadRequestException('Rekening transfer tidak ditemukan pada konteks user aktif.');
    }

    const amount = Math.abs(Number(payload.amount) || 0);
    if (!amount) {
      throw new BadRequestException('Nominal transfer harus lebih dari 0.');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const transferGroupId = crypto.randomUUID();
      const description = payload.description?.trim() || 'Transfer internal';

      const sourceTransaction = await tx.financeTransaction.create({
        data: {
          ownerUserId,
          workspaceId,
          accountId: payload.fromAccountId,
          type: 'transfer_out',
          amount: new Prisma.Decimal(amount),
          entryDate: new Date(payload.date),
          description,
          counterpartyAccountId: payload.toAccountId,
          transferGroupId,
        },
        include: { tags: true },
      });

      const targetTransaction = await tx.financeTransaction.create({
        data: {
          ownerUserId,
          workspaceId,
          accountId: payload.toAccountId,
          type: 'transfer_in',
          amount: new Prisma.Decimal(amount),
          entryDate: new Date(payload.date),
          description,
          counterpartyAccountId: payload.fromAccountId,
          transferGroupId,
        },
        include: { tags: true },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'finance_transfer.created',
          targetType: 'finance_transfer_group',
          targetId: transferGroupId,
          metadata: {
            fromAccountId: payload.fromAccountId,
            toAccountId: payload.toAccountId,
            amount,
          },
        },
      });

      return { transferGroupId, sourceTransaction, targetTransaction };
    });

    return {
      transferGroupId: created.transferGroupId,
      sourceTransaction: this.serializeTransaction(created.sourceTransaction),
      targetTransaction: this.serializeTransaction(created.targetTransaction),
    };
  }

  private serializeTransaction(row: {
    id: string;
    accountId: string;
    type: string;
    amount: Prisma.Decimal;
    entryDate: Date;
    description: string;
    counterpartyAccountId: string | null;
    linkedCashflowId: string | null;
    linkedPortfolioId: string | null;
    cashflowSyncMode: string | null;
    category: string | null;
    transferGroupId: string | null;
    createdAt: Date;
    updatedAt: Date;
    tags?: Array<{ tag: string }>;
  }) {
    return {
      id: row.id,
      accountId: row.accountId,
      type: row.type,
      amount: toNumber(row.amount),
      date: row.entryDate.toISOString().slice(0, 10),
      description: row.description,
      counterpartyAccountId: row.counterpartyAccountId,
      linkedCashflowId: row.linkedCashflowId,
      linkedPortfolioId: row.linkedPortfolioId,
      cashflowSyncMode: row.cashflowSyncMode,
      category: row.category,
      transferGroupId: row.transferGroupId,
      tags: row.tags?.map((item) => item.tag) ?? [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async validateReferences(
    ownerUserId: string,
    workspaceId: string | null,
    payload: Partial<CreateFinanceTransactionDto>,
  ) {
    if (payload.accountId) {
      const account = await this.prisma.financeAccount.findFirst({
        where: { id: payload.accountId, ownerUserId, workspaceId },
        select: { id: true },
      });
      if (!account) {
        throw new BadRequestException('Rekening finance tidak ditemukan.');
      }
    }

    if (payload.counterpartyAccountId) {
      const account = await this.prisma.financeAccount.findFirst({
        where: { id: payload.counterpartyAccountId, ownerUserId, workspaceId },
        select: { id: true },
      });
      if (!account) {
        throw new BadRequestException('Rekening counterparty tidak ditemukan.');
      }
    }

    if (payload.linkedPortfolioId) {
      const portfolio = await this.prisma.portfolio.findFirst({
        where: { id: payload.linkedPortfolioId, ownerUserId, workspaceId },
        select: { id: true },
      });
      if (!portfolio) {
        throw new BadRequestException('Portfolio terkait tidak ditemukan.');
      }
    }
  }
}
