import L from 'leaflet';
import { Polyline, CircleMarker, Tooltip } from 'react-leaflet';

import { fmtDistance, fmtDuration, fmtSpeed, fmtTime } from '@/utils/format';
import { speedToKmh, type SpeedUnit } from '@/utils/device';
import { haversineKm, type LatLng } from '@/utils/geo';
import type { Position } from '@/types';

interface TrailPolylineProps {
  /** Puntos en orden cronológico ASCENDENTE. */
  positions: Position[];
  color?: string;
  speedUnit?: SpeedUnit;
  /** Posición del vehículo durante la reproducción (índice resaltado). */
  playheadIndex?: number | null;
  weight?: number;
}

/**
 * Dibuja el recorrido histórico sobre el mapa.
 *
 * Se colorea por tramos según la velocidad para que un exceso de velocidad sea
 * visible sin inventar datos: el color se calcula a partir de la velocidad real
 * reportada por el backend.
 */
export function TrailPolyline({
  positions,
  color = '#2f83f6',
  speedUnit = 'kmh',
  playheadIndex = null,
  weight = 4,
}: TrailPolylineProps) {
  const points = positions
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .map((p) => [p.latitude, p.longitude] as [number, number]);

  const latLngs: LatLng[] = points.map(([lat, lng]) => ({ lat, lng }));

  // Invalida el tamaño del mapa cuando cambia el recorrido (por si el panel se redimensiona).
  if (points.length < 2) return null;

  const speedColor = (index: number): string => {
    const speed = speedToKmh(positions[index]?.speed ?? null, speedUnit) ?? 0;
    if (speed > 100) return '#ef4444';
    if (speed > 60) return '#f59e0b';
    return color;
  };

  const first = positions[0];
  const last = positions[positions.length - 1];
  const distanceKm = latLngs.reduce((total, point, index) => {
    if (index === 0) return total;
    return total + haversineKm(latLngs[index - 1], point);
  }, 0);

  return (
    <>
      {points.slice(1).map((point, index) => (
        <Polyline
          key={`seg-${index}`}
          positions={[points[index], point]}
          pathOptions={{ color: speedColor(index + 1), weight, opacity: 0.9 }}
        />
      ))}

      <CircleMarker center={points[0]} radius={7} pathOptions={{ color: '#22c55e', fillOpacity: 1 }}>
        <Tooltip direction="top" offset={[0, -6]}>
          <span className="text-xs">
            Inicio · {fmtTime(first?.timestamp)} · {fmtDistance(distanceKm)}
            {' · '}
            {fmtDuration(
              first?.timestamp && last?.timestamp
                ? (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) / 1000
                : 0,
            )}
          </span>
        </Tooltip>
      </CircleMarker>

      <CircleMarker
        center={points[points.length - 1]}
        radius={7}
        pathOptions={{ color: '#ef4444', fillOpacity: 1 }}
      >
        <Tooltip direction="top" offset={[0, -6]}>
          <span className="text-xs">
            Fin · {fmtTime(last?.timestamp)} · {fmtSpeed(speedToKmh(last?.speed ?? null, speedUnit))}
          </span>
        </Tooltip>
      </CircleMarker>

      {playheadIndex !== null && positions[playheadIndex] ? (
        <CircleMarker
          center={[positions[playheadIndex].latitude, positions[playheadIndex].longitude]}
          radius={9}
          pathOptions={{ color: '#0b1220', fillColor: '#ffffff', fillOpacity: 1, weight: 3 }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]}>
            <span className="text-xs font-medium">
              {fmtTime(positions[playheadIndex].timestamp)} ·{' '}
              {fmtSpeed(speedToKmh(positions[playheadIndex].speed ?? null, speedUnit))}
            </span>
          </Tooltip>
        </CircleMarker>
      ) : null}
    </>
  );
}

/** Ajusta el mapa a un conjunto de puntos. */
export function fitBoundsToPoints(map: L.Map, points: Array<[number, number]>): void {
  if (points.length === 0) return;
  if (points.length === 1) {
    map.setView(points[0], Math.max(map.getZoom(), 15));
    return;
  }
  const bounds = L.latLngBounds(points);
  map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
}
