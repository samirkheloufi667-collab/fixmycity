import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@prisma/client';
import { config } from '../config';
import { IS_PUBLIC } from './decorators';

interface AccessPayload {
  sub: string;
  email: string;
  role: Role;
}

/**
 * Garde globale : toute route exige un jeton d'accès valide, sauf celles
 * marquées @Public(). Protéger par défaut est plus sûr que d'avoir à penser
 * à protéger chaque nouvelle route.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const request = ctx.switchToHttp().getRequest();
    const [type, token] = (request.headers.authorization ?? '').split(' ');

    if (type !== 'Bearer' || !token) {
      if (isPublic) return true;
      throw new UnauthorizedException('Authentification requise');
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessPayload>(token, {
        secret: config.jwtAccessSecret,
      });
      request.user = { id: payload.sub, email: payload.email, role: payload.role };
      return true;
    } catch {
      // Sur une route publique, un jeton expiré ne doit pas empêcher de lire la carte.
      if (isPublic) return true;
      throw new UnauthorizedException('Session expirée ou invalide');
    }
  }
}
