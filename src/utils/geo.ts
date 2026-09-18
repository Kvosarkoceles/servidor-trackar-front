/** Utilidades geográficas (sin dependencias de Leaflet). */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371.0088;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Distancia en kilómetros entre dos puntos (fórmula de Haversine).
 * Precisión suficiente para telemetría vehicular.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rumbo en grados entre dos puntos (0 = norte). */
export function bearingBetween(a: LatLng, b: LatLng): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const dLng = toRadians(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** Bounding box de un conjunto de puntos, o `null` si está vacío. */
export function boundsOf(points: LatLng[]): { minLat: number; minLng: number; maxLat: number; maxLng: number } | null {
  if (points.length === 0) return null;

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  for (const point of points) {
    if (point.lat < minLat) minLat = point.lat;
    if (point.lat > maxLat) maxLat = point.lat;
    if (point.lng < minLng) minLng = point.lng;
    if (point.lng > maxLng) maxLng = point.lng;
  }

  return { minLat, minLng, maxLat, maxLng };
}

/**
 * Puntos representativos de una geocerca para encuadrar el mapa.
 *
 * Círculo → su centro · Polígono → sus vértices. Devuelve `[]` si la zona no
 * trae la geometría esperada (p. ej. un círculo sin `center`).
 */
export function geofencePoints(geofence: {
  type: string;
  center?: LatLng | null;
  points?: LatLng[] | null;
}): LatLng[] {
  if (geofence.type === 'circle' && geofence.center) {
    return [geofence.center];
  }
  if (geofence.type === 'polygon' && Array.isArray(geofence.points)) {
    return geofence.points;
  }
  return [];
}

/** Comprueba que unas coordenadas son válidas y no nulas. */
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}
