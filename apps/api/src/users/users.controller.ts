import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ok } from '../common/api-response';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller()
@UseGuards(DevAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    return ok(await this.usersService.getMe(user.userId));
  }

  @Get('users/directory')
  async listDirectory(@Query('ids') ids?: string) {
    const userIds = ids
      ?.split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    return ok(await this.usersService.listDirectory(userIds));
  }

  @Get('users')
  async listUsers(@CurrentUser() user: RequestUser) {
    return ok(await this.usersService.listUsers(user.userId));
  }

  @Get('users/:id/shared-journal')
  async getSharedJournal(@CurrentUser() user: RequestUser, @Param('id') ownerUserId: string) {
    return ok(await this.usersService.getSharedJournal(user.userId, ownerUserId));
  }

  @Patch('users/me/profile')
  async updateMyProfile(@CurrentUser() user: RequestUser, @Body() payload: UpdateProfileDto) {
    return ok(await this.usersService.updateMyProfile(user.userId, payload.displayName));
  }

  @Patch('users/me/password')
  async updateMyPassword(@CurrentUser() user: RequestUser, @Body() payload: ChangePasswordDto) {
    return ok(await this.usersService.updateMyPassword(user.userId, payload.currentPassword, payload.newPassword));
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @CurrentUser() user: RequestUser,
    @Param('id') targetUserId: string,
    @Body() payload: UpdateUserRoleDto,
  ) {
    return ok(await this.usersService.updateUserRole(user.userId, targetUserId, payload.role));
  }

  @Post('users/admin-create')
  async createUserAsAdmin(@CurrentUser() user: RequestUser, @Body() payload: AdminCreateUserDto) {
    return ok(await this.usersService.createUserAsAdmin(user.userId, payload));
  }
}
