import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../auth/auth-crypto';
import { AccessControlService } from '../auth/access-control.service';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { toNumber } from '../common/prisma.utils';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        workspaceMemberships: {
          include: {
            workspace: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return {
      id: user.id,
      email: user.email,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      profile: user.profile
        ? {
            displayName: user.profile.displayName,
            defaultRole: user.profile.defaultRole,
            avatarUrl: user.profile.avatarUrl,
            timezone: user.profile.timezone,
          }
        : null,
      workspaces: user.workspaceMemberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        role: membership.role,
      })),
    };
  }

  async listDirectory(userIds?: string[]) {
    const rows = await this.prisma.user.findMany({
      where: {
        ...(userIds?.length
          ? {
              id: {
                in: userIds,
              },
            }
          : {}),
      },
      include: {
        profile: true,
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
      ],
      take: userIds?.length ? undefined : 200,
    });

    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.profile?.displayName ?? row.email,
      role: row.profile?.defaultRole ?? 'trader',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async listUsers(actorUserId: string) {
    await this.assertAdmin(actorUserId);
    return this.listDirectory();
  }

  async getSharedJournal(actorUserId: string, ownerUserId: string) {
    await this.accessControl.assertCanReadOwnerData(ownerUserId, actorUserId);

    const [trades, watchlist, notes, cashflows, dividends, owner] = await Promise.all([
      this.prisma.trade.findMany({
        where: { ownerUserId, workspaceId: null },
        include: {
          tags: {
            orderBy: { tag: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.watchlistItem.findMany({
        where: { ownerUserId, workspaceId: null },
        include: {
          categories: {
            orderBy: { category: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.note.findMany({
        where: { ownerUserId, workspaceId: null },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.cashflow.findMany({
        where: { ownerUserId, workspaceId: null },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.dividend.findMany({
        where: { ownerUserId, workspaceId: null },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.findUnique({
        where: { id: ownerUserId },
        include: { profile: true },
      }),
    ]);

    if (!owner) {
      throw new NotFoundException('Owner jurnal tidak ditemukan.');
    }

    return {
      owner: {
        id: owner.id,
        email: owner.email,
        displayName: owner.profile?.displayName ?? owner.email,
      },
      trades: trades.map((trade) => ({
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
        tags: trade.tags.map((item) => item.tag),
      })),
      watchlist: watchlist.map((item) => ({
        id: item.id,
        stockCode: item.stockCode,
        targetPrice: toNumber(item.targetPrice),
        targetSellPrice: toNumber(item.targetSellPrice),
        reason: item.reason,
        status: item.status,
        priority: item.priority,
        manualRecommendation: item.manualRecommendation,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        categories: item.categories.map((entry) => entry.category),
      })),
      notes: notes.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      cashflows: cashflows.map((item) => ({
        id: item.id,
        portfolioId: item.portfolioId,
        type: item.type,
        amount: toNumber(item.amount),
        date: item.entryDate.toISOString().slice(0, 10),
        notes: item.notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      dividends: dividends.map((item) => ({
        id: item.id,
        portfolioId: item.portfolioId,
        stockCode: item.stockCode,
        amountPerShare: toNumber(item.amountPerShare),
        lots: item.lots,
        totalAmount: toNumber(item.totalAmount),
        dateReceived: item.dateReceived.toISOString().slice(0, 10),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      settings: {},
      marketPrices: {},
    };
  }

  async updateMyProfile(userId: string, displayName: string) {
    const updated = await this.prisma.profile.upsert({
      where: { userId },
      update: {
        displayName,
      },
      create: {
        userId,
        displayName,
        defaultRole: 'trader',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'profile.display_name_updated',
        targetType: 'profile',
        targetId: userId,
        metadata: {
          displayName,
        },
      },
    });

    return this.listDirectory([updated.userId]).then((rows) => rows[0] ?? null);
  }

  async updateUserRole(actorUserId: string, targetUserId: string, role: 'admin' | 'mentor' | 'trader' | 'viewer') {
    await this.assertAdmin(actorUserId);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User tidak ditemukan.');
    }

    await this.prisma.profile.upsert({
      where: { userId: targetUserId },
      update: {
        defaultRole: role,
      },
      create: {
        userId: targetUserId,
        displayName: targetUser.profile?.displayName ?? targetUser.email,
        defaultRole: role,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action: 'profile.role_updated',
        targetType: 'profile',
        targetId: targetUserId,
        metadata: {
          role,
        },
      },
    });

    return this.listDirectory([targetUserId]).then((rows) => rows[0] ?? null);
  }

  async createUserAsAdmin(actorUserId: string, payload: AdminCreateUserDto) {
    await this.assertAdmin(actorUserId);
    const email = payload.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new BadRequestException('Email sudah terdaftar.');
    }

    const displayName = payload.displayName?.trim() || email.split('@')[0];

    const created = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(payload.password),
        emailVerifiedAt: new Date(),
        status: 'active',
        profile: {
          create: {
            displayName,
            defaultRole: payload.role,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action: 'admin.user_created',
        targetType: 'auth_user',
        targetId: created.id,
        metadata: {
          email,
          role: payload.role,
        },
      },
    });

    return {
      id: created.id,
      email: created.email,
      displayName: created.profile?.displayName ?? created.email,
      role: created.profile?.defaultRole ?? 'trader',
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  private async assertAdmin(userId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!actor) {
      throw new NotFoundException('User tidak ditemukan.');
    }

    if (actor.profile?.defaultRole !== 'admin') {
      throw new ForbiddenException('Akses admin dibutuhkan.');
    }

    return actor;
  }
}
