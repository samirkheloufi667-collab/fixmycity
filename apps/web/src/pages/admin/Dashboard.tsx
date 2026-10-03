import { useRef } from 'react';
import { Link } from 'react-router';
import { gsap, prefersReducedMotion, useGSAP } from '@/components/motion/gsap';
import { SplitFlap } from '@/components/motion/SplitFlap';
import { buttonClass, Card, ErrorNote, PageHeader, Spinner, StatusBadge } from '@/components/ui/primitives';
import { useAuth } from '@/lib/auth';
import { ALL_STATUSES, categoryCode, formatDays, inkOn, ROLE_LABEL, STATUS_COLOR, STATUS_LABEL, timeAgo } from '@/lib/format';
import type { AdminStats } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const pad = (n: number) => String(n).padStart(3, '0');

export default function Dashboard() {
  const { me } = useAuth();
  const stats = useApi<AdminStats>('/admin/stats');

  if (stats.loading && !stats.data) return <Spinner />;
  if (stats.error || !stats.data) return <ErrorNote>{stats.error}</ErrorNote>;
  const s = stats.data;
  const mine = s.workload.find((w) => w.id === me?.id);

  const board = [
    { label: 'Ouverts', value: pad(s.open) },
    { label: 'Nouveaux à examiner', value: pad(s.counts.NEW) },
    { label: 'Interventions en cours', value: pad(s.counts.IN_PROGRESS) },
    { label: 'Délai médian', value: formatDays(s.medianResolutionDays).toUpperCase().replace(/\s/g, '') },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={ROLE_LABEL[me!.role]}
        title="Tableau de bord"
        subtitle={mine ? `Vous suivez ${mine.open} signalement(s) ouvert(s).` : 'Vue d’ensemble des signalements de la ville.'}
        actions={
          <Link to="/admin/file?assignee=none&status=NEW" className={buttonClass('accent')}>
            Traiter les nouveaux →
          </Link>
        }
      />

      {/* Tableau d'affichage, comme dans une gare. */}
      <dl className="grid grid-cols-2 border-4 border-ink bg-ink text-paper lg:grid-cols-4">
        {board.map((b, i) => (
          <div key={b.label} className={`p-4 sm:p-5 ${i % 2 ? 'border-l-2' : ''} ${i > 1 ? 'border-t-2 lg:border-t-0' : ''} ${i > 0 ? 'lg:border-l-2' : ''} border-paper/20`}>
            <dt className="sign-wide text-[11px] text-paper/60">{b.label}</dt>
            <dd className="mt-2">
              <SplitFlap value={b.value} className="sign text-5xl sm:text-6xl" cellClassName="border border-paper/15 py-1" />
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-3">
            <h2 className="sign text-3xl">Reçus et résolus, par semaine</h2>
            <div className="sign-wide flex gap-4 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="size-3 bg-st-new" /> Reçus
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 bg-st-resolved" /> Résolus
              </span>
            </div>
          </div>
          <WeeklyChart weeks={s.weeks} />
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="sign border-b-2 border-ink pb-3 text-3xl">Ouverts par catégorie</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {s.openByCategory.map((c) => {
              const max = Math.max(1, ...s.openByCategory.map((x) => x.open));
              return (
                <li key={c.id}>
                  <Link to={`/admin/file?category=${c.slug}`} className="group flex items-center gap-3">
                    <span className="flex h-7 w-9 shrink-0 items-center justify-center border-2 border-ink text-[12px] font-extrabold [font-stretch:70%]" style={{ background: c.color, color: inkOn(c.color) }}>
                      {categoryCode(c)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between text-sm font-bold">
                        <span className="group-hover:underline">{c.name}</span>
                        <span className="tnum">{c.open}</span>
                      </span>
                      <span className="mt-1 block h-2.5 border-2 border-ink bg-paper">
                        <span className="block h-full" style={{ width: `${(c.open / max) * 100}%`, background: c.color }} />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5 sm:p-6">
          <h2 className="sign border-b-2 border-ink pb-3 text-3xl">Les plus anciens encore ouverts</h2>
          <ul className="divide-y-2 divide-line">
            {s.oldestOpen.map((r) => (
              <li key={r.id}>
                <Link to={`/signalements/${r.id}`} className="flex flex-wrap items-center gap-3 py-3 hover:bg-signal">
                  <span className="size-3 shrink-0 border-2 border-ink" style={{ background: r.category.color }} />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{r.title}</span>
                  <StatusBadge status={r.status} />
                  <span className="w-28 text-right text-xs text-muted">{timeAgo(r.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="sign border-b-2 border-ink pb-3 text-3xl">Par statut</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {ALL_STATUSES.map((st) => (
              <li key={st} className="flex items-center justify-between text-sm">
                <span className="sign-wide flex items-center gap-2 text-[12px]" style={{ color: STATUS_COLOR[st] }}>
                  <span className="size-3 rounded-full border-2 border-current" />
                  {STATUS_LABEL[st]}
                </span>
                <span className="tnum font-bold">{s.counts[st]}</span>
              </li>
            ))}
          </ul>
          <h3 className="sign mt-6 border-b-2 border-ink pb-2 text-2xl">Charge des agents</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {s.workload.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span className="font-bold">{a.name}</span>
                <span className="sign-wide tnum bg-ink px-2 py-0.5 text-[11px] text-paper">{a.open} ouvert(s)</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/** Histogramme en SVG : pas de bibliothèque de graphiques pour huit paires de barres. Les barres montent à l'affichage. */
function WeeklyChart({ weeks }: { weeks: AdminStats['weeks'] }) {
  const ref = useRef<SVGSVGElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from('rect', { scaleY: 0, transformOrigin: '50% 100%', duration: 0.9, stagger: 0.04, ease: 'expo.out' });
    },
    { scope: ref, dependencies: [weeks.length] },
  );
  const max = Math.max(1, ...weeks.flatMap((w) => [w.created, w.resolved]));
  const H = 180;
  const W = 560;
  const slot = W / weeks.length;
  const bar = Math.min(20, slot / 3);
  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H + 28}`} className="mt-5 w-full" role="img" aria-label="Signalements reçus et résolus sur huit semaines">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={0} x2={W} y1={H - f * H} y2={H - f * H} stroke="var(--color-line)" strokeWidth={1} />
      ))}
      <line x1={0} x2={W} y1={H} y2={H} stroke="var(--color-ink)" strokeWidth={3} />
      {weeks.map((w, i) => {
        const x = i * slot + slot / 2;
        const hc = (w.created / max) * H;
        const hr = (w.resolved / max) * H;
        const label = new Date(w.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        return (
          <g key={w.start}>
            <rect x={x - bar - 2} y={H - hc} width={bar} height={hc} fill="var(--color-st-new)">
              <title>{`Semaine du ${label} : ${w.created} reçu(s)`}</title>
            </rect>
            <rect x={x + 2} y={H - hr} width={bar} height={hr} fill="var(--color-st-resolved)">
              <title>{`Semaine du ${label} : ${w.resolved} résolu(s)`}</title>
            </rect>
            <text x={x} y={H + 20} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-ink)">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
