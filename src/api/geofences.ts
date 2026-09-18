/**
 * Geocercas.
 *
 * `GET /api/geofences` — requiere API Key.
 *
 * Devuelve las zonas almacenadas en el backend (círculos y polígonos) en el
 * formato que consume `GeofenceLayer`.
 */

import { getJson } from './client';
import type { Geofence, GeofencesResponse } from '@/types';

export const GEOFENCES_ENDPOINT_AVAILABLE = true;

/** Descripción del contrato que implementa el backend. */
export const GEOFENCES_ENDPOINT_CONTRACT = {
  method: 'GET',
  path: '/api/geofences',
  auth: 'API Key (Bearer o X-API-Key)',
  response: '{ success: true, geofences: Geofence[] }',
} as const;

/** `true`: el backend ya ofrece el endpoint de geocercas. */
export function isGeofencesEndpointAvailable(): boolean {
  return GEOFENCES_ENDPOINT_AVAILABLE;
}

/** Lista las geocercas activas configuradas en el backend. */
export async function listGeofences(signal?: AbortSignal): Promise<Geofence[]> {
  const data = await getJson<GeofencesResponse>('/geofences', undefined, signal);
  return Array.isArray(data.geofences) ? data.geofences : [];
}
