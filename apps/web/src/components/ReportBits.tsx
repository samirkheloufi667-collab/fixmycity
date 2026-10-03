import { Link } from 'react-router';
import { CategoryMark, StatusBadge } from '@/components/ui/primitives';
import { photoUrl } from '@/lib/api';
import { cx, formatDateTime, plural, ROLE_LABEL, STATUS_COLOR, STATUS_LABEL, timeAgo } from '@/lib/format';
import type { ReportEvent, ReportStatus, ReportSummary } from '@/lib/types';

/** Un signalement dans une liste : plaque de catégorie, titre, statut, soutiens. */
export function ReportCard({ report, compact = false }: { report: ReportSummary; compact?: boolean }) {
  return (
    <Link to={`/signalements/${report.id}`} className="group flex gap-4 border-2 border-ink bg-card p-3 transition-[box-shadow,transform] duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--color-ink)]">
      {report.photo && !compact ? (
        <span className="relative shrink-0">
          <img src={photoUrl(report.photo)} alt="" className="size-16 border-2 border-ink object-cover grayscale transition-[filter] duration-300 group-hover:grayscale-0" loading="lazy" />
          <span className="absolute -right-1.5 -bottom-1.5">
            <CategoryMark category={report.category} size={22} />
          </span>
        </span>
      ) : (
        <CategoryMark category={report.category} size={compact ? 40 : 64} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 leading-snug font-bold text-ink">{report.title}</p>
          {report.distance !== undefined && <span className="sign-wide shrink-0 bg-paper-2 px-1.5 text-[11px]">{report.distance} m</span>}
        </div>
        <p className="mt-1 truncate text-[13px] text-muted">
          {report.category.name}
          {report.address ? ` · ${report.address}` : ''}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <StatusBadge status={report.status} />
          <span className="tnum text-xs font-bold">{plural(report.supportCount, 'concerné', 'concernés')}</span>
          <span className="text-xs text-faint">{timeAgo(report.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

const TRACK: ReportStatus[] = ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED'];

/**
 * Avancement dessiné comme une ligne de métro : quatre stations, la partie
 * parcourue à la couleur du statut, la station actuelle cerclée.
 */
export function StatusTracker({ status }: { status: ReportStatus }) {
  if (status === 'REJECTED') {
    return (
      <div className="flex items-center gap-3 border-2 border-ink bg-paper-2 px-4 py-3 text-sm">
        <span className="sign-wide bg-st-rejected px-1.5 text-[11px] text-white">Refusé</span>
        <span>Le motif est indiqué dans le suivi ci-dessous.</span>
      </div>
    );
  }
  const current = TRACK.indexOf(status);
  const color = STATUS_COLOR[status];
  return (
    <ol className="relative grid grid-cols-4" aria-label="Avancement">
      <span aria-hidden className="absolute top-[9px] right-[12.5%] left-[12.5%] h-[6px] bg-line" />
      <span aria-hidden className="absolute top-[9px] left-[12.5%] h-[6px] transition-[width] duration-700" style={{ width: `${(current / 3) * 75}%`, background: color }} />
      {TRACK.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s} className="relative flex flex-col items-center gap-2 text-center">
            <span
              className={cx('relative z-10 size-6 rounded-full border-[5px] bg-card', i === current && 'scale-125')}
              style={{ borderColor: done ? color : 'var(--color-line)' }}
              aria-current={i === current ? 'step' : undefined}
            />
            <span className={cx('sign-wide text-[10px] leading-tight sm:text-[11px]', i === current ? 'text-ink' : done ? 'text-muted' : 'text-faint')}>{STATUS_LABEL[s]}</span>
          </li>
        );
      })}
    </ol>
  );
}

function eventText(e: ReportEvent) {
  switch (e.type) {
    case 'CREATED':
      return 'a signalé le problème';
    case 'ASSIGNED':
      return e.message ?? 'a modifié l’attribution';
    case 'STATUS_CHANGED':
      return (
        <>
          → <strong style={{ color: STATUS_COLOR[e.toStatus!] }}>{STATUS_LABEL[e.toStatus!]}</strong>
        </>
      );
    case 'COMMENT':
      return 'a commenté';
  }
}

/** Historique complet, comme les arrêts d'une ligne : chaque étape et chaque commentaire, dans l'ordre. */
export function Timeline({ events }: { events: ReportEvent[] }) {
  return (
    <ol className="relative flex flex-col gap-6 before:absolute before:top-2 before:bottom-2 before:left-[9px] before:w-[4px] before:bg-ink">
      {events.map((e) => {
        const staff = e.actor.role !== 'CITIZEN';
        const color = e.toStatus ? STATUS_COLOR[e.toStatus] : staff ? 'var(--color-ink)' : 'var(--color-card)';
        const showMessage = e.message && e.type !== 'ASSIGNED';
        return (
          <li key={e.id} className="relative flex gap-4">
            <span className="relative z-10 mt-0.5 size-[22px] shrink-0 rounded-full border-[4px] border-ink" style={{ background: color }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">
                <strong className="font-bold">{e.actor.name}</strong>
                {staff && <span className="sign-wide ml-2 bg-ink px-1.5 py-0.5 text-[10px] text-paper">{ROLE_LABEL[e.actor.role]}</span>} <span className="text-muted">{eventText(e)}</span>
              </p>
              <p className="tnum mt-0.5 text-xs text-faint">{formatDateTime(e.createdAt)}</p>
              {showMessage && <p className={cx('mt-2 border-l-4 px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line', staff ? 'border-ink bg-paper-2' : 'border-line bg-card')}>{e.message}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export const supportersLabel = (n: number) => plural(n, 'personne concernée', 'personnes concernées');
