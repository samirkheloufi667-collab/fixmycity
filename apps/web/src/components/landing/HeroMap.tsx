import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { pinIcon, TILE_ATTRIBUTION, TILE_URL } from '@/components/map/pins';
import { gsap, prefersReducedMotion } from '@/components/motion/gsap';
import { api } from '@/lib/api';
import { OPEN_STATUSES } from '@/lib/format';
import type { City, MapPoint } from '@/lib/types';

/**
 * Fond de l'accueil : la vraie carte de la ville, figée, en noir et blanc.
 * Les signalements ouverts y tombent un à un comme des panneaux qu'on plante.
 */
export function HeroMap({ city }: { city: City }) {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<MapPoint[]>(`/reports/map?status=${OPEN_STATUSES.join(',')}`)
      .then((list) => setPoints(list.slice(0, 80)))
      .catch(() => setPoints([]));
  }, []);

  useEffect(() => {
    if (!points.length || !box.current || prefersReducedMotion()) return;
    // Les marqueurs sont ajoutés par Leaflet juste après le rendu : on attend une image.
    const id = requestAnimationFrame(() => {
      const pins = box.current?.querySelectorAll('.fmc-pin > span');
      if (pins?.length) gsap.from(pins, { y: -40, opacity: 0, duration: 0.7, ease: 'bounce.out', stagger: { each: 0.035, from: 'random' }, delay: 0.6 });
    });
    return () => cancelAnimationFrame(id);
  }, [points]);

  // « isolate » : les calques de Leaflet (z-index 400 et plus) restent sous le contenu de la page.
  return (
    <div ref={box} className="absolute inset-0 isolate z-0" aria-hidden>
      <MapContainer
        center={[city.latitude, city.longitude]}
        zoom={city.zoom + 0.4}
        zoomSnap={0.1}
        className="size-full"
        zoomControl={false}
        attributionControl
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
        boxZoom={false}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {points.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]} icon={pinIcon(p.category)} interactive={false} />
        ))}
      </MapContainer>
    </div>
  );
}
