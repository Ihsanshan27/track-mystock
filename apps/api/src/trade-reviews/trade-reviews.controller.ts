import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { ok } from '../common/api-response';
import { CreateTradeReviewDto } from './dto/create-trade-review.dto';
import { UpdateTradeReviewDto } from './dto/update-trade-review.dto';
import { TradeReviewsService } from './trade-reviews.service';

@Controller('trade-reviews')
@UseGuards(DevAuthGuard)
export class TradeReviewsController {
  constructor(private readonly tradeReviewsService: TradeReviewsService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser, @Query('tradeId') tradeId: string) {
    return ok(await this.tradeReviewsService.list(user.userId, tradeId));
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() payload: CreateTradeReviewDto) {
    return ok(await this.tradeReviewsService.create(user.userId, payload));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') reviewId: string,
    @Body() payload: UpdateTradeReviewDto,
  ) {
    return ok(await this.tradeReviewsService.update(user.userId, reviewId, payload));
  }

  @Delete(':id')
  async remove(@CurrentUser() user: RequestUser, @Param('id') reviewId: string) {
    return ok(await this.tradeReviewsService.remove(user.userId, reviewId));
  }
}
