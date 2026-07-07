import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { ok } from '../common/api-response';
import { CreateFinanceAccountDto } from './dto/create-finance-account.dto';
import { FinanceAccountsService } from './finance-accounts.service';
import { UpdateFinanceAccountDto } from './dto/update-finance-account.dto';

@Controller('finance-accounts')
@UseGuards(DevAuthGuard)
export class FinanceAccountsController {
  constructor(private readonly financeAccountsService: FinanceAccountsService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return ok(await this.financeAccountsService.list(user.userId, user.workspaceId));
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() payload: CreateFinanceAccountDto) {
    return ok(await this.financeAccountsService.create(user.userId, user.workspaceId, payload));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() payload: UpdateFinanceAccountDto,
  ) {
    return ok(await this.financeAccountsService.update(user.userId, user.workspaceId, id, payload));
  }

  @Delete(':id')
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ok(await this.financeAccountsService.remove(user.userId, user.workspaceId, id));
  }

}
