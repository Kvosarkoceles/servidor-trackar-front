/**
 * `GET /api/devices` — requiere API Key.
 *
 * Devuelve TODOS los dispositivos con su última posición conocida
 * desnormalizada. Como incluye `lastPosition` y `lastSeenAt`, este endpoint es
 * la fuente única del monitoreo en tiempo real: un solo polling actualiza la
 * posición, velocidad, rumbo y batería de todo el parque.
 *
 * `PUT`/`DELETE /api/devices/:deviceId` permiten editar y eliminar
 * dispositivos (el `deviceId` es inmutable).
 */

import { getJson, putJson, deleteJson } from './client';
import type { Device, DeviceResponse, DevicesResponse, DeviceUpdateInput } from '@/types';

/** Lista completa de dispositivos (máximo 1000 según el backend). */
export async function listDevices(signal?: AbortSignal): Promise<Device[]> {
  const data = await getJson<DevicesResponse>('/devices', undefined, signal);
  return Array.isArray(data.devices) ? data.devices : [];
}

/** Edita `name`, `uniqueId` y/o `active` de un dispositivo. */
export async function updateDevice(
  deviceId: string,
  changes: DeviceUpdateInput,
  signal?: AbortSignal,
): Promise<Device> {
  const data = await putJson<DeviceResponse>(
    `/devices/${encodeURIComponent(deviceId)}`,
    changes,
    signal,
  );
  return data.device;
}

/** Elimina un dispositivo y, en cascada, su historial de posiciones. */
export async function deleteDevice(deviceId: string, signal?: AbortSignal): Promise<void> {
  await deleteJson<{ success: true }>(`/devices/${encodeURIComponent(deviceId)}`, signal);
}
