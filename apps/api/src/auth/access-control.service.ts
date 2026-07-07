import { ForbiddenException, Injectable } from '@nestjs/common';
import { AccessLevel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ACCESS_LEVEL_RANK: Record<AccessLevel, number> = {
  read: 1,
  review: 2,
  admin: 3,
};

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccessLevel(ownerUserId: string, actorUserId: string): Promise<AccessLevel | null> {
    if (ownerUserId === actorUserId) {
      return 'admin';
    }

    const accessRows = await this.prisma.sharedAccess.findMany({
      where: {
        ownerUserId,
        granteeUserId: actorUserId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    if (!accessRows.length) {
      return null;
    }

    return accessRows.reduce<AccessLevel>((best, item) => {
      return ACCESS_LEVEL_RANK[item.accessLevel] > ACCESS_LEVEL_RANK[best] ? item.accessLevel : best;
    }, accessRows[0].accessLevel);
  }

  async assertCanReadOwnerData(ownerUserId: string, actorUserId: string) {
    const level = await this.getAccessLevel(ownerUserId, actorUserId);

    if (!level) {
      throw new ForbiddenException('Akses read ke data owner ini tidak tersedia.');
    }

    return level;
  }

  async assertCanReviewOwnerData(ownerUserId: string, actorUserId: string) {
    const level = await this.getAccessLevel(ownerUserId, actorUserId);

    if (!level || ACCESS_LEVEL_RANK[level] < ACCESS_LEVEL_RANK.review) {
      throw new ForbiddenException('Akses review ke data owner ini tidak tersedia.');
    }

    return level;
  }

  async assertCanAdminOwnerData(ownerUserId: string, actorUserId: string) {
    const level = await this.getAccessLevel(ownerUserId, actorUserId);

    if (!level || ACCESS_LEVEL_RANK[level] < ACCESS_LEVEL_RANK.admin) {
      throw new ForbiddenException('Akses admin ke data owner ini tidak tersedia.');
    }

    return level;
  }
}
