import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { ok } from '../common/api-response';
import { CreateTradeDto } from './dto/create-trade.dto';
import { UpdateTradeDto } from './dto/update-trade.dto';
import { TradesService } from './trades.service';

@Controller('trades')
@UseGuards(DevAuthGuard)
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return ok(await this.tradesService.list(user.userId, user.workspaceId));
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() payload: CreateTradeDto) {
    return ok(await this.tradesService.create(user.userId, user.workspaceId, payload));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') tradeId: string,
    @Body() payload: UpdateTradeDto,
  ) {
    return ok(await this.tradesService.update(user.userId, user.workspaceId, tradeId, payload));
  }

  @Delete(':id')
  async remove(@CurrentUser() user: RequestUser, @Param('id') tradeId: string) {
    return ok(await this.tradesService.remove(user.userId, user.workspaceId, tradeId));
  }

}
