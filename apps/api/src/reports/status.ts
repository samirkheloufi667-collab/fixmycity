import type { ReportStatus } from '@prisma/client';

/**
 * Cycle de vie d'un signalement. Toute transition absente de ce tableau est
 * refusée par l'API : on ne passe pas de « nouveau » à « résolu » sans que la
 * ville l'ait d'abord pris en compte, et un signalement résolu peut être
 * rouvert si le problème revient.
 */
export const TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  NEW: ['ACKNOWLEDGED', 'REJECTED'],
  ACKNOWLEDGED: ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED', 'ACKNOWLEDGED'],
  RESOLVED: ['IN_PROGRESS'],
  REJECTED: ['ACKNOWLEDGED'],
};

export function canTransition(from: ReportStatus, to: ReportStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Un refus doit être expliqué à l'habitant ; une résolution aussi (« ce qui a été fait »). */
export function requiresMessage(to: ReportStatus): boolean {
  return to === 'REJECTED' || to === 'RESOLVED';
}

/** Statuts où le problème est encore d'actualité (comptés comme doublons potentiels). */
export const OPEN_STATUSES: ReportStatus[] = ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS'];
