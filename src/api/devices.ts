/**
 * `GET /api/devices` — requiere API Key.
 *
 * Devuelve TODOS los dispositivos con su última posición conocida
 * desnormalizada. Como incluye `lastPosition` y `lastSeenAt`, este endpoint es
 * la fuente única del monitoreo en tiempo real: un solo polling actualiza la
 * posición, velocidad, rumbo y batería de todo el parque.
 */

import { getJson } from './client';
import type { Device, DevicesResponse } from '@/types';

/** Lista completa de dispositivos (máximo 1000 según el backend). */
export async function listDevices(signal?: AbortSignal): Promise<Device[]> {
  const data = await getJson<DevicesResponse>('/devices', undefined, signal);
  return Array.isArray(data.devices) ? data.devices : [];
}
