import { Check, CircleX, MessageSquare, UserRound, Users, Wrench } from 'lucide-react';
import { Link } from 'react-router';
import { CategoryMark, StatusBadge } from '@/components/ui/primitives';
import { photoUrl } from '@/lib/api';
import { cx, formatDateTime, plural, ROLE_LABEL, STATUS_COLOR, STATUS_LABEL, timeAgo } from '@/lib/format';
import type { ReportEvent, ReportStatus, ReportSummary } from '@/lib/types';

/** Carte d'un signalement dans une liste. */
export function ReportCard({ report, compact = false }: { report: ReportSummary; compact?: boolean }) {
  return (
    <Link
      to={`/signalements/${report.id}`}
      className="group flex gap-3.5 rounded-2xl border border-line bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card"
    >
      {report.photo && !compact ? (
        <img src={photoUrl(report.photo)} alt="" className="size-16 shrink-0 rounded-xl object-cover" loading="lazy" />
      ) : (
        <CategoryMark icon={report.category.icon} color={report.category.color} size={compact ? 40 : 64} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 font-semibold leading-snug text-ink group-hover:text-brand-strong">{report.title}</p>
          {report.distance !== undefined && (
            <span className="shrink-0 rounded-full bg-paper-2 px-2 py-0.5 text-xs font-semibold text-muted">{report.distance} m</span>
          )}
        </div>
        <p className="mt-1 truncate text-[13px] text-muted">
          {report.category.name}
          {report.address ? ` · ${report.address}` : ''}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <StatusBadge status={report.status} />
          <span className="flex items-center gap-1 text-xs text-muted">
            <Users className="size-3.5" /> {report.supportCount}
          </span>
          <span className="text-xs text-faint">{timeAgo(report.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

const TRACK: ReportStatus[] = ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED'];

/** Avancement visuel : Reçu → Pris en compte → Intervention → Résolu. */
export function StatusTracker({ status }: { status: ReportStatus }) {
  if (status === 'REJECTED') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-paper-2 px-4 py-3 text-sm">
        <CircleX className="size-5 text-st-rejected" />
        <span>
          <strong>Signalement refusé.</strong> Le motif est indiqué dans l’historique ci-dessous.
        </span>
      </div>
    );
  }
  const current = TRACK.indexOf(status);
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Avancement">
      {TRACK.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s} className="flex flex-col gap-2">
            <span className={cx('h-1.5 rounded-full transition-colors', done ? '' : 'bg-line')} style={done ? { background: STATUS_COLOR[status] } : undefined} />
            <span className={cx('text-[11px] leading-tight font-semibold sm:text-xs', i === current ? 'text-ink' : done ? 'text-muted' : 'text-faint')}>
              {STATUS_LABEL[s]}
            </span>
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
          a changé le statut en <strong style={{ color: STATUS_COLOR[e.toStatus!] }}>{STATUS_LABEL[e.toStatus!]}</strong>
        </>
      );
    case 'COMMENT':
      return 'a commenté';
  }
}

/** Historique complet : chaque étape et chaque commentaire, dans l'ordre. */
export function Timeline({ events }: { events: ReportEvent[] }) {
  return (
    <ol className="relative flex flex-col gap-5 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-line">
      {events.map((e) => {
        const staff = e.actor.role !== 'CITIZEN';
        const Icon = e.type === 'COMMENT' ? MessageSquare : e.toStatus === 'RESOLVED' ? Check : staff ? Wrench : UserRound;
        const color = e.toStatus ? STATUS_COLOR[e.toStatus] : staff ? 'var(--color-brand)' : 'var(--color-muted)';
        const showMessage = e.message && e.type !== 'ASSIGNED';
        return (
          <li key={e.id} className="relative flex gap-3.5">
            <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-card" style={{ background: `color-mix(in srgb, ${color} 15%, white)`, color }}>
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm text-ink">
                <strong className="font-semibold">{e.actor.name}</strong>
                {staff && <span className="ml-1.5 rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-brand-strong">{ROLE_LABEL[e.actor.role]}</span>}{' '}
                <span className="text-muted">{eventText(e)}</span>
              </p>
              <p className="mt-0.5 text-xs text-faint">{formatDateTime(e.createdAt)}</p>
              {showMessage && (
                <p className={cx('mt-2 rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line', staff ? 'bg-brand-soft/60 text-ink' : 'bg-paper-2 text-ink')}>{e.message}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export const supportersLabel = (n: number) => plural(n, 'personne concernée', 'personnes concernées');
