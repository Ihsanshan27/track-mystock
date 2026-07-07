import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toNumber } from '../common/prisma.utils';
import { CreateIpoEventDto } from './dto/create-ipo-event.dto';
import { UpdateIpoEventDto } from './dto/update-ipo-event.dto';

@Injectable()
export class IpoEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerUserId: string, workspaceId: string | null) {
    const rows = await this.prisma.ipoEvent.findMany({
      where: { ownerUserId, workspaceId },
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      stockCode: row.stockCode,
      underwriter: row.underwriter,
      offeringDate: row.offeringDate?.toISOString().slice(0, 10),
      ipoDate: row.ipoDate.toISOString().slice(0, 10),
      offeringPrice: toNumber(row.offeringPrice),
      notes: row.notes,
      sector: row.sector,
      registrar: row.registrar,
      targetBoard: row.targetBoard,
      bookbuildingStartDate: row.bookbuildingStartDate?.toISOString().slice(0, 10),
      bookbuildingEndDate: row.bookbuildingEndDate?.toISOString().slice(0, 10),
      lotPoolingAmount: toNumber(row.lotPoolingAmount),
      allotmentDate: row.allotmentDate?.toISOString().slice(0, 10),
      refundDate: row.refundDate?.toISOString().slice(0, 10),
      distributionDate: row.distributionDate?.toISOString().slice(0, 10),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async create(ownerUserId: string, workspaceId: string | null, payload: CreateIpoEventDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const event = await tx.ipoEvent.create({
        data: {
          ownerUserId,
          workspaceId,
          stockCode: payload.stockCode.toUpperCase(),
          underwriter: payload.underwriter ?? null,
          offeringDate: payload.offeringDate ? new Date(payload.offeringDate) : null,
          ipoDate: new Date(payload.ipoDate),
          offeringPrice: new Prisma.Decimal(payload.offeringPrice),
          notes: payload.notes ?? null,
          sector: payload.sector ?? null,
          registrar: payload.registrar ?? null,
          targetBoard: payload.targetBoard ?? null,
          bookbuildingStartDate: payload.bookbuildingStartDate ? new Date(payload.bookbuildingStartDate) : null,
          bookbuildingEndDate: payload.bookbuildingEndDate ? new Date(payload.bookbuildingEndDate) : null,
          lotPoolingAmount: payload.lotPoolingAmount == null ? null : new Prisma.Decimal(payload.lotPoolingAmount),
          allotmentDate: payload.allotmentDate ? new Date(payload.allotmentDate) : null,
          refundDate: payload.refundDate ? new Date(payload.refundDate) : null,
          distributionDate: payload.distributionDate ? new Date(payload.distributionDate) : null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'ipo_event.created',
          targetType: 'ipo_event',
          targetId: event.id,
          metadata: { stockCode: event.stockCode },
        },
      });

      return event;
    });

    return this.serializeEvent(created);
  }

  async update(ownerUserId: string, workspaceId: string | null, eventId: string, payload: UpdateIpoEventDto) {
    const existing = await this.prisma.ipoEvent.findFirst({
      where: { id: eventId, ownerUserId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('IPO event tidak ditemukan.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const event = await tx.ipoEvent.update({
        where: { id: eventId },
        data: {
          stockCode: payload.stockCode ? payload.stockCode.toUpperCase() : undefined,
          underwriter: payload.underwriter === undefined ? undefined : payload.underwriter || null,
          offeringDate: payload.offeringDate === undefined ? undefined : payload.offeringDate ? new Date(payload.offeringDate) : null,
          ipoDate: payload.ipoDate ? new Date(payload.ipoDate) : undefined,
          offeringPrice: payload.offeringPrice == null ? undefined : new Prisma.Decimal(payload.offeringPrice),
          notes: payload.notes === undefined ? undefined : payload.notes,
          sector: payload.sector === undefined ? undefined : payload.sector,
          registrar: payload.registrar === undefined ? undefined : payload.registrar,
          targetBoard: payload.targetBoard === undefined ? undefined : payload.targetBoard,
          bookbuildingStartDate:
            payload.bookbuildingStartDate === undefined ? undefined : payload.bookbuildingStartDate ? new Date(payload.bookbuildingStartDate) : null,
          bookbuildingEndDate:
            payload.bookbuildingEndDate === undefined ? undefined : payload.bookbuildingEndDate ? new Date(payload.bookbuildingEndDate) : null,
          lotPoolingAmount:
            payload.lotPoolingAmount === undefined ? undefined : payload.lotPoolingAmount == null ? null : new Prisma.Decimal(payload.lotPoolingAmount),
          allotmentDate: payload.allotmentDate === undefined ? undefined : payload.allotmentDate ? new Date(payload.allotmentDate) : null,
          refundDate: payload.refundDate === undefined ? undefined : payload.refundDate ? new Date(payload.refundDate) : null,
          distributionDate:
            payload.distributionDate === undefined ? undefined : payload.distributionDate ? new Date(payload.distributionDate) : null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'ipo_event.updated',
          targetType: 'ipo_event',
          targetId: event.id,
          metadata: { fieldsUpdated: Object.keys(payload) },
        },
      });

      return event;
    });

    return this.serializeEvent(updated);
  }

  async remove(ownerUserId: string, workspaceId: string | null, eventId: string) {
    const existing = await this.prisma.ipoEvent.findFirst({
      where: { id: eventId, ownerUserId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('IPO event tidak ditemukan.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ipoEvent.delete({ where: { id: eventId } });
      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'ipo_event.deleted',
          targetType: 'ipo_event',
          targetId: eventId,
          metadata: { stockCode: existing.stockCode },
        },
      });
    });

    return { id: eventId };
  }

  private serializeEvent(row: {
    id: string;
    stockCode: string;
    underwriter: string | null;
    offeringDate: Date | null;
    ipoDate: Date;
    offeringPrice: Prisma.Decimal;
    notes: string | null;
    sector: string | null;
    registrar: string | null;
    targetBoard: string | null;
    bookbuildingStartDate: Date | null;
    bookbuildingEndDate: Date | null;
    lotPoolingAmount: Prisma.Decimal | null;
    allotmentDate: Date | null;
    refundDate: Date | null;
    distributionDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      stockCode: row.stockCode,
      underwriter: row.underwriter,
      offeringDate: row.offeringDate?.toISOString().slice(0, 10),
      ipoDate: row.ipoDate.toISOString().slice(0, 10),
      offeringPrice: toNumber(row.offeringPrice),
      notes: row.notes,
      sector: row.sector,
      registrar: row.registrar,
      targetBoard: row.targetBoard,
      bookbuildingStartDate: row.bookbuildingStartDate?.toISOString().slice(0, 10),
      bookbuildingEndDate: row.bookbuildingEndDate?.toISOString().slice(0, 10),
      lotPoolingAmount: toNumber(row.lotPoolingAmount),
      allotmentDate: row.allotmentDate?.toISOString().slice(0, 10),
      refundDate: row.refundDate?.toISOString().slice(0, 10),
      distributionDate: row.distributionDate?.toISOString().slice(0, 10),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
