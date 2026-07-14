import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDividendDto } from './dto/create-dividend.dto';
import { UpdateDividendDto } from './dto/update-dividend.dto';
import { toNumber } from '../common/prisma.utils';

@Injectable()
export class DividendsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerUserId: string, workspaceId: string | null) {
    const rows = await this.prisma.dividend.findMany({
      where: { ownerUserId, workspaceId },
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      stockCode: row.stockCode,
      amountPerShare: toNumber(row.amountPerShare),
      lots: row.lots,
      totalAmount: toNumber(row.totalAmount),
      dateReceived: row.dateReceived.toISOString().slice(0, 10),
      cumDate: row.cumDate ? row.cumDate.toISOString().slice(0, 10) : null,
      notes: row.notes,
      market: row.market,
      portfolioId: row.portfolioId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async create(ownerUserId: string, workspaceId: string | null, payload: CreateDividendDto) {
    await this.ensurePortfolioExists(ownerUserId, workspaceId, payload.portfolioId);

    const created = await this.prisma.$transaction(async (tx) => {
      const dividend = await tx.dividend.create({
        data: {
          ownerUserId,
          workspaceId,
          portfolioId: payload.portfolioId || null,
          stockCode: payload.stockCode.toUpperCase(),
          amountPerShare: new Prisma.Decimal(payload.amountPerShare),
          lots: Number(payload.lots),
          totalAmount: new Prisma.Decimal(payload.totalAmount),
          dateReceived: new Date(payload.dateReceived),
          cumDate: payload.cumDate ? new Date(payload.cumDate) : null,
          notes: payload.notes ?? null,
          market: payload.market ?? 'ID',
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'dividend.created',
          targetType: 'dividend',
          targetId: dividend.id,
          metadata: {
            stockCode: dividend.stockCode,
            portfolioId: dividend.portfolioId,
          },
        },
      });

      return dividend;
    });

    return this.serializeDividend(created);
  }

  async update(ownerUserId: string, workspaceId: string | null, dividendId: string, payload: UpdateDividendDto) {
    const existing = await this.prisma.dividend.findFirst({
      where: { id: dividendId, ownerUserId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Dividend tidak ditemukan.');
    }

    await this.ensurePortfolioExists(ownerUserId, workspaceId, payload.portfolioId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const dividend = await tx.dividend.update({
        where: { id: dividendId },
        data: {
          portfolioId: payload.portfolioId === undefined ? undefined : payload.portfolioId || null,
          stockCode: payload.stockCode ? payload.stockCode.toUpperCase() : undefined,
          amountPerShare: payload.amountPerShare == null ? undefined : new Prisma.Decimal(payload.amountPerShare),
          lots: payload.lots ?? undefined,
          totalAmount: payload.totalAmount == null ? undefined : new Prisma.Decimal(payload.totalAmount),
          dateReceived: payload.dateReceived ? new Date(payload.dateReceived) : undefined,
          cumDate: payload.cumDate !== undefined ? (payload.cumDate ? new Date(payload.cumDate) : null) : undefined,
          notes: payload.notes !== undefined ? payload.notes : undefined,
          market: payload.market ?? undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'dividend.updated',
          targetType: 'dividend',
          targetId: dividend.id,
          metadata: { fieldsUpdated: Object.keys(payload) },
        },
      });

      return dividend;
    });

    return this.serializeDividend(updated);
  }

  async remove(ownerUserId: string, workspaceId: string | null, dividendId: string) {
    const existing = await this.prisma.dividend.findFirst({
      where: { id: dividendId, ownerUserId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Dividend tidak ditemukan.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.dividend.delete({ where: { id: dividendId } });
      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'dividend.deleted',
          targetType: 'dividend',
          targetId: dividendId,
          metadata: {
            stockCode: existing.stockCode,
            portfolioId: existing.portfolioId,
          },
        },
      });
    });

    return { id: dividendId };
  }

  private serializeDividend(row: {
    id: string;
    stockCode: string;
    amountPerShare: Prisma.Decimal;
    lots: number;
    totalAmount: Prisma.Decimal;
    dateReceived: Date;
    cumDate: Date | null;
    notes: string | null;
    market: string;
    portfolioId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      stockCode: row.stockCode,
      amountPerShare: toNumber(row.amountPerShare),
      lots: row.lots,
      totalAmount: toNumber(row.totalAmount),
      dateReceived: row.dateReceived.toISOString().slice(0, 10),
      cumDate: row.cumDate ? row.cumDate.toISOString().slice(0, 10) : null,
      notes: row.notes,
      market: row.market,
      portfolioId: row.portfolioId,
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
