import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { hashPassword, verifyPassword } from './auth-crypto';
import { AuthTokensService } from './auth-tokens.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendEmailVerificationDto } from './dto/resend-email-verification.dto';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly authTokens: AuthTokensService,
    private readonly appSettingsService: AppSettingsService,
    private readonly mailService: MailService,
  ) {}

  async register(payload: RegisterDto) {
    const registrationEnabled = await this.appSettingsService.getPublicRegistrationEnabled();
    if (!registrationEnabled) {
      throw new BadRequestException('Registrasi sedang dinonaktifkan. Hubungi admin untuk dibuatkan akun.');
    }

    const email = payload.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email sudah terdaftar.');
    }

    const verification = this.authTokens.createEmailVerificationOtp();

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash: hashPassword(payload.password),
          status: 'active',
          profile: {
            create: {
              displayName: email.split('@')[0],
              defaultRole: 'trader',
            },
          },
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: createdUser.id,
          tokenHash: verification.tokenHash,
          expiresAt: verification.expiresAt,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: createdUser.id,
          action: 'auth.registered',
          targetType: 'auth_user',
          targetId: createdUser.id,
          metadata: {
            email,
            provider: 'backend',
            needsVerification: true,
          },
        },
      });

      return createdUser;
    });

    this.mailService.sendOtpEmail(email, verification.otp).catch(() => {});

    return {
      userId: user.id,
      email,
      needsConfirmation: true,
      needsOtpVerification: true,
      message: 'Akun dibuat. Kode verifikasi telah dikirim ke email Anda.',
    };
  }

  async login(payload: LoginDto) {
    const email = payload.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user || !verifyPassword(payload.password, user.passwordHash)) {
      throw new UnauthorizedException('Email atau password salah.');
    }

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('Email belum dikonfirmasi. Cek inbox email Anda terlebih dahulu.');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Akun tidak aktif.');
    }

    const session = await this.issueSession(user.id, user.email);

    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'auth.logged_in',
        targetType: 'auth_user',
        targetId: user.id,
        metadata: {
          provider: 'backend',
        },
      },
    });

    return {
      ...session,
      user: await this.usersService.getMe(user.id),
    };
  }

  async refresh(payload: RefreshDto) {
    const hashedToken = this.authTokens.hashIncomingToken(payload.refreshToken);

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: hashedToken,
        revokedAt: null,
      },
      include: {
        user: true,
      },
    });

    if (!storedToken || storedToken.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token tidak valid atau sudah kedaluwarsa.');
    }

    const session = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          revokedAt: new Date(),
        },
      });

      return this.issueSession(storedToken.user.id, storedToken.user.email, tx);
    });

    return {
      ...session,
      user: await this.usersService.getMe(storedToken.user.id),
    };
  }

  async logout(userId: string | null, payload: LogoutDto) {
    const hashedToken = this.authTokens.hashIncomingToken(payload.refreshToken);

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: hashedToken,
        revokedAt: null,
      },
    });

    if (storedToken) {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
    }

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'auth.logged_out',
          targetType: 'auth_user',
          targetId: userId,
          metadata: {
            provider: 'backend',
          },
        },
      });
    }

    return { ok: true };
  }

  async forgotPassword(payload: ForgotPasswordDto) {
    const email = payload.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        email,
        resetToken: null,
        message: 'Jika email terdaftar, instruksi reset password sudah dibuat.',
      };
    }

    const reset = this.authTokens.createPasswordResetToken();

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: reset.tokenHash,
          expiresAt: reset.expiresAt,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'auth.password_reset_requested',
          targetType: 'auth_user',
          targetId: user.id,
          metadata: {
            email,
            provider: 'backend',
          },
        },
      });
    });

    this.mailService.sendPasswordResetEmail(email, reset.token).catch(() => {});

    return {
      email,
      message: 'Kode reset password telah dikirim ke email Anda. Lanjutkan ke halaman reset password.',
    };
  }

  async resetPassword(payload: ResetPasswordDto) {
    const email = payload.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan.');
    }

    const tokenHash = this.authTokens.hashIncomingToken(payload.token);
    const resetRecord = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        tokenHash,
        usedAt: null,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    if (!resetRecord || resetRecord.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Token reset password tidak valid atau sudah kedaluwarsa.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashPassword(payload.newPassword),
        },
      });

      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: {
          usedAt: new Date(),
        },
      });

      await tx.refreshToken.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'auth.password_reset',
          targetType: 'auth_user',
          targetId: user.id,
          metadata: {
            email,
            provider: 'backend',
          },
        },
      });
    });

    return {
      message: 'Password berhasil diperbarui. Silakan login dengan password baru Anda.',
    };
  }

  async verifyEmail(payload: VerifyEmailDto) {
    const email = payload.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan.');
    }

    const tokenHash = this.authTokens.hashIncomingToken(payload.token);
    const verificationRecord = await this.prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        tokenHash,
        usedAt: null,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    if (!verificationRecord || verificationRecord.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Kode OTP sudah kedaluwarsa. Silakan kirim ulang kode baru.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: new Date(),
        },
      });

      await tx.emailVerificationToken.update({
        where: { id: verificationRecord.id },
        data: {
          usedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'auth.email_verified',
          targetType: 'auth_user',
          targetId: user.id,
          metadata: {
            email,
            provider: 'backend',
          },
        },
      });
    });

    return {
      hasSession: false,
      message: 'Email berhasil diverifikasi.',
    };
  }

  async resendEmailVerification(payload: ResendEmailVerificationDto) {
    const email = payload.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan.');
    }

    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email sudah terverifikasi.');
    }

    const verification = this.authTokens.createEmailVerificationOtp();

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: verification.tokenHash,
        expiresAt: verification.expiresAt,
      },
    });

    this.mailService.sendOtpEmail(email, verification.otp).catch(() => {});

    return {
      email,
      message: 'Kode OTP baru sudah dikirim ke email Anda.',
    };
  }

  private async issueSession(
    userId: string,
    email: string,
    txArg?: PrismaService | Prisma.TransactionClient,
  ) {
    const tx = txArg ?? this.prisma;
    const accessToken = this.authTokens.createAccessToken({ id: userId, email });
    const refreshToken = this.authTokens.createRefreshToken();

    await tx.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshToken.tokenHash,
        expiresAt: refreshToken.expiresAt,
      },
    });

    return {
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken: refreshToken.plainToken,
      refreshTokenExpiresAt: refreshToken.expiresAt,
    };
  }
}
