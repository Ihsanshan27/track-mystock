import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { ok } from '../common/api-response';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpsertWorkspaceMemberDto } from './dto/upsert-workspace-member.dto';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
@UseGuards(DevAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  async list(@CurrentUser() user: RequestUser) {
    return ok(await this.workspacesService.listForUser(user.userId));
  }

  @Post()
  async create(@CurrentUser() user: RequestUser, @Body() payload: CreateWorkspaceDto) {
    return ok(await this.workspacesService.create(user.userId, payload));
  }

  @Get(':id/members')
  async listMembers(@CurrentUser() user: RequestUser, @Param('id') workspaceId: string) {
    return ok(await this.workspacesService.listMembers(user.userId, workspaceId));
  }

  @Put(':id/members')
  async upsertMember(
    @CurrentUser() user: RequestUser,
    @Param('id') workspaceId: string,
    @Body() payload: UpsertWorkspaceMemberDto,
  ) {
    return ok(await this.workspacesService.upsertMember(user.userId, workspaceId, payload));
  }

  @Delete('members/:memberId')
  async removeMember(@CurrentUser() user: RequestUser, @Param('memberId') memberId: string) {
    return ok(await this.workspacesService.removeMember(user.userId, memberId));
  }
}
