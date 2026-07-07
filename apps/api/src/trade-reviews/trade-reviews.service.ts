import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../auth/access-control.service';
import { CreateTradeReviewDto } from './dto/create-trade-review.dto';
import { UpdateTradeReviewDto } from './dto/update-trade-review.dto';

@Injectable()
export class TradeReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
  ) {}

  async list(actorUserId: string, tradeId: string) {
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
    });

    if (!trade) {
      throw new NotFoundException('Trade tidak ditemukan.');
    }

    await this.accessControl.assertCanReadOwnerData(trade.ownerUserId, actorUserId);

    const rows = await this.prisma.tradeReview.findMany({
      where: { tradeId },
      include: {
        mentor: {
          include: { profile: true },
        },
        tags: {
          orderBy: { tag: 'asc' },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map((row) => this.serializeReview(row));
  }

  async create(actorUserId: string, payload: CreateTradeReviewDto) {
    const trade = await this.prisma.trade.findUnique({
      where: { id: payload.tradeId },
    });

    if (!trade) {
      throw new NotFoundException('Trade tidak ditemukan.');
    }

    await this.accessControl.assertCanReviewOwnerData(trade.ownerUserId, actorUserId);

    const mentorUserId = payload.mentorUserId ?? actorUserId;

    if (mentorUserId !== actorUserId && actorUserId !== trade.ownerUserId) {
      throw new ForbiddenException('Mentor review hanya bisa dibuat atas nama user aktif.');
    }

    const mentor = await this.prisma.user.findUnique({
      where: { id: mentorUserId },
    });

    if (!mentor) {
      throw new BadRequestException('Mentor user tidak ditemukan.');
    }

    const created = await this.prisma.tradeReview.create({
      data: {
        tradeId: payload.tradeId,
        ownerUserId: trade.ownerUserId,
        mentorUserId,
        comment: payload.comment ?? null,
        disciplineScore: payload.disciplineScore ?? null,
        psychologyScore: payload.psychologyScore ?? null,
        riskScore: payload.riskScore ?? null,
        tags: payload.tags?.length
          ? {
              create: payload.tags
                .map((tag) => tag.trim())
                .filter(Boolean)
                .map((tag) => ({ tag })),
            }
          : undefined,
      },
      include: {
        mentor: {
          include: { profile: true },
        },
        tags: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        workspaceId: trade.workspaceId,
        action: 'trade_review.created',
        targetType: 'trade_review',
        targetId: created.id,
        metadata: {
          ownerUserId: trade.ownerUserId,
          tradeId: trade.id,
          mentorUserId,
        },
      },
    });

    return this.serializeReview(created);
  }

  async update(actorUserId: string, reviewId: string, payload: UpdateTradeReviewDto) {
    const existing = await this.prisma.tradeReview.findUnique({
      where: { id: reviewId },
      include: {
        trade: true,
        mentor: {
          include: { profile: true },
        },
        tags: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Trade review tidak ditemukan.');
    }

    await this.ensureCanManageReview(actorUserId, existing.ownerUserId, existing.mentorUserId);

    if (payload.tradeId && payload.tradeId !== existing.tradeId) {
      throw new BadRequestException('tradeId review tidak bisa diubah.');
    }

    if (payload.mentorUserId && payload.mentorUserId !== existing.mentorUserId) {
      throw new BadRequestException('mentorUserId review tidak bisa diubah.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (payload.tags) {
        await tx.tradeReviewTag.deleteMany({
          where: { tradeReviewId: reviewId },
        });
      }

      return tx.tradeReview.update({
        where: { id: reviewId },
        data: {
          comment: payload.comment === undefined ? undefined : payload.comment,
          disciplineScore:
            payload.disciplineScore === undefined ? undefined : payload.disciplineScore,
          psychologyScore:
            payload.psychologyScore === undefined ? undefined : payload.psychologyScore,
          riskScore: payload.riskScore === undefined ? undefined : payload.riskScore,
          tags: payload.tags
            ? {
                create: payload.tags
                  .map((tag) => tag.trim())
                  .filter(Boolean)
                  .map((tag) => ({ tag })),
              }
            : undefined,
        },
        include: {
          mentor: {
            include: { profile: true },
          },
          tags: {
            orderBy: { tag: 'asc' },
          },
        },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        workspaceId: existing.trade.workspaceId,
        action: 'trade_review.updated',
        targetType: 'trade_review',
        targetId: reviewId,
        metadata: {
          ownerUserId: existing.ownerUserId,
          tradeId: existing.tradeId,
          fieldsUpdated: Object.keys(payload),
        },
      },
    });

    return this.serializeReview(updated);
  }

  async remove(actorUserId: string, reviewId: string) {
    const existing = await this.prisma.tradeReview.findUnique({
      where: { id: reviewId },
      include: {
        trade: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Trade review tidak ditemukan.');
    }

    await this.ensureCanManageReview(actorUserId, existing.ownerUserId, existing.mentorUserId);

    await this.prisma.$transaction(async (tx) => {
      await tx.tradeReview.delete({
        where: { id: reviewId },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          workspaceId: existing.trade.workspaceId,
          action: 'trade_review.deleted',
          targetType: 'trade_review',
          targetId: reviewId,
          metadata: {
            ownerUserId: existing.ownerUserId,
            tradeId: existing.tradeId,
          },
        },
      });
    });

    return { id: reviewId };
  }

  private async ensureCanManageReview(actorUserId: string, ownerUserId: string, mentorUserId: string) {
    await this.accessControl.assertCanReadOwnerData(ownerUserId, actorUserId);

    if (actorUserId !== ownerUserId && actorUserId !== mentorUserId) {
      throw new ForbiddenException('Review ini hanya bisa diubah oleh owner atau mentor pembuatnya.');
    }
  }

  private serializeReview(review: {
    id: string;
    tradeId: string;
    ownerUserId: string;
    mentorUserId: string;
    comment: string | null;
    disciplineScore: number | null;
    psychologyScore: number | null;
    riskScore: number | null;
    createdAt: Date;
    updatedAt: Date;
    mentor?: {
      email: string;
      profile: {
        displayName: string;
      } | null;
    };
    tags?: Array<{ tag: string }>;
  }) {
    return {
      id: review.id,
      tradeId: review.tradeId,
      ownerUserId: review.ownerUserId,
      mentorUserId: review.mentorUserId,
      mentorName: review.mentor?.profile?.displayName ?? review.mentor?.email ?? null,
      comment: review.comment,
      disciplineScore: review.disciplineScore,
      psychologyScore: review.psychologyScore,
      riskScore: review.riskScore,
      tags: review.tags?.map((item) => item.tag) ?? [],
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
