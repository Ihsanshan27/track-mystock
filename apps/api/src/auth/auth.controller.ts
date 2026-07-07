import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ok } from '../common/api-response';
import { CurrentUser, RequestUser } from './current-user.decorator';
import { DevAuthGuard } from './dev-auth.guard';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendEmailVerificationDto } from './dto/resend-email-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() payload: RegisterDto) {
    return ok(await this.authService.register(payload));
  }

  @Post('login')
  async login(@Body() payload: LoginDto) {
    return ok(await this.authService.login(payload));
  }

  @Post('refresh')
  async refresh(@Body() payload: RefreshDto) {
    return ok(await this.authService.refresh(payload));
  }

  @Post('forgot-password')
  async forgotPassword(@Body() payload: ForgotPasswordDto) {
    return ok(await this.authService.forgotPassword(payload));
  }

  @Post('reset-password')
  async resetPassword(@Body() payload: ResetPasswordDto) {
    return ok(await this.authService.resetPassword(payload));
  }

  @Post('verify-email')
  async verifyEmail(@Body() payload: VerifyEmailDto) {
    return ok(await this.authService.verifyEmail(payload));
  }

  @Post('verify-email/resend')
  async resendEmailVerification(@Body() payload: ResendEmailVerificationDto) {
    return ok(await this.authService.resendEmailVerification(payload));
  }

  @Post('logout')
  @UseGuards(DevAuthGuard)
  async logout(@CurrentUser() user: RequestUser, @Body() payload: LogoutDto) {
    return ok(await this.authService.logout(user.userId, payload));
  }
}
