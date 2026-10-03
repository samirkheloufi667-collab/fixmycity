import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { pinIcon, TILE_ATTRIBUTION, TILE_URL } from './pins';

/** Petite carte fixe qui situe un signalement sur sa fiche. */
export function MiniMap({ latitude, longitude, category }: { latitude: number; longitude: number; category: { slug?: string; name: string; color: string } }) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={17}
      className="size-full"
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      keyboard={false}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <Marker position={[latitude, longitude]} icon={pinIcon(category, { active: true })} interactive={false} />
    </MapContainer>
  );
}
