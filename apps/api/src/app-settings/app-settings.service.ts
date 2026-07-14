import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const REGISTRATION_ENABLED_KEY = 'registrationEnabled';

@Injectable()
export class AppSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicRegistrationEnabled() {
    const adminIds = await this.getAdminUserIds();
    if (adminIds.length === 0) {
      return true;
    }

    const latestSetting = await this.prisma.appSetting.findFirst({
      where: {
        ownerUserId: {
          in: adminIds,
        },
        workspaceId: null,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const rawValue = latestSetting?.extra?.[REGISTRATION_ENABLED_KEY];
    return typeof rawValue === 'boolean' ? rawValue : true;
  }

  async updatePublicRegistrationEnabled(actorUserId: string, enabled: boolean) {
    await this.assertAdmin(actorUserId);

    const existing = await this.prisma.appSetting.findFirst({
      where: {
        ownerUserId: actorUserId,
        workspaceId: null,
      },
    });

    const extra = {
      ...(existing?.extra && typeof existing.extra === 'object' && !Array.isArray(existing.extra) ? existing.extra : {}),
      [REGISTRATION_ENABLED_KEY]: enabled,
    };

    if (existing) {
      await this.prisma.appSetting.update({
        where: { id: existing.id },
        data: { extra },
      });
    } else {
      await this.prisma.appSetting.create({
        data: {
          ownerUserId: actorUserId,
          workspaceId: null,
          initialCapital: 10000000,
          monthlyTarget: 5,
          defaultBuyFee: 0.15,
          defaultSellFee: 0.25,
          themePreference: 'system',
          privacyMode: false,
          defaultRiskPercent: 2,
          defaultTargetRr: 2,
          extra,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action: 'settings.registration_updated',
        targetType: 'app_settings',
        targetId: null,
        metadata: {
          enabled,
        },
      },
    });

    return enabled;
  }

  private async getAdminUserIds() {
    const rows = await this.prisma.user.findMany({
      where: {
        profile: {
          is: {
            defaultRole: 'admin',
          },
        },
      },
      select: {
        id: true,
      },
    });

    return rows.map((row) => row.id);
  }

  private async assertAdmin(userId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!actor) {
      throw new NotFoundException('User tidak ditemukan.');
    }

    if (actor.profile?.defaultRole !== 'admin') {
      throw new ForbiddenException('Akses admin dibutuhkan.');
    }
  }
}
