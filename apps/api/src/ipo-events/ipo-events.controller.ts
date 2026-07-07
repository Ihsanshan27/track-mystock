import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { ok } from '../common/api-response';
import { CreateIpoEventDto } from './dto/create-ipo-event.dto';
import { IpoEventsService } from './ipo-events.service';
import { UpdateIpoEventDto } from './dto/update-ipo-event.dto';

@Controller('ipo-events')
@UseGuards(DevAuthGuard)
export class IpoEventsController {
  constructor(private readonly ipoEventsService: IpoEventsService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return ok(await this.ipoEventsService.list(user.userId, user.workspaceId));
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() payload: CreateIpoEventDto) {
    return ok(await this.ipoEventsService.create(user.userId, user.workspaceId, payload));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() payload: UpdateIpoEventDto,
  ) {
    return ok(await this.ipoEventsService.update(user.userId, user.workspaceId, id, payload));
  }

  @Delete(':id')
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ok(await this.ipoEventsService.remove(user.userId, user.workspaceId, id));
  }

}
