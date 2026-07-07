import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCashflowDto } from './dto/create-cashflow.dto';
import { UpdateCashflowDto } from './dto/update-cashflow.dto';
import { toNumber } from '../common/prisma.utils';

@Injectable()
export class CashflowsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerUserId: string, workspaceId: string | null) {
    const rows = await this.prisma.cashflow.findMany({
      where: { ownerUserId, workspaceId },
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: toNumber(row.amount),
      date: row.entryDate.toISOString().slice(0, 10),
      notes: row.notes,
      portfolioId: row.portfolioId,
      linkedFinanceTransactionId: row.linkedFinanceTransactionId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async create(ownerUserId: string, workspaceId: string | null, payload: CreateCashflowDto) {
    await this.ensurePortfolioExists(ownerUserId, workspaceId, payload.portfolioId);

    const created = await this.prisma.$transaction(async (tx) => {
      const cashflow = await tx.cashflow.create({
        data: {
          ownerUserId,
          workspaceId,
          portfolioId: payload.portfolioId || null,
          type: payload.type,
          amount: new Prisma.Decimal(payload.amount),
          entryDate: new Date(payload.date),
          notes: payload.notes ?? null,
          linkedFinanceTransactionId: payload.linkedFinanceTransactionId ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'cashflow.created',
          targetType: 'cashflow',
          targetId: cashflow.id,
          metadata: {
            type: cashflow.type,
            portfolioId: cashflow.portfolioId,
          },
        },
      });

      return cashflow;
    });

    return this.serializeCashflow(created);
  }

  async update(ownerUserId: string, workspaceId: string | null, cashflowId: string, payload: UpdateCashflowDto) {
    const existing = await this.prisma.cashflow.findFirst({
      where: { id: cashflowId, ownerUserId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Cashflow tidak ditemukan.');
    }

    await this.ensurePortfolioExists(ownerUserId, workspaceId, payload.portfolioId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const cashflow = await tx.cashflow.update({
        where: { id: cashflowId },
        data: {
          portfolioId: payload.portfolioId === undefined ? undefined : payload.portfolioId || null,
          type: payload.type ?? undefined,
          amount: payload.amount == null ? undefined : new Prisma.Decimal(payload.amount),
          entryDate: payload.date ? new Date(payload.date) : undefined,
          notes: payload.notes === undefined ? undefined : payload.notes,
          linkedFinanceTransactionId:
            payload.linkedFinanceTransactionId === undefined ? undefined : payload.linkedFinanceTransactionId || null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'cashflow.updated',
          targetType: 'cashflow',
          targetId: cashflow.id,
          metadata: { fieldsUpdated: Object.keys(payload) },
        },
      });

      return cashflow;
    });

    return this.serializeCashflow(updated);
  }

  async remove(ownerUserId: string, workspaceId: string | null, cashflowId: string) {
    const existing = await this.prisma.cashflow.findFirst({
      where: { id: cashflowId, ownerUserId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Cashflow tidak ditemukan.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cashflow.delete({ where: { id: cashflowId } });
      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'cashflow.deleted',
          targetType: 'cashflow',
          targetId: cashflowId,
          metadata: {
            type: existing.type,
            portfolioId: existing.portfolioId,
          },
        },
      });
    });

    return { id: cashflowId };
  }

  private serializeCashflow(row: {
    id: string;
    type: string;
    amount: Prisma.Decimal;
    entryDate: Date;
    notes: string | null;
    portfolioId: string | null;
    linkedFinanceTransactionId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      type: row.type,
      amount: toNumber(row.amount),
      date: row.entryDate.toISOString().slice(0, 10),
      notes: row.notes,
      portfolioId: row.portfolioId,
      linkedFinanceTransactionId: row.linkedFinanceTransactionId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async ensurePortfolioExists(ownerUserId: string, workspaceId: string | null, portfolioId?: string) {
    if (!portfolioId) return;

    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId, ownerUserId, workspaceId },
      select: { id: true },
    });

    if (!portfolio) {
      throw new BadRequestException('Portfolio tidak ditemukan untuk user aktif.');
    }
  }
}
