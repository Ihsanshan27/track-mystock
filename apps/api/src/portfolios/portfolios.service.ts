import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { ReorderPortfoliosDto } from './dto/reorder-portfolios.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';

@Injectable()
export class PortfoliosService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerUserId: string, workspaceId: string | null) {
    const portfolios = await this.prisma.portfolio.findMany({
      where: {
        ownerUserId,
        workspaceId,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    if (portfolios.length === 0) {
      const defaultPortfolio = await this.create(ownerUserId, workspaceId, {
        name: 'Portofolio Utama',
        isDefault: true,
        displayOrder: 0,
      });
      return [defaultPortfolio];
    }

    return portfolios.map((portfolio) => ({
      id: portfolio.id,
      name: portfolio.name,
      description: portfolio.description,
      isDefault: portfolio.isDefault,
      displayOrder: portfolio.displayOrder,
      financeAccountId: portfolio.financeAccountId,
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt,
    }));
  }

  async create(ownerUserId: string, workspaceId: string | null, payload: CreatePortfolioDto) {
    const portfolioCount = await this.prisma.portfolio.count({
      where: { ownerUserId, workspaceId },
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const portfolio = await tx.portfolio.create({
        data: {
          ownerUserId,
          workspaceId,
          name: payload.name.trim(),
          description: payload.description?.trim() || null,
          isDefault: payload.isDefault ?? false,
          displayOrder: payload.displayOrder ?? portfolioCount,
          financeAccountId: payload.financeAccountId || null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'portfolio.created',
          targetType: 'portfolio',
          targetId: portfolio.id,
          metadata: {
            name: portfolio.name,
          },
        },
      });

      return portfolio;
    });

    return {
      id: created.id,
      name: created.name,
      description: created.description,
      isDefault: created.isDefault,
      displayOrder: created.displayOrder,
      financeAccountId: created.financeAccountId,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async update(ownerUserId: string, workspaceId: string | null, portfolioId: string, payload: UpdatePortfolioDto) {
    const existing = await this.prisma.portfolio.findFirst({
      where: {
        id: portfolioId,
        ownerUserId,
        workspaceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Portofolio tidak ditemukan.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const portfolio = await tx.portfolio.update({
        where: { id: portfolioId },
        data: {
          name: payload.name?.trim(),
          description: payload.description === undefined ? undefined : payload.description?.trim() || null,
          isDefault: payload.isDefault,
          displayOrder: payload.displayOrder,
          financeAccountId: payload.financeAccountId === undefined ? undefined : payload.financeAccountId || null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'portfolio.updated',
          targetType: 'portfolio',
          targetId: portfolio.id,
          metadata: {
            fieldsUpdated: Object.keys(payload),
          },
        },
      });

      return portfolio;
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      isDefault: updated.isDefault,
      displayOrder: updated.displayOrder,
      financeAccountId: updated.financeAccountId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async remove(ownerUserId: string, workspaceId: string | null, portfolioId: string) {
    const existing = await this.prisma.portfolio.findFirst({
      where: {
        id: portfolioId,
        ownerUserId,
        workspaceId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Portofolio tidak ditemukan.');
    }
    if (existing.isDefault || existing.id === 'default') {
      throw new BadRequestException('Portofolio utama tidak bisa dihapus.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.portfolio.delete({
        where: { id: portfolioId },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'portfolio.deleted',
          targetType: 'portfolio',
          targetId: portfolioId,
          metadata: {
            name: existing.name,
          },
        },
      });
    });

    return { id: portfolioId };
  }

  async reorder(ownerUserId: string, workspaceId: string | null, payload: ReorderPortfoliosDto) {
    const portfolios = await this.prisma.portfolio.findMany({
      where: {
        ownerUserId,
        workspaceId,
      },
      select: { id: true },
    });

    const existingIds = new Set(portfolios.map((item) => item.id));
    const requestedIds = payload.orderedIds.filter((id) => existingIds.has(id));

    await this.prisma.$transaction(async (tx) => {
      for (const [index, id] of requestedIds.entries()) {
        await tx.portfolio.update({
          where: { id },
          data: { displayOrder: index },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'portfolio.reordered',
          targetType: 'portfolio_collection',
          metadata: {
            orderedIds: requestedIds,
          },
        },
      });
    });

    return this.list(ownerUserId, workspaceId);
  }

}
