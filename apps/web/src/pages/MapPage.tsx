import type { LatLngBounds } from 'leaflet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ReportsMap } from '@/components/map/ReportsMap';
import { buttonClass, CategoryMark, ErrorNote, Spinner, StatusBadge } from '@/components/ui/primitives';
import { api, errorMessage } from '@/lib/api';
import { categoryCode, cx, inkOn, OPEN_STATUSES, timeAgo } from '@/lib/format';
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

  const toggleCategory = (slug: string) => setSelectedCategories((list) => (list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]));

  const counts = useMemo(() => {
    const byCategory = new Map<string, number>();
    points.forEach((p) => byCategory.set(p.category.slug, (byCategory.get(p.category.slug) ?? 0) + 1));
    return byCategory;
  }, [points]);

  if (!city) return <Spinner label="Chargement de la carte" />;

  const filters = (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 border-2 border-ink" role="radiogroup" aria-label="Statut">
        {SCOPES.map((s, i) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={scope === s.value}
            onClick={() => setScope(s.value)}
            className={cx('sign-wide py-1.5 text-[12px] transition-colors', i > 0 && 'border-l-2 border-ink', scope === s.value ? 'bg-ink text-paper' : 'bg-card hover:bg-paper-2')}
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
              className={cx('flex shrink-0 items-center border-2 border-ink text-[12px] font-bold transition-colors', active ? '' : 'bg-card hover:bg-paper-2')}
              style={active ? { background: c.color, color: inkOn(c.color) } : undefined}
            >
              <span className="flex h-7 w-8 items-center justify-center border-r-2 border-ink font-extrabold [font-stretch:70%]" style={{ background: c.color, color: inkOn(c.color) }}>
                {categoryCode(c)}
              </span>
              <span className="px-2">{c.name}</span>
              {counts.get(c.slug) ? <span className="tnum pr-2 opacity-60">{counts.get(c.slug)}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );

  const list = (
    <ul ref={listRef} className="flex flex-col">
      {points.length === 0 && <li className="border-2 border-dashed border-ink px-4 py-8 text-center text-sm text-muted">Aucun signalement dans cette zone avec ces filtres.</li>}
      {points.map((p) => (
        <li key={p.id} data-id={p.id} className="border-b-2 border-ink first:border-t-2">
          <button
            type="button"
            onClick={() => {
              setSelectedId(p.id);
              setFlyTo({ latitude: p.latitude, longitude: p.longitude, key: Date.now() });
              setMobileView('map');
            }}
            className={cx('flex w-full gap-3 px-3 py-3 text-left transition-colors', p.id === selectedId ? 'bg-signal' : 'bg-card hover:bg-paper-2')}
          >
            <CategoryMark category={p.category} size={36} />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-sm leading-snug font-bold">{p.title}</span>
              <span className="mt-1.5 flex flex-wrap items-center gap-3">
                <StatusBadge status={p.status} />
                <span className="tnum text-xs font-bold">{p.supportCount} conc.</span>
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
      <aside className={cx('flex w-full flex-col border-r-4 border-ink bg-paper lg:flex lg:w-[420px] lg:shrink-0', mobileView === 'list' ? 'flex' : 'hidden')}>
        <div className="border-b-4 border-ink p-4">
          <div className="mb-4 flex items-end justify-between">
            <h1 className="sign text-5xl">Signalements</h1>
            <span className="sign-wide tnum bg-ink px-2 py-0.5 text-[13px] text-paper">{points.length}</span>
          </div>
          {filters}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error && <ErrorNote>{error}</ErrorNote>}
          {list}
        </div>
      </aside>

      <div className={cx('relative min-w-0 flex-1', mobileView === 'map' ? 'block' : 'hidden lg:block')}>
        <ReportsMap city={city} points={points} selectedId={selectedId} onSelect={setSelectedId} onBoundsChange={onBoundsChange} flyTo={flyTo} />
        {/* Filtres flottants sur mobile, au-dessus de la carte. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-3 lg:hidden">
          <div className="pointer-events-auto border-2 border-ink bg-paper p-2.5">{filters}</div>
        </div>
        <Link to="/signaler" className={buttonClass('accent', 'lg', 'absolute right-4 bottom-20 z-[500] sm:hidden lg:bottom-6 lg:inline-flex')}>
          Signaler ici ↗
        </Link>
      </div>

      {/* Bascule carte / liste sur mobile. */}
      <button
        type="button"
        onClick={() => setMobileView((v) => (v === 'map' ? 'list' : 'map'))}
        className="sign-wide fixed bottom-5 left-1/2 z-[1000] -translate-x-1/2 border-2 border-ink bg-ink px-5 py-3 text-[13px] text-paper lg:hidden"
      >
        {mobileView === 'map' ? `Liste (${points.length})` : 'Carte'}
      </button>
    </div>
  );
}
