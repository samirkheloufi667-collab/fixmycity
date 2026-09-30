import type { Role } from '@prisma/client';

/**
 * Nom affiché publiquement. Un habitant apparaît en « Prénom N. » : assez
 * pour humaniser un signalement, pas assez pour l'identifier. Les agents
 * agissent au nom de la ville et apparaissent en entier.
 */
export function publicName(user: { name: string; role: Role }): string {
  if (user.role !== 'CITIZEN') return user.name;
  const [first, ...rest] = user.name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}
