import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toNumber } from '../common/prisma.utils';
import { CreateFinanceAccountDto } from './dto/create-finance-account.dto';
import { UpdateFinanceAccountDto } from './dto/update-finance-account.dto';

@Injectable()
export class FinanceAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerUserId: string, workspaceId: string | null) {
    const rows = await this.prisma.financeAccount.findMany({
      where: { ownerUserId, workspaceId },
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      institutionName: row.institutionName,
      type: row.type,
      currency: row.currency,
      openingBalance: toNumber(row.openingBalance),
      isActive: row.isActive,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async create(ownerUserId: string, workspaceId: string | null, payload: CreateFinanceAccountDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const account = await tx.financeAccount.create({
        data: {
          ownerUserId,
          workspaceId,
          name: payload.name,
          institutionName: payload.institutionName,
          type: payload.type,
          currency: 'IDR',
          openingBalance: new Prisma.Decimal(payload.openingBalance),
          isActive: payload.isActive ?? true,
          notes: payload.notes ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'finance_account.created',
          targetType: 'finance_account',
          targetId: account.id,
          metadata: { type: account.type },
        },
      });

      return account;
    });

    return this.serializeAccount(created);
  }

  async update(ownerUserId: string, workspaceId: string | null, accountId: string, payload: UpdateFinanceAccountDto) {
    const existing = await this.prisma.financeAccount.findFirst({
      where: { id: accountId, ownerUserId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Rekening finance tidak ditemukan.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const account = await tx.financeAccount.update({
        where: { id: accountId },
        data: {
          name: payload.name ?? undefined,
          institutionName: payload.institutionName ?? undefined,
          type: payload.type ?? undefined,
          openingBalance: payload.openingBalance == null ? undefined : new Prisma.Decimal(payload.openingBalance),
          isActive: payload.isActive ?? undefined,
          notes: payload.notes === undefined ? undefined : payload.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'finance_account.updated',
          targetType: 'finance_account',
          targetId: account.id,
          metadata: { fieldsUpdated: Object.keys(payload) },
        },
      });

      return account;
    });

    return this.serializeAccount(updated);
  }

  async remove(ownerUserId: string, workspaceId: string | null, accountId: string) {
    const existing = await this.prisma.financeAccount.findFirst({
      where: { id: accountId, ownerUserId, workspaceId },
      include: {
        transactions: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Rekening finance tidak ditemukan.');
    }

    const linkedCashflowIds = existing.transactions
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

      await tx.portfolio.updateMany({
        where: {
          ownerUserId,
          workspaceId,
          financeAccountId: accountId,
        },
        data: {
          financeAccountId: null,
        },
      });

      await tx.financeAccount.delete({
        where: { id: accountId },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'finance_account.deleted',
          targetType: 'finance_account',
          targetId: accountId,
          metadata: {
            type: existing.type,
            linkedCashflowCount: linkedCashflowIds.length,
          },
        },
      });
    });

    return { id: accountId };
  }

  private serializeAccount(row: {
    id: string;
    name: string;
    institutionName: string;
    type: string;
    currency: string;
    openingBalance: Prisma.Decimal;
    isActive: boolean;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      name: row.name,
      institutionName: row.institutionName,
      type: row.type,
      currency: row.currency,
      openingBalance: toNumber(row.openingBalance),
      isActive: row.isActive,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
