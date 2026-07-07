import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ok } from '../common/api-response';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { AppSettingsService } from './app-settings.service';
import { UpdatePublicRegistrationDto } from './dto/update-public-registration.dto';

@Controller('app-settings')
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get('public-registration')
  async getPublicRegistration() {
    return ok({
      enabled: await this.appSettingsService.getPublicRegistrationEnabled(),
    });
  }

  @Patch('public-registration')
  @UseGuards(DevAuthGuard)
  async updatePublicRegistration(
    @CurrentUser() user: RequestUser,
    @Body() payload: UpdatePublicRegistrationDto,
  ) {
    return ok({
      enabled: await this.appSettingsService.updatePublicRegistrationEnabled(user.userId, payload.enabled),
    });
  }
}
