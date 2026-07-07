import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { ok } from '../common/api-response';
import { CashflowsService } from './cashflows.service';
import { CreateCashflowDto } from './dto/create-cashflow.dto';
import { UpdateCashflowDto } from './dto/update-cashflow.dto';

@Controller('cashflows')
@UseGuards(DevAuthGuard)
export class CashflowsController {
  constructor(private readonly cashflowsService: CashflowsService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return ok(await this.cashflowsService.list(user.userId, user.workspaceId));
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() payload: CreateCashflowDto) {
    return ok(await this.cashflowsService.create(user.userId, user.workspaceId, payload));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() payload: UpdateCashflowDto,
  ) {
    return ok(await this.cashflowsService.update(user.userId, user.workspaceId, id, payload));
  }

  @Delete(':id')
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ok(await this.cashflowsService.remove(user.userId, user.workspaceId, id));
  }

}
