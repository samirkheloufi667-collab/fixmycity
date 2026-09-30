import { Clock, Inbox, TriangleAlert, Wrench } from 'lucide-react';
import { Link } from 'react-router';
import CountUp from '@/components/reactbits/CountUp';
import { Card, ErrorNote, PageHeader, Spinner, StatusBadge } from '@/components/ui/primitives';
import { useAuth } from '@/lib/auth';
import { ALL_STATUSES, formatDays, ROLE_LABEL, STATUS_COLOR, STATUS_LABEL, timeAgo } from '@/lib/format';
import type { AdminStats } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function Dashboard() {
  const { me } = useAuth();
  const stats = useApi<AdminStats>('/admin/stats');

  if (stats.loading && !stats.data) return <Spinner />;
  if (stats.error || !stats.data) return <ErrorNote>{stats.error}</ErrorNote>;
  const s = stats.data;
  const mine = s.workload.find((w) => w.id === me?.id);

  const cards = [
    { label: 'Signalements ouverts', value: s.open, icon: Inbox, color: 'var(--color-brand)' },
    { label: 'Nouveaux à examiner', value: s.counts.NEW, icon: TriangleAlert, color: STATUS_COLOR.NEW },
    { label: 'Interventions en cours', value: s.counts.IN_PROGRESS, icon: Wrench, color: STATUS_COLOR.IN_PROGRESS },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={ROLE_LABEL[me!.role]}
        title="Tableau de bord"
        subtitle={mine ? `Vous suivez ${mine.open} signalement(s) ouvert(s).` : 'Vue d’ensemble des signalements de la ville.'}
        actions={
          <Link to="/admin/file?assignee=none&status=NEW" className="inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong">
            Traiter les nouveaux
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">{label}</p>
              <Icon className="size-4" style={{ color }} />
            </div>
            <p className="mt-2 font-display text-4xl font-bold" style={{ color }}>
              <CountUp to={value} duration={0.9} />
            </p>
          </Card>
        ))}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">Délai médian de résolution</p>
            <Clock className="size-4 text-st-resolved" />
          </div>
          <p className="mt-2 font-display text-4xl font-bold text-st-resolved">{formatDays(s.medianResolutionDays)}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">Reçus et résolus, par semaine</h2>
            <div className="flex gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-st-new" /> Reçus
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-st-resolved" /> Résolus
              </span>
            </div>
          </div>
          <WeeklyChart weeks={s.weeks} />
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Ouverts par catégorie</h2>
          <ul className="mt-5 flex flex-col gap-3.5">
            {s.openByCategory.map((c) => {
              const max = Math.max(1, ...s.openByCategory.map((x) => x.open));
              return (
                <li key={c.id}>
                  <Link to={`/admin/file?category=${c.slug}`} className="group block">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium group-hover:text-brand">{c.name}</span>
                      <span className="font-semibold tabular-nums">{c.open}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper-2">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(c.open / max) * 100}%`, background: c.color }} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Les plus anciens encore ouverts</h2>
          <ul className="mt-4 divide-y divide-line">
            {s.oldestOpen.map((r) => (
              <li key={r.id}>
                <Link to={`/signalements/${r.id}`} className="flex flex-wrap items-center gap-3 py-3 hover:text-brand">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: r.category.color }} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.title}</span>
                  <StatusBadge status={r.status} />
                  <span className="w-28 text-right text-xs text-muted">{timeAgo(r.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Répartition par statut</h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            {ALL_STATUSES.map((st) => (
              <li key={st} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR[st] }} />
                  {STATUS_LABEL[st]}
                </span>
                <span className="font-semibold tabular-nums">{s.counts[st]}</span>
              </li>
            ))}
          </ul>
          <h3 className="mt-6 text-sm font-semibold text-muted">Charge des agents</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {s.workload.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span>{a.name}</span>
                <span className="rounded-full bg-paper-2 px-2.5 py-0.5 text-xs font-semibold">{a.open} ouvert(s)</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/** Histogramme en SVG : pas de bibliothèque de graphiques pour huit paires de barres. */
function WeeklyChart({ weeks }: { weeks: AdminStats['weeks'] }) {
  const max = Math.max(1, ...weeks.flatMap((w) => [w.created, w.resolved]));
  const H = 180;
  const W = 560;
  const slot = W / weeks.length;
  const bar = Math.min(18, slot / 3);
  return (
    <svg viewBox={`0 0 ${W} ${H + 28}`} className="mt-5 w-full" role="img" aria-label="Signalements reçus et résolus sur huit semaines">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={0} x2={W} y1={H - f * H} y2={H - f * H} stroke="var(--color-line)" strokeDasharray="3 4" />
      ))}
      {weeks.map((w, i) => {
        const x = i * slot + slot / 2;
        const hc = (w.created / max) * H;
        const hr = (w.resolved / max) * H;
        const label = new Date(w.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        return (
          <g key={w.start}>
            <rect x={x - bar - 2} y={H - hc} width={bar} height={hc} rx={4} fill="var(--color-st-new)">
              <title>{`Semaine du ${label} : ${w.created} reçu(s)`}</title>
            </rect>
            <rect x={x + 2} y={H - hr} width={bar} height={hr} rx={4} fill="var(--color-st-resolved)">
              <title>{`Semaine du ${label} : ${w.resolved} résolu(s)`}</title>
            </rect>
            <text x={x} y={H + 18} textAnchor="middle" fontSize={11} fill="var(--color-muted)">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
