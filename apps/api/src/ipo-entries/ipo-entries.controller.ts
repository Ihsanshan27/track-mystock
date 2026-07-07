import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { ok } from '../common/api-response';
import { CreateIpoEntryDto } from './dto/create-ipo-entry.dto';
import { IpoEntriesService } from './ipo-entries.service';
import { UpdateIpoEntryDto } from './dto/update-ipo-entry.dto';

@Controller('ipo-entries')
@UseGuards(DevAuthGuard)
export class IpoEntriesController {
  constructor(private readonly ipoEntriesService: IpoEntriesService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return ok(await this.ipoEntriesService.list(user.userId, user.workspaceId));
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() payload: CreateIpoEntryDto) {
    return ok(await this.ipoEntriesService.create(user.userId, user.workspaceId, payload));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() payload: UpdateIpoEntryDto,
  ) {
    return ok(await this.ipoEntriesService.update(user.userId, user.workspaceId, id, payload));
  }

  @Delete(':id')
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ok(await this.ipoEntriesService.remove(user.userId, user.workspaceId, id));
  }

}
