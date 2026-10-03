import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button, CategoryMark, EmptyState, ErrorNote, Input, PageHeader, Select, Spinner, StatusBadge } from '@/components/ui/primitives';
import { cx, OPEN_STATUSES, STATUS_COLOR, STATUS_LABEL, timeAgo } from '@/lib/format';
import { useReference } from '@/lib/reference';
import type { Agent, Page, QueueItem, ReportStatus } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { useAuth } from '@/lib/auth';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: OPEN_STATUSES.join(','), label: 'Ouverts' },
  ...(['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as ReportStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] })),
];

/**
 * File de traitement. Les filtres vivent dans l'adresse (?status=…&assignee=…) :
 * une vue filtrée se partage par lien et survit au rechargement.
 */
export default function Queue() {
  const { me } = useAuth();
  const { categories } = useReference();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const agents = useApi<Agent[]>('/admin/agents');

  const status = params.get('status') ?? OPEN_STATUSES.join(',');
  const assignee = params.get('assignee') ?? '';
  const category = params.get('category') ?? '';
  const sort = params.get('sort') ?? 'oldest';
  const page = Number(params.get('page') ?? 1);

  const query = new URLSearchParams({ status, sort, page: String(page), pageSize: '15' });
  if (assignee) query.set('assignee', assignee);
  if (category) query.set('category', category);
  if (params.get('q')) query.set('q', params.get('q')!);
  const queue = useApi<Page<QueueItem>>(`/admin/queue?${query}`);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  // Recherche : on attend la fin de la frappe.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') ?? '') !== search) update({ q: search });
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="File de traitement" subtitle="Du plus ancien au plus récent par défaut : personne n’attend indéfiniment." />

      <div className="flex flex-col gap-3">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => update({ status: f.value })}
              aria-pressed={status === f.value}
              className={cx('sign-wide shrink-0 border-2 border-ink px-3.5 py-1.5 text-[12px] transition-colors', status === f.value ? 'bg-ink text-paper' : 'bg-card hover:bg-paper-2')}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher : titre ou adresse…" aria-label="Rechercher" />
          <Select value={assignee} onChange={(e) => update({ assignee: e.target.value })} aria-label="Responsable">
            <option value="">Tous les responsables</option>
            <option value="me">Moi ({me?.name})</option>
            <option value="none">Non attribués</option>
            {agents.data
              ?.filter((a) => a.id !== me?.id)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </Select>
          <Select value={category} onChange={(e) => update({ category: e.target.value })} aria-label="Catégorie">
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Tri">
            <option value="oldest">Plus anciens d’abord</option>
            <option value="newest">Plus récents d’abord</option>
            <option value="supported">Plus soutenus d’abord</option>
          </Select>
        </div>
      </div>

      {queue.error && <ErrorNote>{queue.error}</ErrorNote>}
      {queue.loading && !queue.data && <Spinner />}
      {queue.data?.items.length === 0 && <EmptyState title="File vide." text="Aucun signalement ne correspond à ces filtres." />}

      {queue.data && queue.data.items.length > 0 && (
        <>
          <ul className="flex flex-col border-t-2 border-ink">
            {queue.data.items.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/signalements/${r.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 border-x-2 border-b-2 border-ink bg-card p-3 transition-colors hover:bg-signal sm:flex-nowrap"
                  style={{ boxShadow: `inset 6px 0 0 ${STATUS_COLOR[r.status]}` }}
                >
                  <CategoryMark category={r.category} size={40} />
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate font-bold">{r.title}</p>
                    <p className="truncate text-[13px] text-muted">
                      {r.category.name}
                      {r.address ? ` · ${r.address}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                  <span className="tnum w-14 text-sm font-bold">{r.supportCount} conc.</span>
                  <span className="w-32 truncate text-sm text-muted">{r.assignee?.name ?? <em className="text-faint">Non attribué</em>}</span>
                  <span className="w-28 text-right text-xs text-faint">{timeAgo(r.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between text-sm text-muted">
            <span>
              {queue.data.total} signalement(s) · page {queue.data.page} / {queue.data.pages}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                ← Précédente
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= queue.data.pages} onClick={() => update({ page: String(page + 1) })}>
                Suivante →
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
