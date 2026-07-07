import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { ok } from '../common/api-response';
import { CreateReportShareDto } from './dto/create-report-share.dto';
import { UpdateReportShareDto } from './dto/update-report-share.dto';
import { ReportSharesService } from './report-shares.service';

@Controller('report-shares')
export class ReportSharesController {
  constructor(private readonly reportSharesService: ReportSharesService) {}

  @Get('key/:shareKey')
  async getByKey(
    @Param('shareKey') shareKey: string,
    @Headers('x-user-id') userIdHeader?: string | string[],
  ) {
    const actorUserId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader ?? null;
    return ok(await this.reportSharesService.getByKey(shareKey, actorUserId));
  }

  @Get()
  @UseGuards(DevAuthGuard)
  async list(@CurrentUser() user: RequestUser) {
    return ok(await this.reportSharesService.list(user.userId, user.workspaceId));
  }

  @Post()
  @UseGuards(DevAuthGuard)
  async create(@CurrentUser() user: RequestUser, @Body() payload: CreateReportShareDto) {
    return ok(await this.reportSharesService.create(user.userId, user.workspaceId, payload));
  }

  @Patch(':id')
  @UseGuards(DevAuthGuard)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') reportShareId: string,
    @Body() payload: UpdateReportShareDto,
  ) {
    return ok(
      await this.reportSharesService.update(user.userId, user.workspaceId, reportShareId, payload),
    );
  }

  @Delete(':id')
  @UseGuards(DevAuthGuard)
  async remove(@CurrentUser() user: RequestUser, @Param('id') reportShareId: string) {
    return ok(await this.reportSharesService.remove(user.userId, user.workspaceId, reportShareId));
  }
}
