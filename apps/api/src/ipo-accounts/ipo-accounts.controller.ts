import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { ok } from '../common/api-response';
import { CreateIpoAccountDto } from './dto/create-ipo-account.dto';
import { IpoAccountsService } from './ipo-accounts.service';
import { UpdateIpoAccountDto } from './dto/update-ipo-account.dto';

@Controller('ipo-accounts')
@UseGuards(DevAuthGuard)
export class IpoAccountsController {
  constructor(private readonly ipoAccountsService: IpoAccountsService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return ok(await this.ipoAccountsService.list(user.userId, user.workspaceId));
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() payload: CreateIpoAccountDto) {
    return ok(await this.ipoAccountsService.create(user.userId, user.workspaceId, payload));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() payload: UpdateIpoAccountDto,
  ) {
    return ok(await this.ipoAccountsService.update(user.userId, user.workspaceId, id, payload));
  }

  @Delete(':id')
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ok(await this.ipoAccountsService.remove(user.userId, user.workspaceId, id));
  }

}
