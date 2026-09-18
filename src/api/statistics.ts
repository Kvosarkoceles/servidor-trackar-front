/**
 * Servicio de estadísticas.
 *
 * ⚠ El backend NO expone `GET /api/statistics`. Las métricas se calculan en el
 * cliente a partir del historial REAL (`GET /api/positions/:deviceId`), tal y
 * como permite el requisito 35 (trabajar con datos reales, sin inventar).
 *
 * Si en el futuro el backend añade un endpoint de agregados, basta con
 * reemplazar la implementación de estas funciones por una llamada HTTP.
 */

import { getPositionHistoryBatch } from './positions';
import { DASHBOARD_MAX_DEVICES } from '@/utils/constants';
import { computeDeviceStats, mergeDistanceSeries, mergeSpeedSeries } from '@/utils/statistics';
import { MOVING_SPEED_KMH, OFFLINE_THRESHOLD_SECONDS } from '@/utils/constants';
import type { SpeedUnit } from '@/utils/device';
import type {
  DeviceStats,
  DeviceWithStatus,
  DistancePoint,
  FleetStats,
  SpeedPoint,
} from '@/types';

export interface Range {
  from: Date;
  to: Date;
}

export interface FleetAggregate {
  stats: FleetStats;
  distanceByBucket: DistancePoint[];
  speedByBucket: SpeedPoint[];
  /** Métricas por dispositivo incluidas en el agregado. */
  perDevice: DeviceStats[];
  /** Dispositivos que se omitieron por el límite configurado. */
  skippedDeviceIds: string[];
}

/** Rango "hoy" en hora local, desde las 00:00 hasta ahora. */
export function todayRange(now: Date = new Date()): Range {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  return { from, to: now };
}

/** Rango de los últimos `days` días hasta ahora. */
export function lastDaysRange(days: number, now: Date = new Date()): Range {
  const from = new Date(now.getTime() - days * 24 * 3600 * 1000);
  return { from, to: now };
}

interface AggregateOptions {
  range: Range;
  speedUnit?: SpeedUnit;
  maxDevices?: number;
  signal?: AbortSignal;
}

/**
 * Agrega estadísticas de flota usando el historial real de los dispositivos con
 * posición conocida. Se acota a `maxDevices` (por defecto
 * VITE_DASHBOARD_MAX_DEVICES) para no disparar cientos de peticiones, y se
 * informa de cuántos dispositivos quedaron fuera.
 */
export async function getFleetAggregate(
  devices: DeviceWithStatus[],
  options: AggregateOptions,
): Promise<FleetAggregate> {
  const { range, speedUnit = 'kmh', maxDevices = DASHBOARD_MAX_DEVICES, signal } = options;

  const candidates = devices.filter((device) => device.lastPosition !== null);
  const selected = candidates.slice(0, Math.max(0, maxDevices));
  const skipped = candidates.slice(Math.max(0, maxDevices));

  const query = { from: range.from.toISOString(), to: range.to.toISOString(), limit: 5000 };
  const batches = await getPositionHistoryBatch(
    selected.map((device) => device.deviceId),
    query,
    signal,
  );

  const perDevice = batches.map((batch) =>
    computeDeviceStats(batch.deviceId, batch.positions, speedUnit),
  );

  const distanceByBucket = mergeDistanceSeries(perDevice.map((stats) => stats.distanceByBucket));
  const speedByBucket = mergeSpeedSeries(perDevice.map((stats) => stats.speedByBucket));

  const distanceKm = perDevice.reduce((total, stats) => total + stats.distanceKm, 0);
  const movingSeconds = perDevice.reduce((total, stats) => total + stats.movingSeconds, 0);
  const stoppedSeconds = perDevice.reduce((total, stats) => total + stats.stoppedSeconds, 0);

  const speeds = perDevice.filter((stats) => stats.avgSpeedKmh > 0);
  const avgSpeedKmh =
    speeds.length > 0 ? speeds.reduce((total, s) => total + s.avgSpeedKmh, 0) / speeds.length : 0;

  const maxSpeedKmh = perDevice.reduce((max, stats) => Math.max(max, stats.maxSpeedKmh), 0);

  const stats: FleetStats = {
    deviceCount: devices.length,
    movingCount: devices.filter((device) => device.status === 'moving').length,
    stoppedCount: devices.filter((device) => device.status === 'stopped').length,
    offlineCount: devices.filter((device) => device.status === 'offline').length,
    unknownCount: devices.filter((device) => device.status === 'unknown').length,
    distanceKm: Number(distanceKm.toFixed(2)),
    avgSpeedKmh: Number(avgSpeedKmh.toFixed(1)),
    maxSpeedKmh: Number(maxSpeedKmh.toFixed(1)),
    movingSeconds,
    stoppedSeconds,
    devicesWithHistory: perDevice.length,
    truncated: skipped.length > 0,
  };

  return {
    stats,
    distanceByBucket,
    speedByBucket,
    perDevice,
    skippedDeviceIds: skipped.map((device) => device.deviceId),
  };
}

/** Umbrales usados por el cálculo, para mostrarlos en la interfaz. */
export const STATS_THRESHOLDS = {
  movingSpeedKmh: MOVING_SPEED_KMH,
  offlineSeconds: OFFLINE_THRESHOLD_SECONDS,
} as const;
