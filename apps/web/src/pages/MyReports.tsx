import { Link, Navigate } from 'react-router';
import { ReportCard } from '@/components/ReportBits';
import { buttonClass, EmptyState, ErrorNote, PageHeader, Spinner } from '@/components/ui/primitives';
import { useAuth } from '@/lib/auth';
import { OPEN_STATUSES } from '@/lib/format';
import type { ReportSummary } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function MyReports() {
  const { status, me } = useAuth();
  const mine = useApi<{ created: ReportSummary[]; supported: ReportSummary[] }>(me ? '/reports/mine' : null);

  if (status === 'anonymous') return <Navigate to="/connexion?next=/mes-signalements" replace />;
  if (!me || (mine.loading && !mine.data)) return <Spinner />;

  const created = mine.data?.created ?? [];
  const supported = mine.data?.supported ?? [];
  const open = created.filter((r) => OPEN_STATUSES.includes(r.status)).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={`Bonjour ${me.name.split(' ')[0]}`}
        title="Mes signalements"
        subtitle={created.length ? `${created.length} envoyé(s), dont ${open} en cours de traitement.` : undefined}
        actions={
          <Link to="/signaler" className={buttonClass('accent')}>
            Nouveau signalement ↗
          </Link>
        }
      />
      {mine.error && <ErrorNote>{mine.error}</ErrorNote>}

      {created.length === 0 ? (
        <EmptyState
                    title="Rien de signalé pour l’instant."
          text="Un trottoir abîmé, un lampadaire éteint ? Signalez-le : vous suivrez ici chaque étape de sa résolution."
          action={
            <Link to="/signaler" className={buttonClass('accent')}>
              Signaler un problème
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {created.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}

      {supported.length > 0 && (
        <section>
          <h2 className="sign border-b-4 border-ink pb-3 text-4xl">Signalements que je soutiens</h2>
          <p className="mt-1 text-sm text-muted">Vous avez indiqué être concerné par ces problèmes.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {supported.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
