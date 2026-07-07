import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerUserId: string, workspaceId: string | null) {
    const rows = await this.prisma.note.findMany({
      where: { ownerUserId, workspaceId },
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async create(ownerUserId: string, workspaceId: string | null, payload: CreateNoteDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const note = await tx.note.create({
        data: {
          ownerUserId,
          workspaceId,
          title: payload.title,
          content: payload.content,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'note.created',
          targetType: 'note',
          targetId: note.id,
          metadata: { title: note.title },
        },
      });

      return note;
    });

    return this.serializeNote(created);
  }

  async update(ownerUserId: string, workspaceId: string | null, noteId: string, payload: UpdateNoteDto) {
    const existing = await this.prisma.note.findFirst({
      where: { id: noteId, ownerUserId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Catatan tidak ditemukan.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const note = await tx.note.update({
        where: { id: noteId },
        data: {
          title: payload.title ?? undefined,
          content: payload.content ?? undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'note.updated',
          targetType: 'note',
          targetId: note.id,
          metadata: { fieldsUpdated: Object.keys(payload) },
        },
      });

      return note;
    });

    return this.serializeNote(updated);
  }

  async remove(ownerUserId: string, workspaceId: string | null, noteId: string) {
    const existing = await this.prisma.note.findFirst({
      where: { id: noteId, ownerUserId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Catatan tidak ditemukan.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.note.delete({ where: { id: noteId } });
      await tx.auditLog.create({
        data: {
          actorUserId: ownerUserId,
          workspaceId,
          action: 'note.deleted',
          targetType: 'note',
          targetId: noteId,
          metadata: { title: existing.title },
        },
      });
    });

    return { id: noteId };
  }

  private serializeNote(row: {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
