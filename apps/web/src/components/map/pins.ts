import L from 'leaflet';
import { categoryCode, inkOn } from '@/lib/format';

const cache = new Map<string, L.DivIcon>();

/**
 * Épingle d'un signalement : une petite plaque à la couleur de sa catégorie,
 * avec son code de deux lettres, posée sur un mât. Les signalements clos sont
 * estompés. Les icônes sont mises en cache : une carte de 500 points n'en crée
 * qu'une douzaine.
 */
export function pinIcon(category: { slug?: string; name: string; color: string }, options: { closed?: boolean; active?: boolean } = {}) {
  const code = categoryCode(category);
  const key = `${code}|${category.color}|${options.closed ? 1 : 0}|${options.active ? 1 : 0}`;
  let divIcon = cache.get(key);
  if (!divIcon) {
    divIcon = L.divIcon({
      className: `fmc-pin${options.closed ? ' is-closed' : ''}${options.active ? ' is-active' : ''}`,
      html: `<span style="background:${category.color};color:${inkOn(category.color)}">${code}</span>`,
      iconSize: [30, 35],
      iconAnchor: [15, 35],
      popupAnchor: [0, -34],
    });
    cache.set(key, divIcon);
  }
  return divIcon;
}

/**
 * Fond de carte OpenStreetMap : libre, sans clé d'API. Usage modéré et
 * attribution obligatoires (https://operations.osmfoundation.org/policies/tiles/).
 * En production, on passerait par un fournisseur de tuiles ou un serveur dédié.
 */
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a>';
