import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { ok } from '../common/api-response';
import { CreateDividendDto } from './dto/create-dividend.dto';
import { DividendsService } from './dividends.service';
import { UpdateDividendDto } from './dto/update-dividend.dto';

@Controller('dividends')
@UseGuards(DevAuthGuard)
export class DividendsController {
  constructor(private readonly dividendsService: DividendsService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return ok(await this.dividendsService.list(user.userId, user.workspaceId));
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() payload: CreateDividendDto) {
    return ok(await this.dividendsService.create(user.userId, user.workspaceId, payload));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() payload: UpdateDividendDto,
  ) {
    return ok(await this.dividendsService.update(user.userId, user.workspaceId, id, payload));
  }

  @Delete(':id')
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ok(await this.dividendsService.remove(user.userId, user.workspaceId, id));
  }

}
