import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { ok } from '../common/api-response';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { ReorderPortfoliosDto } from './dto/reorder-portfolios.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { PortfoliosService } from './portfolios.service';

@Controller('portfolios')
@UseGuards(DevAuthGuard)
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return ok(await this.portfoliosService.list(user.userId, user.workspaceId));
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() payload: CreatePortfolioDto) {
    return ok(await this.portfoliosService.create(user.userId, user.workspaceId, payload));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') portfolioId: string,
    @Body() payload: UpdatePortfolioDto,
  ) {
    return ok(await this.portfoliosService.update(user.userId, user.workspaceId, portfolioId, payload));
  }

  @Delete(':id')
  async remove(@CurrentUser() user: RequestUser, @Param('id') portfolioId: string) {
    return ok(await this.portfoliosService.remove(user.userId, user.workspaceId, portfolioId));
  }

  @Put('reorder')
  async reorder(@CurrentUser() user: RequestUser, @Body() payload: ReorderPortfoliosDto) {
    return ok(await this.portfoliosService.reorder(user.userId, user.workspaceId, payload));
  }

}
