import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toNumber } from '../common/prisma.utils';
import { CreateIpoEntryDto } from './dto/create-ipo-entry.dto';
import { UpdateIpoEntryDto } from './dto/update-ipo-entry.dto';

@Injectable()
export class IpoEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerUserId: string, workspaceId: string | null) {
    const rows = await this.prisma.ipoEntry.findMany({
      where: { ownerUserId, workspaceId },
      orderBy: [{ createdAt: 'asc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      ipoEventId: row.ipoEventId,
      ipoAccountId: row.ipoAccountId,
      no: row.rowNo,
      accountName: row.accountName,
      email: row.email,
      buyPrice: toNumber(row.buyPrice),
      lots: row.lots,
      sellPrice: toNumber(row.sellPrice),
      slTl: row.slTl === 'NONE' ? '-' : row.slTl,
      action: row.action,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async create(ownerUserId: string, workspaceId: string | null, payload: CreateIpoEntryDto) {
    await this.validateReferences(ownerUserId, workspaceId, payload.ipoEventId, payload.ipoAccountId);

    const created = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.ipoEntry.create({
        data: {
          ownerUserId,
          workspaceId,
          ipoEventId: payload.ipoEventId,
          ipoAccountId: payload.ipoAccountId ?? null,
          rowNo: payload.no ?? 1,
          accountName: payload.accountName,
          email: payload.email.trim().toLowerCase(),
          buyPrice: new Prisma.Decimal(payload.buyPrice),
          lots: payload.lots,
          sellPrice: new Prisma.Decimal(payload.sellPrice),
          slTl: payload.slTl === '-' ? 'NONE' : payload.slTl,
          action: payload.action,
          notes: payload.notes ?? null,
          createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'ipo_entry.created',
          targetType: 'ipo_entry',
          targetId: entry.id,
          metadata: { ipoEventId: entry.ipoEventId, ipoAccountId: entry.ipoAccountId },
        },
      });

      return entry;
    });

    return this.serializeEntry(created);
  }

  async update(ownerUserId: string, workspaceId: string | null, entryId: string, payload: UpdateIpoEntryDto) {
    const existing = await this.prisma.ipoEntry.findFirst({
      where: { id: entryId, ownerUserId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('IPO entry tidak ditemukan.');
    }

    await this.validateReferences(ownerUserId, workspaceId, payload.ipoEventId, payload.ipoAccountId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.ipoEntry.update({
        where: { id: entryId },
        data: {
          ipoEventId: payload.ipoEventId ?? undefined,
          ipoAccountId: payload.ipoAccountId === undefined ? undefined : payload.ipoAccountId || null,
          rowNo: payload.no ?? undefined,
          accountName: payload.accountName ?? undefined,
          email: payload.email === undefined ? undefined : payload.email.trim().toLowerCase(),
          buyPrice: payload.buyPrice == null ? undefined : new Prisma.Decimal(payload.buyPrice),
          lots: payload.lots ?? undefined,
          sellPrice: payload.sellPrice == null ? undefined : new Prisma.Decimal(payload.sellPrice),
          slTl: payload.slTl === undefined ? undefined : payload.slTl === '-' ? 'NONE' : payload.slTl,
          action: payload.action ?? undefined,
          notes: payload.notes === undefined ? undefined : payload.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'ipo_entry.updated',
          targetType: 'ipo_entry',
          targetId: entry.id,
          metadata: { fieldsUpdated: Object.keys(payload) },
        },
      });

      return entry;
    });

    return this.serializeEntry(updated);
  }

  async remove(ownerUserId: string, workspaceId: string | null, entryId: string) {
    const existing = await this.prisma.ipoEntry.findFirst({
      where: { id: entryId, ownerUserId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('IPO entry tidak ditemukan.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ipoEntry.delete({ where: { id: entryId } });
      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'ipo_entry.deleted',
          targetType: 'ipo_entry',
          targetId: entryId,
          metadata: { ipoEventId: existing.ipoEventId, ipoAccountId: existing.ipoAccountId },
        },
      });
    });

    return { id: entryId };
  }

  private serializeEntry(row: {
    id: string;
    ipoEventId: string;
    ipoAccountId: string | null;
    rowNo: number;
    accountName: string;
    email: string;
    buyPrice: Prisma.Decimal;
    lots: number;
    sellPrice: Prisma.Decimal;
    slTl: string;
    action: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      ipoEventId: row.ipoEventId,
      ipoAccountId: row.ipoAccountId,
      no: row.rowNo,
      accountName: row.accountName,
      email: row.email,
      buyPrice: toNumber(row.buyPrice),
      lots: row.lots,
      sellPrice: toNumber(row.sellPrice),
      slTl: row.slTl === 'NONE' ? '-' : row.slTl,
      action: row.action,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async validateReferences(
    ownerUserId: string,
    workspaceId: string | null,
    ipoEventId?: string,
    ipoAccountId?: string | null,
  ) {
    if (ipoEventId) {
      const event = await this.prisma.ipoEvent.findFirst({
        where: { id: ipoEventId, ownerUserId, workspaceId },
        select: { id: true },
      });
      if (!event) {
        throw new BadRequestException('IPO event tidak ditemukan.');
      }
    }

    if (ipoAccountId) {
      const account = await this.prisma.ipoAccount.findFirst({
        where: { id: ipoAccountId, ownerUserId, workspaceId },
        select: { id: true },
      });
      if (!account) {
        throw new BadRequestException('IPO account tidak ditemukan.');
      }
    }
  }
}
