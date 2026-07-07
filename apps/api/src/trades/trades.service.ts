import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toNumber } from '../common/prisma.utils';
import { CreateTradeDto } from './dto/create-trade.dto';
import { UpdateTradeDto } from './dto/update-trade.dto';

@Injectable()
export class TradesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerUserId: string, workspaceId: string | null) {
    const trades = await this.prisma.trade.findMany({
      where: {
        ownerUserId,
        workspaceId,
      },
      include: {
        tags: {
          orderBy: { tag: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return trades.map((trade) => this.serializeTrade(trade));
  }

  async create(ownerUserId: string, workspaceId: string | null, payload: CreateTradeDto) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: {
        id: payload.portfolioId,
        ownerUserId,
        workspaceId,
      },
    });

    if (!portfolio) {
      throw new BadRequestException('Portfolio tidak ditemukan untuk user aktif.');
    }

    const trade = await this.prisma.$transaction(async (tx) => {
      const created = await tx.trade.create({
        data: {
          ownerUserId,
          workspaceId,
          portfolioId: payload.portfolioId,
          assetType: payload.assetType ?? 'stock',
          market: payload.market,
          stockCode: payload.stockCode.toUpperCase(),
          dateBuy: new Date(payload.dateBuy),
          dateSell: payload.dateSell ? new Date(payload.dateSell) : null,
          buyPrice: new Prisma.Decimal(payload.buyPrice),
          sellPrice: payload.sellPrice != null ? new Prisma.Decimal(payload.sellPrice) : null,
          lots: payload.lots,
          buyFee: new Prisma.Decimal(payload.buyFee),
          sellFee: new Prisma.Decimal(payload.sellFee),
          strategy: payload.strategy ?? null,
          reasonEntry: payload.reasonEntry ?? null,
          reasonExit: payload.reasonExit ?? null,
          emotion: payload.emotion ?? null,
          rating: payload.rating ?? null,
          notes: payload.notes ?? null,
          tags: payload.tags?.length
            ? {
                create: payload.tags
                  .map((tag) => tag.trim())
                  .filter(Boolean)
                  .map((tag) => ({ tag })),
              }
            : undefined,
        },
        include: {
          tags: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'trade.created',
          targetType: 'trade',
          targetId: created.id,
          metadata: {
            stockCode: created.stockCode,
            portfolioId: created.portfolioId,
          },
        },
      });

      return created;
    });

    return this.serializeTrade(trade);
  }

  async update(ownerUserId: string, workspaceId: string | null, tradeId: string, payload: UpdateTradeDto) {
    const existing = await this.prisma.trade.findFirst({
      where: {
        id: tradeId,
        ownerUserId,
        workspaceId,
      },
      include: {
        tags: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Trade tidak ditemukan.');
    }

    if (payload.portfolioId) {
      const portfolio = await this.prisma.portfolio.findFirst({
        where: {
          id: payload.portfolioId,
          ownerUserId,
          workspaceId,
        },
      });

      if (!portfolio) {
        throw new BadRequestException('Portfolio tujuan tidak ditemukan.');
      }
    }

    const beforeData = this.serializeTrade(existing);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (payload.tags) {
        await tx.tradeTag.deleteMany({
          where: {
            tradeId,
          },
        });
      }

      const next = await tx.trade.update({
        where: { id: tradeId },
        data: {
          portfolioId: payload.portfolioId ?? undefined,
          assetType: payload.assetType ?? undefined,
          market: payload.market ?? undefined,
          stockCode: payload.stockCode ? payload.stockCode.toUpperCase() : undefined,
          dateBuy: payload.dateBuy ? new Date(payload.dateBuy) : undefined,
          dateSell: payload.dateSell === undefined ? undefined : payload.dateSell ? new Date(payload.dateSell) : null,
          buyPrice: payload.buyPrice == null ? undefined : new Prisma.Decimal(payload.buyPrice),
          sellPrice: payload.sellPrice === undefined ? undefined : payload.sellPrice == null ? null : new Prisma.Decimal(payload.sellPrice),
          lots: payload.lots ?? undefined,
          buyFee: payload.buyFee == null ? undefined : new Prisma.Decimal(payload.buyFee),
          sellFee: payload.sellFee == null ? undefined : new Prisma.Decimal(payload.sellFee),
          strategy: payload.strategy === undefined ? undefined : payload.strategy,
          reasonEntry: payload.reasonEntry === undefined ? undefined : payload.reasonEntry,
          reasonExit: payload.reasonExit === undefined ? undefined : payload.reasonExit,
          emotion: payload.emotion === undefined ? undefined : payload.emotion,
          rating: payload.rating === undefined ? undefined : payload.rating,
          notes: payload.notes === undefined ? undefined : payload.notes,
          tags: payload.tags
            ? {
                create: payload.tags
                  .map((tag) => tag.trim())
                  .filter(Boolean)
                  .map((tag) => ({ tag })),
              }
            : undefined,
        },
        include: {
          tags: true,
        },
      });

      await tx.tradeAuditLog.create({
        data: {
          tradeId,
          editedByUserId: ownerUserId,
          beforeData,
          afterData: this.serializeTrade(next),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'trade.updated',
          targetType: 'trade',
          targetId: next.id,
          metadata: {
            fieldsUpdated: Object.keys(payload),
          },
        },
      });

      return next;
    });

    return this.serializeTrade(updated);
  }

  async remove(ownerUserId: string, workspaceId: string | null, tradeId: string) {
    const existing = await this.prisma.trade.findFirst({
      where: {
        id: tradeId,
        ownerUserId,
        workspaceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Trade tidak ditemukan.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.trade.delete({
        where: {
          id: tradeId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'trade.deleted',
          targetType: 'trade',
          targetId: tradeId,
          metadata: {
            stockCode: existing.stockCode,
          },
        },
      });
    });

    return { id: tradeId };
  }

  private serializeTrade(trade: {
    id: string;
    portfolioId: string;
    assetType: string;
    market: string;
    stockCode: string;
    dateBuy: Date;
    dateSell: Date | null;
    buyPrice: Prisma.Decimal;
    sellPrice: Prisma.Decimal | null;
    lots: number;
    buyFee: Prisma.Decimal;
    sellFee: Prisma.Decimal;
    strategy: string | null;
    reasonEntry: string | null;
    reasonExit: string | null;
    emotion: string | null;
    rating: number | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    tags?: Array<{ tag: string }>;
  }) {
    return {
      id: trade.id,
      portfolioId: trade.portfolioId,
      assetType: trade.assetType,
      market: trade.market,
      stockCode: trade.stockCode,
      dateBuy: trade.dateBuy.toISOString().slice(0, 10),
      dateSell: trade.dateSell ? trade.dateSell.toISOString().slice(0, 10) : null,
      buyPrice: toNumber(trade.buyPrice),
      sellPrice: toNumber(trade.sellPrice),
      lots: trade.lots,
      buyFee: toNumber(trade.buyFee),
      sellFee: toNumber(trade.sellFee),
      strategy: trade.strategy,
      reasonEntry: trade.reasonEntry,
      reasonExit: trade.reasonExit,
      emotion: trade.emotion,
      rating: trade.rating,
      notes: trade.notes,
      createdAt: trade.createdAt,
      updatedAt: trade.updatedAt,
      tags: trade.tags?.map((item) => item.tag) ?? [],
    };
  }
}
