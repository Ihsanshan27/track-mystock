import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { ok } from '../common/api-response';
import { CreateNoteDto } from './dto/create-note.dto';
import { NotesService } from './notes.service';
import { UpdateNoteDto } from './dto/update-note.dto';

@Controller('notes')
@UseGuards(DevAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return ok(await this.notesService.list(user.userId, user.workspaceId));
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() payload: CreateNoteDto) {
    return ok(await this.notesService.create(user.userId, user.workspaceId, payload));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() payload: UpdateNoteDto,
  ) {
    return ok(await this.notesService.update(user.userId, user.workspaceId, id, payload));
  }

  @Delete(':id')
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ok(await this.notesService.remove(user.userId, user.workspaceId, id));
  }

}
