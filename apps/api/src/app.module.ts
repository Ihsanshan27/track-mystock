import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { PortfoliosController } from './portfolios/portfolios.controller';
import { PortfoliosService } from './portfolios/portfolios.service';
import { TradesController } from './trades/trades.controller';
import { TradesService } from './trades/trades.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { DevAuthGuard } from './auth/dev-auth.guard';
import { CashflowsController } from './cashflows/cashflows.controller';
import { CashflowsService } from './cashflows/cashflows.service';
import { DividendsController } from './dividends/dividends.controller';
import { DividendsService } from './dividends/dividends.service';
import { WatchlistController } from './watchlist/watchlist.controller';
import { WatchlistService } from './watchlist/watchlist.service';
import { NotesController } from './notes/notes.controller';
import { NotesService } from './notes/notes.service';
import { FinanceAccountsController } from './finance-accounts/finance-accounts.controller';
import { FinanceAccountsService } from './finance-accounts/finance-accounts.service';
import { FinanceTransactionsController } from './finance-transactions/finance-transactions.controller';
import { FinanceTransactionsService } from './finance-transactions/finance-transactions.service';
import { IpoEventsController } from './ipo-events/ipo-events.controller';
import { IpoEventsService } from './ipo-events/ipo-events.service';
import { IpoAccountsController } from './ipo-accounts/ipo-accounts.controller';
import { IpoAccountsService } from './ipo-accounts/ipo-accounts.service';
import { IpoEntriesController } from './ipo-entries/ipo-entries.controller';
import { IpoEntriesService } from './ipo-entries/ipo-entries.service';
import { ApiHomeController } from './api-home.controller';
import { AccessControlService } from './auth/access-control.service';
import { SharedAccessController } from './shared-access/shared-access.controller';
import { SharedAccessService } from './shared-access/shared-access.service';
import { TradeReviewsController } from './trade-reviews/trade-reviews.controller';
import { TradeReviewsService } from './trade-reviews/trade-reviews.service';
import { ReportSharesController } from './report-shares/report-shares.controller';
import { ReportSharesService } from './report-shares/report-shares.service';
import { AuditLogsController } from './audit-logs/audit-logs.controller';
import { AuditLogsService } from './audit-logs/audit-logs.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthTokensService } from './auth/auth-tokens.service';
import { WorkspacesController } from './workspaces/workspaces.controller';
import { WorkspacesService } from './workspaces/workspaces.service';
import { AppSettingsController } from './app-settings/app-settings.controller';
import { AppSettingsService } from './app-settings/app-settings.service';
import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
  ],
  controllers: [
    ApiHomeController,
    AuthController,
    UsersController,
    PortfoliosController,
    TradesController,
    DashboardController,
    CashflowsController,
    DividendsController,
    WatchlistController,
    NotesController,
    FinanceAccountsController,
    FinanceTransactionsController,
    IpoEventsController,
    IpoAccountsController,
    IpoEntriesController,
    SharedAccessController,
    TradeReviewsController,
    ReportSharesController,
    AuditLogsController,
    WorkspacesController,
    AppSettingsController,
    AnalyticsController,
  ],
  providers: [
    PrismaService,
    AccessControlService,
    AuthTokensService,
    AuthService,
    UsersService,
    PortfoliosService,
    TradesService,
    DashboardService,
    CashflowsService,
    DividendsService,
    WatchlistService,
    NotesService,
    FinanceAccountsService,
    FinanceTransactionsService,
    IpoEventsService,
    IpoAccountsService,
    IpoEntriesService,
    SharedAccessService,
    TradeReviewsService,
    ReportSharesService,
    AuditLogsService,
    WorkspacesService,
    AppSettingsService,
    AnalyticsService,
    DevAuthGuard,
  ],
})
export class AppModule {}
