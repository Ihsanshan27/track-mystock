import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(
    userId: string,
    workspaceId: string | null,
    options?: { limit?: number; targetType?: string; targetId?: string },
  ) {
    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        workspaceId,
        targetType: options?.targetType ?? undefined,
        targetId: options?.targetId ?? undefined,
        OR: [
          { actorUserId: userId },
          {
            metadata: {
              path: ['ownerUserId'],
              equals: userId,
            },
          },
        ],
      },
      include: {
        actor: {
          include: { profile: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      actorUserId: log.actorUserId,
      actorName: log.actor?.profile?.displayName ?? log.actor?.email ?? null,
      workspaceId: log.workspaceId,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      metadata: log.metadata,
      createdAt: log.createdAt,
    }));
  }
}
