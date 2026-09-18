/**
 * Proveedores de mosaicos (tiles) del mapa.
 *
 * Se usa Leaflet + OpenStreetMap por defecto (requisito 17). No requiere clave
 * de API. `VITE_MAP_PROVIDER` permite cambiar el estilo por defecto y el
 * usuario puede cambiarlo en /configuracion.
 */

import type { MapProviderId } from '@/stores/settingsStore';

export interface TileProvider {
  id: MapProviderId;
  label: string;
  url: string;
  attribution: string;
  maxZoom: number;
  /** Si el fondo es oscuro, los controles y textos se adaptan. */
  dark: boolean;
}

export const TILE_PROVIDERS: Record<MapProviderId, TileProvider> = {
  openstreetmap: {
    id: 'openstreetmap',
    label: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
    dark: false,
  },
  opentopomap: {
    id: 'opentopomap',
    label: 'OpenTopoMap (relieve)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | Map style: &copy; OpenTopoMap',
    maxZoom: 17,
    dark: false,
  },
  'carto-dark': {
    id: 'carto-dark',
    label: 'Carto Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    dark: true,
  },
};

/** Lista para el selector de capas. */
export const TILE_PROVIDER_LIST: TileProvider[] = Object.values(TILE_PROVIDERS);

/** Normaliza un valor desconocido a un proveedor válido. */
export function resolveProvider(id: string | undefined): TileProvider {
  if (id && id in TILE_PROVIDERS) return TILE_PROVIDERS[id as MapProviderId];
  return TILE_PROVIDERS.openstreetmap;
}
