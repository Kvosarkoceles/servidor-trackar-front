/**
 * Cálculo de estadísticas a partir del historial REAL de posiciones.
 *
 * No se inventan métricas: todo se deriva de los puntos devueltos por
 * `GET /api/positions/:deviceId`. El backend no expone un endpoint de
 * estadísticas (ver API_INTEGRATION.md).
 */

import { MOVING_SPEED_KMH } from './constants';
import { speedToKmh, type SpeedUnit } from './device';
import { haversineKm, type LatLng } from './geo';
import type { DeviceStats, DistancePoint, Position, SpeedPoint } from '@/types';

/** Saltos de tiempo mayores que esto no cuentan como tiempo detenido (hueco de datos). */
const MAX_INTERVAL_SECONDS = 15 * 60;

/** Velocidad implícita imposible entre dos puntos: se descarta el segmento. */
const MAX_IMPLIED_KMH = 350;

export type BucketGranularity = 'hour' | 'day';

function bucketKey(date: Date, granularity: BucketGranularity): string {
  if (granularity === 'day') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}`;
}

function bucketLabel(date: Date, granularity: BucketGranularity): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  if (granularity === 'day') {
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
  }
  return `${pad(date.getHours())}:00`;
}

/** Elige la granularidad según el rango temporal cubierto. */
export function pickGranularity(spanSeconds: number): BucketGranularity {
  return spanSeconds > 48 * 3600 ? 'day' : 'hour';
}

interface ParsedPoint extends LatLng {
  time: number;
  speedKmh: number | null;
}

function parsePoints(positions: Position[], unit: SpeedUnit): ParsedPoint[] {
  return positions
    .map((position) => {
      const time = position.timestamp ? new Date(position.timestamp).getTime() : Number.NaN;
      return {
        lat: position.latitude,
        lng: position.longitude,
        time,
        speedKmh: speedToKmh(position.speed, unit),
      };
    })
    .filter((point) => Number.isFinite(point.time))
    .sort((a, b) => a.time - b.time);
}

/**
 * Calcula estadísticas de un dispositivo.
 *
 * @param positions Puntos del backend (habitualmente en orden descendente;
 *                  la función los reordena).
 */
export function computeDeviceStats(
  deviceId: string,
  positions: Position[],
  unit: SpeedUnit = 'kmh',
  granularity?: BucketGranularity,
): DeviceStats {
  const empty: DeviceStats = {
    deviceId,
    distanceKm: 0,
    maxSpeedKmh: 0,
    avgSpeedKmh: 0,
    movingSeconds: 0,
    stoppedSeconds: 0,
    spanSeconds: 0,
    positionCount: positions.length,
    distanceByBucket: [],
    speedByBucket: [],
  };

  const points = parsePoints(positions, unit);
  if (points.length === 0) return empty;

  const spanSeconds = Math.max(0, (points[points.length - 1].time - points[0].time) / 1000);
  const bucket: BucketGranularity = granularity ?? pickGranularity(spanSeconds);

  const distanceBuckets = new Map<string, { label: string; km: number }>();
  const speedBuckets = new Map<string, { label: string; sum: number; weight: number; max: number }>();

  let distanceKm = 0;
  let movingSeconds = 0;
  let stoppedSeconds = 0;
  let weightedSpeedSum = 0;
  let weightedSpeedTime = 0;
  let maxSpeedKmh = 0;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const date = new Date(point.time);
    const key = bucketKey(date, bucket);

    // Bucket de distancia: se atribuye al punto de destino del segmento.
    if (!distanceBuckets.has(key)) {
      distanceBuckets.set(key, { label: bucketLabel(date, bucket), km: 0 });
    }

    if (point.speedKmh !== null && point.speedKmh > maxSpeedKmh) {
      maxSpeedKmh = point.speedKmh;
    }

    if (index === 0) continue;

    const previous = points[index - 1];
    const seconds = (point.time - previous.time) / 1000;
    if (seconds <= 0 || seconds > MAX_INTERVAL_SECONDS) continue;

    const segmentKm = haversineKm(previous, point);
    const impliedKmh = (segmentKm / seconds) * 3600;
    if (impliedKmh > MAX_IMPLIED_KMH) continue;

    distanceKm += segmentKm;
    const distanceBucket = distanceBuckets.get(key);
    if (distanceBucket) distanceBucket.km += segmentKm;

    // Velocidad del intervalo: media de los dos extremos cuando existe.
    const speeds = [previous.speedKmh, point.speedKmh].filter(
      (value): value is number => value !== null,
    );
    const segmentSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

    const label = bucketLabel(date, bucket);
    if (!speedBuckets.has(key)) {
      speedBuckets.set(key, { label, sum: 0, weight: 0, max: 0 });
    }
    const speedBucket = speedBuckets.get(key);
    if (speedBucket) {
      speedBucket.sum += segmentSpeed * seconds;
      speedBucket.weight += seconds;
      if (segmentSpeed > speedBucket.max) speedBucket.max = segmentSpeed;
    }

    if (segmentSpeed > MOVING_SPEED_KMH) {
      movingSeconds += seconds;
    } else {
      stoppedSeconds += seconds;
    }

    weightedSpeedSum += segmentSpeed * seconds;
    weightedSpeedTime += seconds;
  }

  const toSorted = <T extends { label: string }>(map: Map<string, T>): T[] =>
    [...map.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, value]) => value);

  const distanceByBucket: DistancePoint[] = toSorted(distanceBuckets).map((item) => ({
    label: item.label,
    km: Number(item.km.toFixed(3)),
  }));

  const speedByBucket: SpeedPoint[] = toSorted(speedBuckets).map((item) => ({
    label: item.label,
    avgKmh: item.weight > 0 ? Number((item.sum / item.weight).toFixed(1)) : 0,
    maxKmh: Number(item.max.toFixed(1)),
  }));

  return {
    deviceId,
    distanceKm: Number(distanceKm.toFixed(3)),
    maxSpeedKmh: Number(maxSpeedKmh.toFixed(1)),
    avgSpeedKmh:
      weightedSpeedTime > 0 ? Number((weightedSpeedSum / weightedSpeedTime).toFixed(1)) : 0,
    movingSeconds: Math.round(movingSeconds),
    stoppedSeconds: Math.round(stoppedSeconds),
    spanSeconds: Math.round(spanSeconds),
    positionCount: positions.length,
    distanceByBucket,
    speedByBucket,
  };
}

/** Suma dos juegos de puntos por bucket (para agregados de flota). */
export function mergeDistanceSeries(series: DistancePoint[][]): DistancePoint[] {
  const merged = new Map<string, DistancePoint>();
  for (const list of series) {
    for (const point of list) {
      const current = merged.get(point.label);
      if (current) current.km = Number((current.km + point.km).toFixed(3));
      else merged.set(point.label, { ...point });
    }
  }
  return [...merged.values()];
}

/** Combina series de velocidad de varios dispositivos (máximo y media ponderada simple). */
export function mergeSpeedSeries(series: SpeedPoint[][]): SpeedPoint[] {
  const merged = new Map<string, { label: string; sum: number; count: number; max: number }>();
  for (const list of series) {
    for (const point of list) {
      const current = merged.get(point.label);
      if (current) {
        current.sum += point.avgKmh;
        current.count += 1;
        current.max = Math.max(current.max, point.maxKmh);
      } else {
        merged.set(point.label, {
          label: point.label,
          sum: point.avgKmh,
          count: 1,
          max: point.maxKmh,
        });
      }
    }
  }
  return [...merged.values()].map((item) => ({
    label: item.label,
    avgKmh: Number((item.sum / item.count).toFixed(1)),
    maxKmh: Number(item.max.toFixed(1)),
  }));
}
