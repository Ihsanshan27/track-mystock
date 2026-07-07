import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { ok } from '../common/api-response';
import { CreateFinanceTransferDto } from './dto/create-finance-transfer.dto';
import { CreateFinanceTransactionDto } from './dto/create-finance-transaction.dto';
import { FinanceTransactionsService } from './finance-transactions.service';
import { UpdateFinanceTransactionDto } from './dto/update-finance-transaction.dto';

@Controller('finance-transactions')
@UseGuards(DevAuthGuard)
export class FinanceTransactionsController {
  constructor(private readonly financeTransactionsService: FinanceTransactionsService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return ok(await this.financeTransactionsService.list(user.userId, user.workspaceId));
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() payload: CreateFinanceTransactionDto) {
    return ok(await this.financeTransactionsService.create(user.userId, user.workspaceId, payload));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() payload: UpdateFinanceTransactionDto,
  ) {
    return ok(await this.financeTransactionsService.update(user.userId, user.workspaceId, id, payload));
  }

  @Delete(':id')
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return ok(await this.financeTransactionsService.remove(user.userId, user.workspaceId, id));
  }

  @Post('transfer')
  async createTransfer(@CurrentUser() user: RequestUser, @Body() payload: CreateFinanceTransferDto) {
    return ok(await this.financeTransactionsService.createTransfer(user.userId, user.workspaceId, payload));
  }
}
