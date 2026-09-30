/** Outils géographiques, sans dépendance : les distances en jeu font quelques kilomètres au plus. */

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export interface Point {
  latitude: number;
  longitude: number;
}

export interface BBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/** Distance à vol d'oiseau entre deux points, en mètres (formule de haversine). */
export function haversineMeters(a: Point, b: Point): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Rectangle qui contient le cercle de rayon `meters` autour d'un point.
 * Il sert de premier filtre en base (utilise l'index latitude/longitude) ;
 * la distance exacte est ensuite calculée sur les quelques candidats restants.
 */
export function boundingBox(center: Point, meters: number): BBox {
  const dLat = (meters / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLng = dLat / Math.max(Math.cos(toRad(center.latitude)), 1e-6);
  return {
    minLat: center.latitude - dLat,
    maxLat: center.latitude + dLat,
    minLng: center.longitude - dLng,
    maxLng: center.longitude + dLng,
  };
}

/** Lit « minLng,minLat,maxLng,maxLat » (ordre de Leaflet `toBBoxString`). Renvoie null si invalide. */
export function parseBbox(raw: string | undefined): BBox | null {
  if (!raw) return null;
  const parts = raw.split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minLng, minLat, maxLng, maxLat] = parts;
  if (minLat > maxLat || minLng > maxLng) return null;
  if (minLat < -90 || maxLat > 90 || minLng < -180 || maxLng > 180) return null;
  return { minLat, minLng, maxLat, maxLng };
}
