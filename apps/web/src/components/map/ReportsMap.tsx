import type { LatLngBounds, Map as LeafletMap } from 'leaflet';
import { useEffect, useRef } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Link } from 'react-router';
import { StatusBadge } from '@/components/ui/primitives';
import { OPEN_STATUSES, plural } from '@/lib/format';
import type { City, MapPoint } from '@/lib/types';
import { pinIcon, TILE_ATTRIBUTION, TILE_URL } from './pins';

/**
 * Leaflet mesure son conteneur une seule fois. Quand la carte réapparaît
 * (bascule carte/liste sur mobile) ou que la fenêtre change de taille, on
 * lui redemande de se mesurer.
 */
function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

/** Transmet la zone visible au parent à chaque déplacement de la carte. */
function BoundsWatcher({ onChange }: { onChange: (bounds: LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => onChange(map.getBounds()),
    zoomend: () => onChange(map.getBounds()),
  });
  useEffect(() => {
    onChange(map.getBounds());
  }, [map, onChange]);
  return null;
}

export function ReportsMap({
  city,
  points,
  selectedId,
  onSelect,
  onBoundsChange,
  flyTo,
}: {
  city: City;
  points: MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onBoundsChange: (bounds: LatLngBounds) => void;
  /** Point vers lequel centrer la carte (clic dans la liste). */
  flyTo?: { latitude: number; longitude: number; key: number } | null;
}) {
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (flyTo && mapRef.current) {
      mapRef.current.flyTo([flyTo.latitude, flyTo.longitude], Math.max(mapRef.current.getZoom(), 17), { duration: 0.6 });
    }
  }, [flyTo]);

  return (
    <MapContainer
      ref={mapRef}
      center={[city.latitude, city.longitude]}
      zoom={city.zoom}
      minZoom={13}
      className="size-full"
      zoomControl={false}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      {/* Limite du territoire couvert : un signalement hors du cercle est refusé. */}
      <Circle
        center={[city.latitude, city.longitude]}
        radius={city.radiusMeters}
        pathOptions={{ color: '#0e0e0e', weight: 2, dashArray: '2 8', fillOpacity: 0 }}
        interactive={false}
      />
      <BoundsWatcher onChange={onBoundsChange} />
      <AutoResize />
      {points.map((p) => (
        <Marker
          key={p.id}
          position={[p.latitude, p.longitude]}
          icon={pinIcon(p.category, {
            closed: !OPEN_STATUSES.includes(p.status),
            active: p.id === selectedId,
          })}
          eventHandlers={{ click: () => onSelect?.(p.id) }}
          zIndexOffset={p.id === selectedId ? 1000 : 0}
        >
          {/* Marge haute : sur mobile, les filtres flottent au-dessus de la carte. */}
          <Popup autoPanPaddingTopLeft={[16, 200]} autoPanPaddingBottomRight={[16, 90]}>
            <div className="w-56">
              <p className="sign-wide text-[11px]">{p.category.name}</p>
              <p className="mt-1 text-[15px] leading-snug font-bold text-ink">{p.title}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <StatusBadge status={p.status} />
                <span className="tnum text-xs font-bold">{plural(p.supportCount, 'concerné', 'concernés')}</span>
              </div>
              <Link to={`/signalements/${p.id}`} className="sign-wide mt-3 block bg-ink px-3 py-2 text-center text-[12px] !text-paper hover:bg-signal hover:!text-ink">
                Voir le suivi →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
