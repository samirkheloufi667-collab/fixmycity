import type { Map as LeafletMap } from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { Button } from '@/components/ui/primitives';
import type { Category, City } from '@/lib/types';
import { pinIcon, TILE_ATTRIBUTION, TILE_URL } from './pins';

export interface Position {
  latitude: number;
  longitude: number;
}

const EARTH = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;
export function distanceMeters(a: Position, b: Position) {
  const h =
    Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 2 * EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

function ClickToPlace({ onPick }: { onPick: (p: Position) => void }) {
  useMapEvents({ click: (e) => onPick({ latitude: e.latlng.lat, longitude: e.latlng.lng }) });
  return null;
}

/**
 * Choix du lieu : un clic ou un appui sur la carte place l'épingle, qu'on
 * peut ensuite faire glisser. « Me localiser » utilise le GPS du téléphone.
 */
export function LocationPicker({
  city,
  value,
  onChange,
  category,
}: {
  city: City;
  value: Position | null;
  onChange: (p: Position) => void;
  category?: Category;
}) {
  const mapRef = useRef<LeafletMap | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const outside = value ? distanceMeters(city, value) > city.radiusMeters : false;

  // La carte peut être montée pendant une animation : on recalcule sa taille une fois posée.
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 450);
    return () => clearTimeout(t);
  }, []);

  const icon = useMemo(() => pinIcon(category ?? { name: '!!', color: '#ffd400' }, { active: true }), [category]);

  function locate() {
    if (!navigator.geolocation) {
      setGeoError('La géolocalisation n’est pas disponible sur cet appareil.');
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        onChange(p);
        mapRef.current?.flyTo([p.latitude, p.longitude], 18, { duration: 0.6 });
        setLocating(false);
      },
      () => {
        setGeoError('Position introuvable. Autorisez la localisation ou placez l’épingle à la main.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[340px] overflow-hidden border-2 border-ink sm:h-[420px]">
        <MapContainer
          ref={mapRef}
          center={value ? [value.latitude, value.longitude] : [city.latitude, city.longitude]}
          zoom={value ? 17 : city.zoom}
          minZoom={13}
          className="size-full cursor-crosshair"
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          <Circle
            center={[city.latitude, city.longitude]}
            radius={city.radiusMeters}
            pathOptions={{ color: '#0e0e0e', weight: 2, dashArray: '2 8', fillOpacity: 0 }}
            interactive={false}
          />
          <ClickToPlace onPick={onChange} />
          {value && (
            <Marker
              position={[value.latitude, value.longitude]}
              icon={icon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = e.target.getLatLng();
                  onChange({ latitude: ll.lat, longitude: ll.lng });
                },
              }}
            />
          )}
        </MapContainer>
        {!value && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center px-3">
            <span className="sign-wide bg-signal px-3 py-1.5 text-[12px] text-ink border-2 border-ink">
              Touchez la carte à l’endroit du problème
            </span>
          </div>
        )}
        <div className="absolute right-3 bottom-3 z-[500]">
          <Button variant="secondary" size="sm" onClick={locate} loading={locating}>
            ◎ Me localiser
          </Button>
        </div>
      </div>
      {geoError && <p className="text-sm text-danger">{geoError}</p>}
      {outside && (
        <p className="border-l-4 border-danger pl-3 text-sm font-bold text-danger">
          Ce point est hors du territoire de {city.name} (cercle en pointillés) : la ville ne pourra pas intervenir.
        </p>
      )}
    </div>
  );
}
