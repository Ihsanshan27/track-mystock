import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { ok } from '../common/api-response';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(DevAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async summary(
    @CurrentUser() user: RequestUser,
    @Query('market') market?: string,
    @Query('usdToIdrRate') usdToIdrRate?: string,
    @Query('initialCapital') initialCapital?: string,
    @Query('initialCapitalUS') initialCapitalUS?: string,
    @Query('performanceRangeKey') performanceRangeKey?: string,
    @Query('profitLossRangeKey') profitLossRangeKey?: string,
    @Query('customStartDate') customStartDate?: string,
    @Query('customEndDate') customEndDate?: string,
    @Query('calendarMonth') calendarMonth?: string,
  ) {
    return ok(await this.dashboardService.getSummary(user.userId, user.workspaceId, {
      market: market as 'ID' | 'US' | 'ALL' | undefined,
      usdToIdrRate: usdToIdrRate ? Number(usdToIdrRate) : undefined,
      initialCapital: initialCapital ? Number(initialCapital) : undefined,
      initialCapitalUS: initialCapitalUS ? Number(initialCapitalUS) : undefined,
      performanceRangeKey: performanceRangeKey as '1w' | '1m' | '3m' | 'ytd' | '1y' | 'all' | undefined,
      profitLossRangeKey: profitLossRangeKey as '1w' | '1m' | '3m' | 'ytd' | '1y' | 'all' | undefined,
      customStartDate,
      customEndDate,
      calendarMonth,
    }));
  }
}
