/**
 * Geocodificación inversa OPCIONAL.
 *
 * El backend `servidor-trackar` NO expone ningún servicio de geocodificación:
 * solo guarda `latitude`/`longitude`. Por tanto:
 *
 *   - Por defecto la interfaz muestra las COORDENADAS (requisito 15).
 *   - Si el usuario activa "Geocodificación inversa" en /configuracion, se
 *     consulta el proveedor público de Nominatim (OpenStreetMap) con cache en
 *     memoria y una única petición en vuelo, para no generar cientos de
 *     solicitudes.
 *   - Si en el futuro el backend ofrece un endpoint de geocodificación, basta
 *     con reemplazar `reverseGeocode` por una llamada a `apiClient`.
 */

import { GEOCODE_CACHE_TTL_MS } from './constants';

const ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const CACHE_PRECISION = 3; // ~110 m: evita una petición por cada micro-variación.

interface CacheEntry {
  value: string | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
let inFlight: Promise<string | null> | null = null;

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(CACHE_PRECISION)},${lng.toFixed(CACHE_PRECISION)}`;
}

/** Devuelve la dirección cacheada, sin lanzar peticiones. */
export function peekCachedAddress(lat: number, lng: number): string | null | undefined {
  const entry = cache.get(cacheKey(lat, lng));
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(cacheKey(lat, lng));
    return undefined;
  }
  return entry.value;
}

/**
 * Resuelve una dirección aproximada. Devuelve `null` si falla o no hay datos.
 * Respeta una petición por segundo (política de uso de Nominatim).
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = cacheKey(lat, lng);
  const cached = peekCachedAddress(lat, lng);
  if (cached !== undefined) return cached;

  if (inFlight) {
    await inFlight.catch(() => undefined);
  }

  const request = (async (): Promise<string | null> => {
    try {
      const url = `${ENDPOINT}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=0`;
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) return null;
      const data = (await response.json()) as { display_name?: string };
      const value = typeof data.display_name === 'string' ? data.display_name : null;
      cache.set(key, { value, expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS });
      return value;
    } catch {
      cache.set(key, { value: null, expiresAt: Date.now() + 60_000 });
      return null;
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      inFlight = null;
    }
  })();

  inFlight = request;
  return request;
}

/** Limpia la cache de direcciones. */
export function clearGeocodeCache(): void {
  cache.clear();
}
