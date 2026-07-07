import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthTokensService } from './auth-tokens.service';

@Injectable()
export class DevAuthGuard implements CanActivate {
  constructor(
    private readonly authTokens: AuthTokensService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const bearerToken =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length).trim()
        : null;
    const headerUserId = request.headers['x-user-id'];
    const headerWorkspaceId = request.headers['x-workspace-id'];
    const userId = Array.isArray(headerUserId) ? headerUserId[0] : headerUserId;
    const workspaceId = Array.isArray(headerWorkspaceId) ? headerWorkspaceId[0] : headerWorkspaceId;

    if (bearerToken) {
      try {
        const payload = this.authTokens.verifyAccessToken(bearerToken);
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
        });

        if (!user || user.status !== 'active') {
          throw new UnauthorizedException('User tidak aktif.');
        }

        request.user = {
          userId: payload.sub,
          workspaceId: typeof workspaceId === 'string' && workspaceId.length > 0 ? workspaceId : null,
        };

        return true;
      } catch (error) {
        throw new UnauthorizedException('Access token tidak valid atau sudah kedaluwarsa.');
      }
    }

    if (!userId || typeof userId !== 'string') {
      throw new UnauthorizedException('Missing x-user-id header.');
    }

    request.user = {
      userId,
      workspaceId: typeof workspaceId === 'string' && workspaceId.length > 0 ? workspaceId : null,
    };

    return true;
  }
}
