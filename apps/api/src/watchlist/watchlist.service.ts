import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWatchlistItemDto } from './dto/create-watchlist-item.dto';
import { UpdateWatchlistItemDto } from './dto/update-watchlist-item.dto';
import { toNumber } from '../common/prisma.utils';

@Injectable()
export class WatchlistService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerUserId: string, workspaceId: string | null) {
    const rows = await this.prisma.watchlistItem.findMany({
      where: { ownerUserId, workspaceId },
      include: {
        categories: {
          orderBy: { category: 'asc' },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      stockCode: row.stockCode,
      targetPrice: toNumber(row.targetPrice),
      targetSellPrice: toNumber(row.targetSellPrice),
      reason: row.reason,
      status: row.status,
      priority: row.priority,
      manualRecommendation: row.manualRecommendation,
      categories: row.categories.map((item) => item.category),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async create(ownerUserId: string, workspaceId: string | null, payload: CreateWatchlistItemDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const watchlistItem = await tx.watchlistItem.create({
        data: {
          ownerUserId,
          workspaceId,
          stockCode: payload.stockCode.toUpperCase(),
          targetPrice: payload.targetPrice == null ? null : new Prisma.Decimal(payload.targetPrice),
          targetSellPrice: payload.targetSellPrice == null ? null : new Prisma.Decimal(payload.targetSellPrice),
          reason: payload.reason ?? null,
          status: payload.status,
          priority: payload.priority,
          manualRecommendation: payload.manualRecommendation ?? null,
          categories: payload.categories?.length
            ? {
                create: payload.categories
                  .map((category) => category.trim())
                  .filter(Boolean)
                  .map((category) => ({ category })),
              }
            : undefined,
        },
        include: {
          categories: {
            orderBy: { category: 'asc' },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'watchlist.created',
          targetType: 'watchlist_item',
          targetId: watchlistItem.id,
          metadata: {
            stockCode: watchlistItem.stockCode,
          },
        },
      });

      return watchlistItem;
    });

    return this.serializeWatchlistItem(created);
  }

  async update(ownerUserId: string, workspaceId: string | null, itemId: string, payload: UpdateWatchlistItemDto) {
    const existing = await this.prisma.watchlistItem.findFirst({
      where: { id: itemId, ownerUserId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Item watchlist tidak ditemukan.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (payload.categories) {
        await tx.watchlistCategory.deleteMany({
          where: { watchlistItemId: itemId },
        });
      }

      const watchlistItem = await tx.watchlistItem.update({
        where: { id: itemId },
        data: {
          stockCode: payload.stockCode ? payload.stockCode.toUpperCase() : undefined,
          targetPrice: payload.targetPrice === undefined ? undefined : payload.targetPrice == null ? null : new Prisma.Decimal(payload.targetPrice),
          targetSellPrice:
            payload.targetSellPrice === undefined ? undefined : payload.targetSellPrice == null ? null : new Prisma.Decimal(payload.targetSellPrice),
          reason: payload.reason === undefined ? undefined : payload.reason,
          status: payload.status ?? undefined,
          priority: payload.priority ?? undefined,
          manualRecommendation:
            payload.manualRecommendation === undefined ? undefined : payload.manualRecommendation,
          categories: payload.categories
            ? {
                create: payload.categories
                  .map((category) => category.trim())
                  .filter(Boolean)
                  .map((category) => ({ category })),
              }
            : undefined,
        },
        include: {
          categories: {
            orderBy: { category: 'asc' },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'watchlist.updated',
          targetType: 'watchlist_item',
          targetId: watchlistItem.id,
          metadata: { fieldsUpdated: Object.keys(payload) },
        },
      });

      return watchlistItem;
    });

    return this.serializeWatchlistItem(updated);
  }

  async remove(ownerUserId: string, workspaceId: string | null, itemId: string) {
    const existing = await this.prisma.watchlistItem.findFirst({
      where: { id: itemId, ownerUserId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Item watchlist tidak ditemukan.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.watchlistItem.delete({ where: { id: itemId } });
      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'watchlist.deleted',
          targetType: 'watchlist_item',
          targetId: itemId,
          metadata: {
            stockCode: existing.stockCode,
          },
        },
      });
    });

    return { id: itemId };
  }

  private serializeWatchlistItem(row: {
    id: string;
    stockCode: string;
    targetPrice: Prisma.Decimal | null;
    targetSellPrice: Prisma.Decimal | null;
    reason: string | null;
    status: string;
    priority: string;
    manualRecommendation: string | null;
    createdAt: Date;
    updatedAt: Date;
    categories?: Array<{ category: string }>;
  }) {
    return {
      id: row.id,
      stockCode: row.stockCode,
      targetPrice: toNumber(row.targetPrice),
      targetSellPrice: toNumber(row.targetSellPrice),
      reason: row.reason,
      status: row.status,
      priority: row.priority,
      manualRecommendation: row.manualRecommendation,
      categories: row.categories?.map((item) => item.category) ?? [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
