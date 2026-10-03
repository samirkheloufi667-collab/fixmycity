import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { MiniMap } from '@/components/map/MiniMap';
import { StatusTracker, supportersLabel, Timeline } from '@/components/ReportBits';
import { Modal } from '@/components/ui/modal';
import { Button, buttonClass, Card, CategoryMark, ErrorNote, Field, Select, Spinner, StatusBadge, Textarea } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage, photoUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cx, formatDate, inkOn, isStaff, OPEN_STATUSES, requiresMessage, STATUS_ACTION, STATUS_COLOR, timeAgo, TRANSITIONS } from '@/lib/format';
import type { Agent, ReportDetail, ReportStatus } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function ReportPage() {
  const { id } = useParams();
  const { me } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const report = useApi<ReportDetail>(`/reports/${id}`);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (report.loading && !report.data) return <Spinner />;
  if (report.error || !report.data) {
    return (
      <div className="mx-auto max-w-lg">
        <ErrorNote>{report.error ?? 'Signalement introuvable'}</ErrorNote>
        <Link to="/carte" className={buttonClass('secondary', 'md', 'mt-4')}>
          ← Retour à la carte
        </Link>
      </div>
    );
  }

  const r = report.data;
  const open = OPEN_STATUSES.includes(r.status);
  const canDelete = me && ((r.isMine && r.status === 'NEW') || me.role === 'ADMIN');

  async function toggleSupport() {
    if (!me) {
      navigate(`/connexion?next=/signalements/${r.id}`);
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ supportedByMe: boolean; supportCount: number }>(`/reports/${r.id}/support`, { method: r.supportedByMe ? 'DELETE' : 'POST' });
      report.setData({ ...r, ...res });
      if (res.supportedByMe) toast('success', 'Merci ! Votre soutien aide la ville à prioriser.');
    } catch (e) {
      toast('error', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    try {
      report.setData(await api<ReportDetail>(`/reports/${r.id}/comments`, { method: 'POST', json: { message: comment } }));
      setComment('');
    } catch (err) {
      toast('error', errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    try {
      await api(`/reports/${r.id}`, { method: 'DELETE' });
      toast('success', 'Signalement retiré');
      navigate('/mes-signalements');
    } catch (e) {
      toast('error', errorMessage(e));
    }
  }

  const facts: [string, React.ReactNode][] = [
    ['Signalé par', r.author.name],
    ['Le', `${formatDate(r.createdAt)} (${timeAgo(r.createdAt)})`],
    ...(r.address ? ([['Où', r.address]] as [string, React.ReactNode][]) : []),
    ['Suivi par', r.assignee ? r.assignee.name : <span className="text-faint">pas encore attribué</span>],
  ];

  return (
    <div className="flex flex-col gap-8">
      <Link to="/carte" className="u-link sign-wide w-fit text-[12px] text-muted hover:text-ink">
        ← Carte
      </Link>

      {/* En-tête façon panneau : la plaque de la catégorie, le titre en capitales étroites. */}
      <header className="flex flex-col gap-6 border-b-4 border-ink pb-8 sm:flex-row sm:items-end">
        <CategoryMark category={r.category} size={96} />
        <div className="min-w-0 flex-1">
          <p className="sign-wide inline-block px-2 py-0.5 text-[12px]" style={{ background: r.category.color, color: inkOn(r.category.color) }}>
            {r.category.name}
          </p>
          <h1 className="sign mt-3 text-5xl break-words sm:text-7xl">{r.title}</h1>
        </div>
        <StatusBadge status={r.status} className="text-[13px]" />
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-8">
          <section className="border-2 border-ink bg-card p-5 sm:p-7">
            <StatusTracker status={r.status} />
          </section>

          {r.photo && (
            <figure className="border-2 border-ink">
              <img src={photoUrl(r.photo)} alt={`Photo : ${r.title}`} className="max-h-[460px] w-full bg-paper-2 object-cover" />
            </figure>
          )}

          <section>
            <p className="text-lg leading-relaxed whitespace-pre-line text-ink">{r.description}</p>
            <dl className="mt-6 grid border-t-2 border-ink sm:grid-cols-2">
              {facts.map(([k, v]) => (
                <div key={k} className="border-b-2 border-line py-3 sm:odd:pr-6">
                  <dt className="sign-wide text-[11px] text-muted">{k}</dt>
                  <dd className="mt-0.5 text-[15px] font-bold">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="flex flex-wrap items-center gap-5 border-2 border-ink bg-signal px-5 py-4">
            <p className="sign tnum text-6xl">{r.supportCount}</p>
            <p className="flex-1 text-sm">
              <strong className="block text-base">{supportersLabel(r.supportCount).replace(/^\d+ /, '')}</strong>
              Plus un problème est soutenu, plus il remonte dans la file de la ville.
            </p>
            {open && !r.isMine && (
              <Button variant={r.supportedByMe ? 'secondary' : 'primary'} onClick={toggleSupport} loading={busy}>
                {r.supportedByMe ? '✓ Vous êtes concerné' : 'Moi aussi'}
              </Button>
            )}
          </section>

          <section>
            <h2 className="sign border-b-4 border-ink pb-3 text-4xl">Suivi</h2>
            <div className="mt-6">
              <Timeline events={r.events} />
            </div>
            {me ? (
              <form onSubmit={sendComment} className="mt-8 flex flex-col gap-3 border-t-2 border-ink pt-6">
                <Field label="Ajouter une précision" htmlFor="comment">
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={1000}
                    placeholder="Le problème s’est aggravé, il a été réparé, une autre information utile…"
                    className="min-h-20"
                  />
                </Field>
                <Button type="submit" className="self-start" loading={busy} disabled={!comment.trim()}>
                  Publier
                </Button>
              </form>
            ) : (
              <p className="mt-8 border-t-2 border-ink pt-6 text-sm text-muted">
                <Link to={`/connexion?next=/signalements/${r.id}`} className="u-link font-bold text-ink">
                  Connectez-vous
                </Link>{' '}
                pour commenter ou soutenir ce signalement.
              </p>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <Card className="overflow-hidden">
            <div className="h-60 border-b-2 border-ink">
              <MiniMap latitude={r.latitude} longitude={r.longitude} category={r.category} />
            </div>
            <a
              href={`https://www.openstreetmap.org/?mlat=${r.latitude}&mlon=${r.longitude}#map=19/${r.latitude}/${r.longitude}`}
              target="_blank"
              rel="noopener"
              className="sign-wide block px-4 py-3 text-[12px] hover:bg-signal"
            >
              Ouvrir dans OpenStreetMap ↗
            </a>
          </Card>

          {isStaff(me?.role) && <StaffPanel report={r} onUpdated={(d) => report.setData(d)} />}

          {canDelete && (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Retirer ce signalement
            </Button>
          )}
        </aside>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Retirer ce signalement ?">
        <p className="text-sm text-muted">Il disparaîtra de la carte, avec son historique et sa photo. Cette action est définitive.</p>
        <div className="mt-6 flex gap-2">
          <Button variant="danger" onClick={remove}>
            Retirer
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Annuler
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/** Panneau des agents et administrateurs : faire avancer le signalement, l'attribuer. */
function StaffPanel({ report: r, onUpdated }: { report: ReportDetail; onUpdated: (r: ReportDetail) => void }) {
  const { me } = useAuth();
  const toast = useToast();
  const agents = useApi<Agent[]>(me?.role === 'ADMIN' ? '/admin/agents' : null);
  const [target, setTarget] = useState<ReportStatus | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lockedByOther = me?.role === 'AGENT' && r.assignee && r.assignee.id !== me.id;

  async function changeStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      onUpdated(await api<ReportDetail>(`/reports/${r.id}/status`, { method: 'PATCH', json: { status: target, message: message || undefined } }));
      toast('success', 'Statut mis à jour — l’habitant le voit immédiatement.');
      setTarget(null);
      setMessage('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function assign(assigneeId: string) {
    try {
      onUpdated(await api<ReportDetail>(`/reports/${r.id}/assignee`, { method: 'PATCH', json: { assigneeId: assigneeId || null } }));
      toast('success', 'Attribution mise à jour');
    } catch (err) {
      toast('error', errorMessage(err));
    }
  }

  return (
    <Card>
      <p className="sign-wide bg-ink px-4 py-1.5 text-[11px] text-paper">Espace ville</p>
      <div className="p-5">
        <h2 className="sign text-3xl">Traiter</h2>

        {lockedByOther ? (
          <p className="mt-3 text-sm text-muted">Ce signalement est suivi par {r.assignee!.name}. Seul l’agent attribué ou un administrateur peut le faire avancer.</p>
        ) : (
          <form onSubmit={changeStatus} className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col border-t-2 border-ink">
              {TRANSITIONS[r.status].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTarget(target === s ? null : s)}
                  className={cx('flex items-center gap-3 border-x-2 border-b-2 border-ink px-3.5 py-2.5 text-left text-sm font-bold transition-colors', target === s ? 'text-white' : 'bg-card hover:bg-paper-2')}
                  style={target === s ? { background: STATUS_COLOR[s] } : undefined}
                  aria-pressed={target === s}
                >
                  <span className="size-3 rounded-full border-2 border-current" style={{ background: target === s ? '#fff' : STATUS_COLOR[s] }} />
                  {STATUS_ACTION[s]} →
                </button>
              ))}
            </div>
            {target && (
              <>
                <Field label={requiresMessage(target) ? 'Message à l’habitant (obligatoire)' : 'Message à l’habitant (facultatif)'} htmlFor="staff-message">
                  <Textarea
                    id="staff-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={500}
                    required={requiresMessage(target)}
                    placeholder={target === 'REJECTED' ? 'Expliquez pourquoi…' : target === 'RESOLVED' ? 'Ce qui a été fait…' : 'Prochaine étape, délai prévu…'}
                    className="min-h-20"
                  />
                </Field>
                {error && <ErrorNote>{error}</ErrorNote>}
                <Button type="submit" loading={busy}>
                  Confirmer
                </Button>
              </>
            )}
            {!r.assignee && me?.role === 'AGENT' && <p className="text-xs text-muted">En faisant avancer ce signalement, vous en devenez responsable.</p>}
          </form>
        )}

        {me?.role === 'ADMIN' && (
          <div className="mt-5 border-t-2 border-ink pt-4">
            <Field label="Agent responsable" htmlFor="assignee">
              <Select id="assignee" value={r.assignee?.id ?? ''} onChange={(e) => assign(e.target.value)}>
                <option value="">Non attribué</option>
                {agents.data?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
      </div>
    </Card>
  );
}
