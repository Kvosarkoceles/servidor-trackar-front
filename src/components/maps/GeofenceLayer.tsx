import { Circle, Polygon, Tooltip } from 'react-leaflet';

/**
 * Capa de geocercas.
 *
 * ⚠ El backend `servidor-trackar` NO soporta geocercas: no hay tabla ni
 * endpoint (`GET /api/geofences`). Este componente deja la capa LISTA para
 * cuando exista, sin inventar datos (requisito 16/35).
 *
 * Contrato propuesto para el backend:
 *   GET /api/geofences
 *   -> { success: true, geofences: [{ id, name, type: 'circle'|'polygon',
 *        center?: {lat,lng}, radiusMeters?: number,
 *        points?: [{lat,lng}], color?: string }] }
 */

export interface Geofence {
  id: string;
  name: string;
  type: 'circle' | 'polygon';
  center?: { lat: number; lng: number };
  radiusMeters?: number;
  points?: Array<{ lat: number; lng: number }>;
  color?: string;
}

export const GEOFENCES_ENDPOINT_CONTRACT = {
  method: 'GET',
  path: '/api/geofences',
  auth: 'API Key (Bearer o X-API-Key)',
  response: '{ success: true, geofences: Geofence[] }',
} as const;

export function GeofenceLayer({ geofences }: { geofences: Geofence[] }) {
  if (geofences.length === 0) return null;

  return (
    <>
      {geofences.map((geofence) => {
        const color = geofence.color ?? '#2f83f6';

        if (geofence.type === 'circle' && geofence.center && geofence.radiusMeters) {
          return (
            <Circle
              key={geofence.id}
              center={[geofence.center.lat, geofence.center.lng]}
              radius={geofence.radiusMeters}
              pathOptions={{ color, fillOpacity: 0.08 }}
            >
              <Tooltip>{geofence.name}</Tooltip>
            </Circle>
          );
        }

        if (geofence.type === 'polygon' && geofence.points && geofence.points.length >= 3) {
          return (
            <Polygon
              key={geofence.id}
              positions={geofence.points.map((point) => [point.lat, point.lng])}
              pathOptions={{ color, fillOpacity: 0.08 }}
            >
              <Tooltip>{geofence.name}</Tooltip>
            </Polygon>
          );
        }

        return null;
      })}
    </>
  );
}
