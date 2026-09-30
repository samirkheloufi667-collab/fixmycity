import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, ROLES } from './decorators';

/**
 * Vérifie le rôle **en base**, pas celui inscrit dans le jeton : un agent
 * rétrogradé par un administrateur perd ses droits immédiatement, sans
 * attendre l'expiration de son jeton d'accès.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles?.length) return true;

    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    if (!user) throw new ForbiddenException('Accès réservé');

    const fresh = await this.prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
    if (!fresh || !roles.includes(fresh.role)) {
      throw new ForbiddenException('Action réservée aux services de la ville');
    }
    request.user = { ...user, role: fresh.role };
    return true;
  }
}
