import { Circle, Polygon, Tooltip } from 'react-leaflet';

import type { Geofence } from '@/types';

/**
 * Capa de geocercas.
 *
 * Renderiza las zonas devueltas por `GET /api/geofences` (círculos y
 * polígonos) superpuestas al mapa.
 */
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
