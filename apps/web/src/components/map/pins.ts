import L from 'leaflet';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CategoryIcon } from '@/components/ui/primitives';

const cache = new Map<string, L.DivIcon>();

/**
 * Épingle d'un signalement : couleur et icône de sa catégorie. Les
 * signalements clos sont estompés. Les icônes sont mises en cache : une
 * carte de 500 points n'en crée qu'une douzaine.
 */
export function pinIcon(icon: string, color: string, options: { closed?: boolean; active?: boolean } = {}) {
  const key = `${icon}|${color}|${options.closed ? 1 : 0}|${options.active ? 1 : 0}`;
  let divIcon = cache.get(key);
  if (!divIcon) {
    const svg = renderToStaticMarkup(createElement(CategoryIcon, { icon }));
    divIcon = L.divIcon({
      className: `fmc-pin${options.closed ? ' is-closed' : ''}${options.active ? ' is-active' : ''}`,
      html: `<span style="background:${color}">${svg}</span>`,
      iconSize: [32, 32],
      iconAnchor: [4, 30],
      popupAnchor: [12, -28],
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
