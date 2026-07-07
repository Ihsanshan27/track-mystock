import { Injectable } from '@nestjs/common';
import {
  generateNumericOtp,
  generateOpaqueToken,
  hashPlainToken,
  signAccessToken,
  verifyAccessToken,
} from './auth-crypto';

type AccessTokenPayload = {
  sub: string;
  email: string;
  type: 'access';
  iat: number;
  exp: number;
};

@Injectable()
export class AuthTokensService {
  private readonly accessTokenSecret =
    process.env.AUTH_ACCESS_TOKEN_SECRET || 'dev-access-token-secret-change-me';

  private readonly accessTokenTtlSeconds = Number(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS || 900);
  private readonly refreshTokenTtlSeconds = Number(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS || 2592000);
  private readonly emailVerificationTtlSeconds = Number(
    process.env.AUTH_EMAIL_VERIFICATION_TTL_SECONDS || 900,
  );
  private readonly passwordResetTtlSeconds = Number(
    process.env.AUTH_PASSWORD_RESET_TTL_SECONDS || 1800,
  );

  createAccessToken(user: { id: string; email: string }) {
    const now = Math.floor(Date.now() / 1000);
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      type: 'access',
      iat: now,
      exp: now + this.accessTokenTtlSeconds,
    };

    return {
      token: signAccessToken(payload, this.accessTokenSecret),
      expiresAt: new Date(payload.exp * 1000),
    };
  }

  verifyAccessToken(token: string) {
    const payload = verifyAccessToken<AccessTokenPayload>(token, this.accessTokenSecret);
    const now = Math.floor(Date.now() / 1000);

    if (payload.type !== 'access' || payload.exp <= now) {
      throw new Error('Access token expired.');
    }

    return payload;
  }

  createRefreshToken() {
    const plainToken = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + (this.refreshTokenTtlSeconds * 1000));

    return {
      plainToken,
      tokenHash: hashPlainToken(plainToken),
      expiresAt,
    };
  }

  createEmailVerificationOtp() {
    const otp = generateNumericOtp(6);
    const expiresAt = new Date(Date.now() + (this.emailVerificationTtlSeconds * 1000));

    return {
      otp,
      tokenHash: hashPlainToken(otp),
      expiresAt,
    };
  }

  createPasswordResetToken() {
    const token = generateNumericOtp(6);
    const expiresAt = new Date(Date.now() + (this.passwordResetTtlSeconds * 1000));

    return {
      token,
      tokenHash: hashPlainToken(token),
      expiresAt,
    };
  }

  hashIncomingToken(token: string) {
    return hashPlainToken(token);
  }
}
