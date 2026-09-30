import type { ReportStatus, Role } from './types';

export const STATUS_LABEL: Record<ReportStatus, string> = {
  NEW: 'Reçu',
  ACKNOWLEDGED: 'Pris en compte',
  IN_PROGRESS: 'Intervention en cours',
  RESOLVED: 'Résolu',
  REJECTED: 'Refusé',
};

/** Verbe d'action, pour les boutons des agents. */
export const STATUS_ACTION: Record<ReportStatus, string> = {
  NEW: 'Remettre à « reçu »',
  ACKNOWLEDGED: 'Prendre en compte',
  IN_PROGRESS: 'Démarrer l’intervention',
  RESOLVED: 'Marquer comme résolu',
  REJECTED: 'Refuser',
};

export const STATUS_COLOR: Record<ReportStatus, string> = {
  NEW: 'var(--color-st-new)',
  ACKNOWLEDGED: 'var(--color-st-ack)',
  IN_PROGRESS: 'var(--color-st-progress)',
  RESOLVED: 'var(--color-st-resolved)',
  REJECTED: 'var(--color-st-rejected)',
};

/** Même règle que l'API (src/reports/status.ts) : l'interface ne propose que ce qui sera accepté. */
export const TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  NEW: ['ACKNOWLEDGED', 'REJECTED'],
  ACKNOWLEDGED: ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED', 'ACKNOWLEDGED'],
  RESOLVED: ['IN_PROGRESS'],
  REJECTED: ['ACKNOWLEDGED'],
};

export const requiresMessage = (s: ReportStatus) => s === 'REJECTED' || s === 'RESOLVED';

export const OPEN_STATUSES: ReportStatus[] = ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS'];
export const ALL_STATUSES: ReportStatus[] = ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];

export const ROLE_LABEL: Record<Role, string> = {
  CITIZEN: 'Habitant',
  AGENT: 'Agent de la ville',
  ADMIN: 'Administrateur',
};

export const isStaff = (role?: Role | null) => role === 'AGENT' || role === 'ADMIN';

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

/** « il y a 3 heures », « hier », « il y a 2 semaines ». */
export function timeAgo(iso: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return 'à l’instant';
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export const formatDays = (days: number | null) =>
  days === null ? '—' : days < 1 ? `${Math.round(days * 24)} h` : `${days.toLocaleString('fr-FR')} j`;

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');
