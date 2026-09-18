/**
 * Derivación del estado del dispositivo y normalización de unidades.
 *
 * ⚠ El backend NO devuelve un campo `status`. Solo guarda la última posición y
 * el instante del último contacto (`lastSeenAt`). Por lo tanto el estado
 * "en movimiento / detenido / sin conexión" se CALCULA aquí con umbrales
 * configurables, y se documenta como derivado en API_INTEGRATION.md.
 */

import {
  MOVING_SPEED_KMH,
  OFFLINE_THRESHOLD_SECONDS,
} from './constants';
import { isValidCoordinate } from './geo';
import type { Device, DeviceStatus, DeviceWithStatus } from '@/types';

/** Unidad de velocidad almacenada en el backend. */
export type SpeedUnit = 'kmh' | 'knots' | 'mph';

const SPEED_TO_KMH: Record<SpeedUnit, number> = {
  kmh: 1,
  knots: 1.852,
  mph: 1.609344,
};

/** Convierte la velocidad del backend a km/h según la unidad configurada. */
export function speedToKmh(value: number | null | undefined, unit: SpeedUnit = 'kmh'): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return value * SPEED_TO_KMH[unit];
}

/** Segundos transcurridos desde un ISO, o `null` si no hay dato. */
export function ageInSeconds(iso: string | null): number | null {
  if (!iso) return null;
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, (Date.now() - timestamp) / 1000);
}

/** Umbrales configurables para derivar el estado. */
export interface StatusThresholds {
  offlineThresholdSeconds?: number;
  movingSpeedKmh?: number;
}

/** Calcula el estado derivado de un dispositivo. */
export function deriveStatus(
  device: Device,
  speedKmh: number | null,
  thresholds: StatusThresholds = {},
): DeviceStatus {
  const offlineAfter = thresholds.offlineThresholdSeconds ?? OFFLINE_THRESHOLD_SECONDS;
  const movingFrom = thresholds.movingSpeedKmh ?? MOVING_SPEED_KMH;
  const age = ageInSeconds(device.lastSeenAt);

  if (age === null || !device.lastPosition) return 'unknown';
  if (age > offlineAfter) return 'offline';
  if (speedKmh !== null && speedKmh > movingFrom) return 'moving';
  return 'stopped';
}

/** Opciones de normalización de un dispositivo. */
export interface NormalizeDeviceOptions extends StatusThresholds {
  unit?: SpeedUnit;
}

/** Enriquece un dispositivo del backend con estado y coordenadas normalizadas. */
export function toDeviceWithStatus(
  device: Device,
  options: NormalizeDeviceOptions = {},
): DeviceWithStatus {
  const position = device.lastPosition;
  const hasCoords =
    position !== null && isValidCoordinate(position.latitude, position.longitude);

  const speedKmh = speedToKmh(position?.speed ?? null, options.unit ?? 'kmh');

  return {
    ...device,
    status: deriveStatus(device, speedKmh, options),
    ageSeconds: ageInSeconds(device.lastSeenAt),
    speedKmh,
    coordinates: hasCoords
      ? { lat: position.latitude as number, lng: position.longitude as number }
      : null,
  };
}

/** Metadatos visuales por estado (color, etiqueta, icono textual). */
export const STATUS_META: Record<
  DeviceStatus,
  { label: string; dot: string; text: string; badge: string; ring: string }
> = {
  moving: {
    label: 'En movimiento',
    dot: 'bg-status-moving',
    text: 'text-status-moving',
    badge: 'bg-status-moving/10 text-status-moving border-status-moving/30',
    ring: 'ring-status-moving/40',
  },
  stopped: {
    label: 'Detenido',
    dot: 'bg-status-stopped',
    text: 'text-status-stopped',
    badge: 'bg-status-stopped/10 text-status-stopped border-status-stopped/30',
    ring: 'ring-status-stopped/40',
  },
  offline: {
    label: 'Sin conexión',
    dot: 'bg-status-offline',
    text: 'text-status-offline',
    badge: 'bg-status-offline/10 text-status-offline border-status-offline/30',
    ring: 'ring-status-offline/40',
  },
  unknown: {
    label: 'Sin datos',
    dot: 'bg-status-unknown',
    text: 'text-content-muted',
    badge: 'bg-status-unknown/10 text-content-muted border-status-unknown/30',
    ring: 'ring-status-unknown/40',
  },
};

/** Nombre visible del dispositivo (`name` puede ser `null` en el backend). */
export function deviceLabel(device: Pick<Device, 'deviceId' | 'name' | 'uniqueId'>): string {
  return device.name?.trim() || device.uniqueId?.trim() || device.deviceId;
}

/** Texto combinado para la búsqueda global (nombre + id + uniqueId). */
export function deviceSearchText(device: Device): string {
  return [device.name, device.deviceId, device.uniqueId].filter(Boolean).join(' ').toLowerCase();
}
