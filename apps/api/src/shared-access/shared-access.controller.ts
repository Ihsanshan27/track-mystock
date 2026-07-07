import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { ok } from '../common/api-response';
import { CreateSharedAccessDto } from './dto/create-shared-access.dto';
import { UpdateSharedAccessDto } from './dto/update-shared-access.dto';
import { SharedAccessService } from './shared-access.service';

@Controller('shared-access')
@UseGuards(DevAuthGuard)
export class SharedAccessController {
  constructor(private readonly sharedAccessService: SharedAccessService) {}

  @Get()
  async listOwned(@CurrentUser() user: RequestUser) {
    return ok(await this.sharedAccessService.listOwned(user.userId));
  }

  @Get('received')
  async listReceived(@CurrentUser() user: RequestUser) {
    return ok(await this.sharedAccessService.listReceived(user.userId));
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() payload: CreateSharedAccessDto) {
    return ok(await this.sharedAccessService.create(user.userId, payload));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') sharedAccessId: string,
    @Body() payload: UpdateSharedAccessDto,
  ) {
    return ok(await this.sharedAccessService.update(user.userId, sharedAccessId, payload));
  }

  @Delete(':id')
  async remove(@CurrentUser() user: RequestUser, @Param('id') sharedAccessId: string) {
    return ok(await this.sharedAccessService.remove(user.userId, sharedAccessId));
  }
}
