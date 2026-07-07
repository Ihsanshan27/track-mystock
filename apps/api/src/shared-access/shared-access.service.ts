import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SharedAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async listOwned(ownerUserId: string) {
    const rows = await this.prisma.sharedAccess.findMany({
      where: { ownerUserId },
      include: {
        grantee: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map((row) => this.serializeSharedAccess(row));
  }

  async listReceived(granteeUserId: string) {
    const rows = await this.prisma.sharedAccess.findMany({
      where: {
        granteeUserId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        owner: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      ownerUserId: row.ownerUserId,
      ownerName: row.owner.profile?.displayName ?? row.owner.email,
      ownerEmail: row.owner.email,
      accessLevel: row.accessLevel,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    }));
  }

  async create(ownerUserId: string, payload: { granteeUserId: string; accessLevel: 'read' | 'review' | 'admin'; expiresAt?: string }) {
    if (ownerUserId === payload.granteeUserId) {
      throw new BadRequestException('Owner tidak perlu memberikan akses ke dirinya sendiri.');
    }

    const grantee = await this.prisma.user.findUnique({
      where: { id: payload.granteeUserId },
      include: { profile: true },
    });

    if (!grantee) {
      throw new BadRequestException('User penerima akses tidak ditemukan.');
    }

    const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Format expiresAt tidak valid.');
    }

    const existing = await this.prisma.sharedAccess.findFirst({
      where: {
        ownerUserId,
        granteeUserId: payload.granteeUserId,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    const access = existing
      ? await this.prisma.sharedAccess.update({
          where: { id: existing.id },
          data: {
            accessLevel: payload.accessLevel,
            expiresAt,
          },
          include: {
            grantee: {
              include: { profile: true },
            },
          },
        })
      : await this.prisma.sharedAccess.create({
          data: {
            ownerUserId,
            granteeUserId: payload.granteeUserId,
            accessLevel: payload.accessLevel,
            expiresAt,
          },
          include: {
            grantee: {
              include: { profile: true },
            },
          },
        });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: ownerUserId,
        action: existing ? 'shared_access.updated' : 'shared_access.created',
        targetType: 'shared_access',
        targetId: access.id,
        metadata: {
          ownerUserId,
          granteeUserId: payload.granteeUserId,
          accessLevel: payload.accessLevel,
        },
      },
    });

    return this.serializeSharedAccess(access);
  }

  async update(
    ownerUserId: string,
    sharedAccessId: string,
    payload: { accessLevel?: 'read' | 'review' | 'admin'; expiresAt?: string | null },
  ) {
    const existing = await this.prisma.sharedAccess.findFirst({
      where: {
        id: sharedAccessId,
        ownerUserId,
      },
      include: {
        grantee: {
          include: { profile: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Shared access tidak ditemukan.');
    }

    const expiresAt =
      payload.expiresAt === undefined
        ? undefined
        : payload.expiresAt === null
          ? null
          : new Date(payload.expiresAt);

    if (expiresAt instanceof Date && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Format expiresAt tidak valid.');
    }

    const updated = await this.prisma.sharedAccess.update({
      where: { id: sharedAccessId },
      data: {
        accessLevel: payload.accessLevel ?? undefined,
        expiresAt,
      },
      include: {
        grantee: {
          include: { profile: true },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: ownerUserId,
        action: 'shared_access.updated',
        targetType: 'shared_access',
        targetId: updated.id,
        metadata: {
          ownerUserId,
          granteeUserId: updated.granteeUserId,
          fieldsUpdated: Object.keys(payload),
        },
      },
    });

    return this.serializeSharedAccess(updated);
  }

  async remove(ownerUserId: string, sharedAccessId: string) {
    const existing = await this.prisma.sharedAccess.findFirst({
      where: {
        id: sharedAccessId,
        ownerUserId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Shared access tidak ditemukan.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sharedAccess.delete({
        where: { id: sharedAccessId },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          action: 'shared_access.deleted',
          targetType: 'shared_access',
          targetId: sharedAccessId,
          metadata: {
            ownerUserId,
            granteeUserId: existing.granteeUserId,
          },
        },
      });
    });

    return { id: sharedAccessId };
  }

  private serializeSharedAccess(row: {
    id: string;
    ownerUserId: string;
    granteeUserId: string;
    accessLevel: string;
    expiresAt: Date | null;
    createdAt: Date;
    grantee?: {
      email: string;
      profile: {
        displayName: string;
      } | null;
    };
  }) {
    return {
      id: row.id,
      ownerUserId: row.ownerUserId,
      granteeUserId: row.granteeUserId,
      granteeName: row.grantee?.profile?.displayName ?? row.grantee?.email ?? null,
      granteeEmail: row.grantee?.email ?? null,
      accessLevel: row.accessLevel,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    };
  }
}
