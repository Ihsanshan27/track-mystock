import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpsertWorkspaceMemberDto } from './dto/upsert-workspace-member.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(actorUserId: string) {
    const workspaces = await this.prisma.workspace.findMany({
      where: {
        OR: [
          { ownerUserId: actorUserId },
          {
            members: {
              some: {
                userId: actorUserId,
              },
            },
          },
        ],
      },
      include: {
        members: {
          where: {
            userId: actorUserId,
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      ownerUserId: workspace.ownerUserId,
      role: workspace.ownerUserId === actorUserId ? 'admin' : workspace.members[0]?.role ?? 'viewer',
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    }));
  }

  async create(actorUserId: string, payload: CreateWorkspaceDto) {
    await this.assertGlobalAdmin(actorUserId);

    const workspace = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workspace.create({
        data: {
          name: payload.name.trim(),
          ownerUserId: actorUserId,
        },
      });

      await tx.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: created.id,
            userId: actorUserId,
          },
        },
        update: {
          role: 'admin',
        },
        create: {
          workspaceId: created.id,
          userId: actorUserId,
          role: 'admin',
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          workspaceId: created.id,
          action: 'workspace.created',
          targetType: 'workspace',
          targetId: created.id,
          metadata: {
            name: created.name,
          },
        },
      });

      return created;
    });

    return {
      id: workspace.id,
      name: workspace.name,
      ownerUserId: workspace.ownerUserId,
      role: 'admin',
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }

  async listMembers(actorUserId: string, workspaceId: string) {
    await this.assertCanManageWorkspace(actorUserId, workspaceId);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace tidak ditemukan.');
    }

    return workspace.members.map((member) => ({
      id: member.id,
      workspace_id: member.workspaceId,
      user_id: member.userId,
      role: member.role,
      created_at: member.createdAt,
    }));
  }

  async upsertMember(actorUserId: string, workspaceId: string, payload: UpsertWorkspaceMemberDto) {
    await this.assertCanManageWorkspace(actorUserId, workspaceId);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User target tidak ditemukan.');
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const upserted = await tx.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: payload.userId,
          },
        },
        update: {
          role: payload.role,
        },
        create: {
          workspaceId,
          userId: payload.userId,
          role: payload.role,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          workspaceId,
          action: 'workspace.member_upserted',
          targetType: 'workspace',
          targetId: workspaceId,
          metadata: {
            userId: payload.userId,
            role: payload.role,
          },
        },
      });

      return upserted;
    });

    return {
      id: member.id,
      workspace_id: member.workspaceId,
      user_id: member.userId,
      role: member.role,
      created_at: member.createdAt,
    };
  }

  async removeMember(actorUserId: string, memberId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: {
        workspace: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Member workspace tidak ditemukan.');
    }

    await this.assertCanManageWorkspace(actorUserId, member.workspaceId);

    if (member.workspace.ownerUserId === member.userId) {
      throw new BadRequestException('Owner workspace tidak bisa dihapus dari membership workspace.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.delete({
        where: { id: memberId },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          workspaceId: member.workspaceId,
          action: 'workspace.member_removed',
          targetType: 'workspace',
          targetId: member.workspaceId,
          metadata: {
            userId: member.userId,
            role: member.role,
          },
        },
      });
    });

    return { id: memberId };
  }

  private async assertGlobalAdmin(actorUserId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
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

  private async assertCanManageWorkspace(actorUserId: string, workspaceId: string) {
    await this.assertGlobalAdmin(actorUserId);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace tidak ditemukan.');
    }

    return workspace;
  }
}
