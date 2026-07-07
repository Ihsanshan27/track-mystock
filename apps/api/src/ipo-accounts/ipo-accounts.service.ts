import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIpoAccountDto } from './dto/create-ipo-account.dto';
import { UpdateIpoAccountDto } from './dto/update-ipo-account.dto';

@Injectable()
export class IpoAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerUserId: string, workspaceId: string | null) {
    const rows = await this.prisma.ipoAccount.findMany({
      where: { ownerUserId, workspaceId },
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      normalizedKey: row.normalizedKey,
      lastUsedAt: row.lastUsedAt.toISOString(),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async create(ownerUserId: string, workspaceId: string | null, payload: CreateIpoAccountDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const account = await tx.ipoAccount.create({
        data: {
          ownerUserId,
          workspaceId,
          name: payload.name,
          email: payload.email.trim().toLowerCase(),
          normalizedKey: payload.normalizedKey || payload.name.trim().toLowerCase(),
          lastUsedAt: payload.lastUsedAt ? new Date(payload.lastUsedAt) : new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'ipo_account.created',
          targetType: 'ipo_account',
          targetId: account.id,
          metadata: { normalizedKey: account.normalizedKey },
        },
      });

      return account;
    });

    return this.serializeAccount(created);
  }

  async update(ownerUserId: string, workspaceId: string | null, accountId: string, payload: UpdateIpoAccountDto) {
    const existing = await this.prisma.ipoAccount.findFirst({
      where: { id: accountId, ownerUserId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('IPO account tidak ditemukan.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const account = await tx.ipoAccount.update({
        where: { id: accountId },
        data: {
          name: payload.name ?? undefined,
          email: payload.email === undefined ? undefined : payload.email.trim().toLowerCase(),
          normalizedKey: payload.normalizedKey ?? undefined,
          lastUsedAt: payload.lastUsedAt ? new Date(payload.lastUsedAt) : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'ipo_account.updated',
          targetType: 'ipo_account',
          targetId: account.id,
          metadata: { fieldsUpdated: Object.keys(payload) },
        },
      });

      return account;
    });

    return this.serializeAccount(updated);
  }

  async remove(ownerUserId: string, workspaceId: string | null, accountId: string) {
    const existing = await this.prisma.ipoAccount.findFirst({
      where: { id: accountId, ownerUserId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('IPO account tidak ditemukan.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ipoAccount.delete({ where: { id: accountId } });
      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'ipo_account.deleted',
          targetType: 'ipo_account',
          targetId: accountId,
          metadata: { normalizedKey: existing.normalizedKey },
        },
      });
    });

    return { id: accountId };
  }

  private serializeAccount(row: {
    id: string;
    name: string;
    email: string;
    normalizedKey: string;
    lastUsedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      normalizedKey: row.normalizedKey,
      lastUsedAt: row.lastUsedAt.toISOString(),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
