import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../auth/access-control.service';
import { CreateReportShareDto } from './dto/create-report-share.dto';
import { UpdateReportShareDto } from './dto/update-report-share.dto';

@Injectable()
export class ReportSharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  async list(ownerUserId: string, workspaceId: string | null) {
    const rows = await this.prisma.reportShare.findMany({
      where: {
        ownerUserId,
        workspaceId,
      },
      include: {
        portfolio: true,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map((row) => this.serializeShare(row));
  }

  async create(ownerUserId: string, workspaceId: string | null, payload: CreateReportShareDto) {
    await this.ensurePortfolioBelongsToOwner(ownerUserId, workspaceId, payload.portfolioId);
    const expiresAt = this.parseExpiresAt(payload.expiresAt);
    const snapshot = this.toSnapshotInput(payload.snapshot);
    const createData: Prisma.ReportShareUncheckedCreateInput = {
      ownerUserId,
      workspaceId,
      portfolioId: payload.portfolioId ?? null,
      title: payload.title,
      shareType: payload.shareType,
      isPublic: payload.isPublic ?? false,
      expiresAt,
      shareKey: randomUUID(),
      snapshot,
    };

    const created = await this.prisma.reportShare.create({
      data: createData,
      include: {
        portfolio: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: ownerUserId,
        workspaceId,
        action: 'report_share.created',
        targetType: 'report_share',
        targetId: created.id,
        metadata: {
          ownerUserId,
          shareKey: created.shareKey,
          isPublic: created.isPublic,
        },
      },
    });

    return this.serializeShare(created);
  }

  async update(
    ownerUserId: string,
    workspaceId: string | null,
    reportShareId: string,
    payload: UpdateReportShareDto,
  ) {
    const existing = await this.prisma.reportShare.findFirst({
      where: {
        id: reportShareId,
        ownerUserId,
        workspaceId,
      },
      include: {
        portfolio: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Report share tidak ditemukan.');
    }

    await this.ensurePortfolioBelongsToOwner(ownerUserId, workspaceId, payload.portfolioId);
    const expiresAt =
      payload.expiresAt === undefined ? undefined : this.parseExpiresAt(payload.expiresAt ?? null);
    const updateData: Prisma.ReportShareUncheckedUpdateInput = {
      portfolioId: payload.portfolioId === undefined ? undefined : payload.portfolioId ?? null,
      title: payload.title ?? undefined,
      shareType: payload.shareType ?? undefined,
      isPublic: payload.isPublic ?? undefined,
      expiresAt,
      snapshot: payload.snapshot === undefined ? undefined : this.toSnapshotInput(payload.snapshot),
    };

    const updated = await this.prisma.reportShare.update({
      where: { id: reportShareId },
      data: updateData,
      include: {
        portfolio: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: ownerUserId,
        workspaceId,
        action: 'report_share.updated',
        targetType: 'report_share',
        targetId: updated.id,
        metadata: {
          ownerUserId,
          fieldsUpdated: Object.keys(payload),
        },
      },
    });

    return this.serializeShare(updated);
  }

  async remove(ownerUserId: string, workspaceId: string | null, reportShareId: string) {
    const existing = await this.prisma.reportShare.findFirst({
      where: {
        id: reportShareId,
        ownerUserId,
        workspaceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Report share tidak ditemukan.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.reportShare.delete({
        where: { id: reportShareId },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'report_share.deleted',
          targetType: 'report_share',
          targetId: reportShareId,
          metadata: {
            ownerUserId,
            shareKey: existing.shareKey,
          },
        },
      });
    });

    return { id: reportShareId };
  }

  async getByKey(shareKey: string, actorUserId: string | null) {
    const share = await this.prisma.reportShare.findUnique({
      where: { shareKey },
      include: {
        portfolio: true,
        owner: {
          include: { profile: true },
        },
      },
    });

    if (!share) {
      throw new NotFoundException('Report share tidak ditemukan.');
    }

    const isExpired = share.expiresAt ? share.expiresAt.getTime() <= Date.now() : false;
    if (isExpired) {
      throw new NotFoundException('Report share sudah kadaluarsa.');
    }

    if (actorUserId !== share.ownerUserId && !share.isPublic) {
      if (!actorUserId) {
        throw new NotFoundException('Report share tidak tersedia.');
      }

      await this.accessControl.assertCanReadOwnerData(share.ownerUserId, actorUserId);
    }

    return {
      ...this.serializeShare(share),
      owner: {
        id: share.owner.id,
        displayName: share.owner.profile?.displayName ?? share.owner.email,
      },
    };
  }

  private async ensurePortfolioBelongsToOwner(
    ownerUserId: string,
    workspaceId: string | null,
    portfolioId?: string,
  ) {
    if (!portfolioId) {
      return;
    }

    const portfolio = await this.prisma.portfolio.findFirst({
      where: {
        id: portfolioId,
        ownerUserId,
        workspaceId,
      },
    });

    if (!portfolio) {
      throw new BadRequestException('Portfolio untuk report share tidak ditemukan.');
    }
  }

  private parseExpiresAt(value: string | null | undefined) {
    if (value == null || value === '') {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Format expiresAt tidak valid.');
    }

    return parsed;
  }

  private toSnapshotInput(snapshot?: Record<string, unknown> | null) {
    if (snapshot === undefined) {
      return undefined;
    }

    if (snapshot === null) {
      return Prisma.JsonNull;
    }

    return snapshot as Prisma.InputJsonValue;
  }

  private serializeShare(share: {
    id: string;
    ownerUserId: string;
    workspaceId: string | null;
    portfolioId: string | null;
    shareKey: string;
    title: string;
    shareType: string;
    isPublic: boolean;
    expiresAt: Date | null;
    snapshot?: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
    portfolio?: {
      id: string;
      name: string;
    } | null;
  }) {
    return {
      id: share.id,
      ownerUserId: share.ownerUserId,
      workspaceId: share.workspaceId,
      portfolioId: share.portfolioId,
      portfolioName: share.portfolio?.name ?? null,
      shareKey: share.shareKey,
      title: share.title,
      shareType: share.shareType,
      isPublic: share.isPublic,
      expiresAt: share.expiresAt,
      snapshot: share.snapshot ?? null,
      createdAt: share.createdAt,
      updatedAt: share.updatedAt,
      shareUrlPath: `/api/v1/report-shares/key/${share.shareKey}`,
    };
  }
}
