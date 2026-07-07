import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { ok } from '../common/api-response';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
@UseGuards(DevAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async list(
    @CurrentUser() user: RequestUser,
    @Query('limit') limit?: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
  ) {
    return ok(
      await this.auditLogsService.listForUser(user.userId, user.workspaceId, {
        limit: limit ? Number(limit) : undefined,
        targetType,
        targetId,
      }),
    );
  }
}
