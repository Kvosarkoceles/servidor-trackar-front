/**
 * Eventos.
 *
 * ⚠ El backend `servidor-trackar` NO expone ningún endpoint de eventos: la
 * tabla `gps_positions` guarda posición/velocidad/rumbo/batería y `devices` la
 * última posición. No hay detección de exceso de velocidad, geocercas,
 * movimiento/detención, ni alertas del servidor.
 *
 * Este módulo deja la interfaz PREPARADA (requisito 35) sin inventar datos:
 * `isEventsEndpointAvailable()` devuelve `false` y `listEvents()` rechaza con un
 * error explícito hasta que exista el endpoint.
 *
 * Endpoint propuesto para el backend (documentado en API_INTEGRATION.md):
 *
 *   GET /api/events?deviceId=&type=&from=&to=&limit=
 *   -> { success: true, count, events: [{ id, deviceId, type, timestamp,
 *        latitude, longitude, speed, message }] }
 */

import type { AppError } from '@/utils/errors';
import type { GpsEvent, GpsEventType } from '@/types';

export const EVENTS_ENDPOINT_AVAILABLE = false;

export interface EventsQuery {
  deviceId?: string;
  type?: GpsEventType;
  from?: string;
  to?: string;
  limit?: number;
}

/** Descripción del contrato que debería implementar el backend. */
export const EVENTS_ENDPOINT_CONTRACT = {
  method: 'GET',
  path: '/api/events',
  auth: 'API Key (Bearer o X-API-Key)',
  query: 'deviceId?, type?, from?, to?, limit?',
  response: '{ success: true, count: number, events: GpsEvent[] }',
} as const;

/** `true` si el backend ya ofrece el endpoint de eventos. */
export function isEventsEndpointAvailable(): boolean {
  return EVENTS_ENDPOINT_AVAILABLE;
}

/** Lanza siempre: el endpoint no existe todavía en el backend. */
export function listEvents(_query: EventsQuery = {}): Promise<GpsEvent[]> {
  const error: AppError = {
    kind: 'not_found',
    message:
      'El backend todavía no ofrece un endpoint de eventos. La interfaz está lista para integrarlo.',
    detail: 'GET /api/events no está implementado en servidor-trackar.',
  };
  return Promise.reject(error);
}
