import type { LatLngBounds } from 'leaflet';
import { List, Map as MapIcon, Plus, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ReportsMap } from '@/components/map/ReportsMap';
import { buttonClass, CategoryIcon, ErrorNote, Spinner, StatusBadge } from '@/components/ui/primitives';
import { api, errorMessage } from '@/lib/api';
import { cx, OPEN_STATUSES, plural, timeAgo } from '@/lib/format';
import { useReference } from '@/lib/reference';
import type { MapPoint } from '@/lib/types';

type Scope = 'open' | 'resolved' | 'all';
const SCOPES: { value: Scope; label: string }[] = [
  { value: 'open', label: 'En cours' },
  { value: 'resolved', label: 'Résolus' },
  { value: 'all', label: 'Tous' },
];

export default function MapPage() {
  const { city, categories } = useReference();
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bbox, setBbox] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>('open');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<{ latitude: number; longitude: number; key: number } | null>(null);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');
  const listRef = useRef<HTMLUListElement>(null);

  // Arrondi : de petits déplacements ne relancent pas une requête identique.
  const onBoundsChange = useCallback((b: LatLngBounds) => {
    const r = (n: number) => n.toFixed(4);
    setBbox(`${r(b.getWest())},${r(b.getSouth())},${r(b.getEast())},${r(b.getNorth())}`);
  }, []);

  useEffect(() => {
    if (!bbox) return;
    const statuses = scope === 'open' ? OPEN_STATUSES.join(',') : scope === 'resolved' ? 'RESOLVED' : '';
    const params = new URLSearchParams({ bbox });
    if (statuses) params.set('status', statuses);
    if (selectedCategories.length) params.set('category', selectedCategories.join(','));
    // Petite attente : pendant qu'on fait glisser la carte, une seule requête part à la fin.
    const timer = setTimeout(async () => {
      try {
        setPoints(await api<MapPoint[]>(`/reports/map?${params}`));
        setError(null);
      } catch (e) {
        setError(errorMessage(e));
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [bbox, scope, selectedCategories]);

  useEffect(() => {
    if (!selectedId) return;
    listRef.current?.querySelector(`[data-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  const toggleCategory = (slug: string) =>
    setSelectedCategories((list) => (list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]));

  const counts = useMemo(() => {
    const byCategory = new Map<string, number>();
    points.forEach((p) => byCategory.set(p.category.slug, (byCategory.get(p.category.slug) ?? 0) + 1));
    return byCategory;
  }, [points]);

  if (!city) return <Spinner label="Chargement de la carte…" />;

  const filters = (
    <div className="flex flex-col gap-3">
      <div className="inline-flex rounded-xl bg-paper-2 p-1" role="radiogroup" aria-label="Statut">
        {SCOPES.map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={scope === s.value}
            onClick={() => setScope(s.value)}
            className={cx(
              'flex-1 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors',
              scope === s.value ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => {
          const active = selectedCategories.includes(c.slug);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCategory(c.slug)}
              aria-pressed={active}
              className={cx(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors',
                active ? 'border-transparent text-white' : 'border-line-strong bg-card text-ink hover:border-ink/30',
              )}
              style={active ? { background: c.color } : undefined}
            >
              <CategoryIcon icon={c.icon} className="size-3.5" style={active ? undefined : { color: c.color }} />
              {c.name}
              {!active && counts.get(c.slug) ? <span className="text-faint">{counts.get(c.slug)}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );

  const list = (
    <ul ref={listRef} className="flex flex-col gap-2">
      {points.length === 0 && (
        <li className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
          Aucun signalement dans cette zone avec ces filtres.
        </li>
      )}
      {points.map((p) => (
        <li key={p.id} data-id={p.id}>
          <button
            type="button"
            onClick={() => {
              setSelectedId(p.id);
              setFlyTo({ latitude: p.latitude, longitude: p.longitude, key: Date.now() });
              setMobileView('map');
            }}
            className={cx(
              'flex w-full gap-3 rounded-2xl border p-3 text-left transition-colors',
              p.id === selectedId ? 'border-brand bg-brand-soft/50' : 'border-line bg-card hover:border-line-strong',
            )}
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: p.category.color }}>
              <CategoryIcon icon={p.category.icon} className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-sm font-semibold leading-snug">{p.title}</span>
              <span className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={p.status} />
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Users className="size-3" /> {p.supportCount}
                </span>
                <span className="text-xs text-faint">{timeAgo(p.createdAt)}</span>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex h-full">
      <aside
        className={cx(
          'flex w-full flex-col border-r border-line bg-paper lg:flex lg:w-[400px] lg:shrink-0',
          mobileView === 'list' ? 'flex' : 'hidden',
        )}
      >
        <div className="border-b border-line p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h1 className="font-display text-xl font-bold">Signalements</h1>
            <span className="text-sm text-muted">{plural(points.length, 'dans la zone', 'dans la zone')}</span>
          </div>
          {filters}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error && <ErrorNote>{error}</ErrorNote>}
          {list}
        </div>
      </aside>

      <div className={cx('relative min-w-0 flex-1', mobileView === 'map' ? 'block' : 'hidden lg:block')}>
        <ReportsMap
          city={city}
          points={points}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onBoundsChange={onBoundsChange}
          flyTo={flyTo}
        />
        {/* Filtres flottants sur mobile, au-dessus de la carte. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-3 lg:hidden">
          <div className="pointer-events-auto rounded-2xl border border-line bg-card/95 p-2.5 shadow-card backdrop-blur">{filters}</div>
        </div>
        <Link
          to="/signaler"
          className={buttonClass('accent', 'lg', 'absolute right-4 bottom-20 z-[500] shadow-xl sm:hidden lg:bottom-6 lg:inline-flex')}
        >
          <Plus className="size-4" /> Signaler ici
        </Link>
      </div>

      {/* Bascule carte / liste sur mobile. */}
      <button
        type="button"
        onClick={() => setMobileView((v) => (v === 'map' ? 'list' : 'map'))}
        className="fixed bottom-5 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-xl lg:hidden"
      >
        {mobileView === 'map' ? (
          <>
            <List className="size-4" /> Liste ({points.length})
          </>
        ) : (
          <>
            <MapIcon className="size-4" /> Carte
          </>
        )}
      </button>
    </div>
  );
}
