import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

/**
 * Route accessible sans jeton (carte, détail d'un signalement, connexion).
 * Si un jeton valide est tout de même envoyé, l'utilisateur est reconnu :
 * la même route peut alors dire « vous soutenez déjà ce signalement ».
 */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Rôles autorisés à appeler la route. Vérifiés en base par RolesGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

/** Utilisateur authentifié (ou undefined sur une route publique appelée sans jeton). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => ctx.switchToHttp().getRequest().user,
);
