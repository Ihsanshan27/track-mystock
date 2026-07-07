import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ok } from '../common/api-response';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(DevAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  async getSummary(
    @CurrentUser() user: RequestUser,
    @Query('usdToIdrRate') usdToIdrRate?: string,
    @Query('initialCapital') initialCapital?: string,
  ) {
    return ok(await this.analyticsService.getSummary(user.userId, user.workspaceId, {
      usdToIdrRate: usdToIdrRate ? Number(usdToIdrRate) : undefined,
      initialCapital: initialCapital ? Number(initialCapital) : undefined,
    }));
  }
}
