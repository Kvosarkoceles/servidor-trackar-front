/**
 * Eventos y alertas.
 *
 * `GET /api/events?deviceId=&type=&from=&to=&limit=` — requiere API Key.
 *
 * El backend DERIVA los eventos a partir del historial real de posiciones
 * (`gps_positions`) y del último contacto de cada dispositivo
 * (`devices.last_seen_at`): exceso de velocidad, movimiento, detención, pérdida
 * de señal GPS, batería baja y desconexión. No hay datos simulados.
 */

import { getJson } from './client';
import type { EventsResponse, GpsEvent, GpsEventType } from '@/types';

export const EVENTS_ENDPOINT_AVAILABLE = true;

export interface EventsQuery {
  deviceId?: string;
  type?: GpsEventType;
  from?: string;
  to?: string;
  limit?: number;
}

/** Descripción del contrato que implementa el backend. */
export const EVENTS_ENDPOINT_CONTRACT = {
  method: 'GET',
  path: '/api/events',
  auth: 'API Key (Bearer o X-API-Key)',
  query: 'deviceId?, type?, from?, to?, limit?',
  response: '{ success: true, count: number, events: GpsEvent[] }',
} as const;

/** `true`: el backend ya ofrece el endpoint de eventos. */
export function isEventsEndpointAvailable(): boolean {
  return EVENTS_ENDPOINT_AVAILABLE;
}

/** Lista eventos reales del backend, aplicando los filtros indicados. */
export async function listEvents(
  query: EventsQuery = {},
  signal?: AbortSignal,
): Promise<GpsEvent[]> {
  const params: Record<string, unknown> = {};
  if (query.deviceId) params.deviceId = query.deviceId;
  if (query.type) params.type = query.type;
  if (query.from) params.from = query.from;
  if (query.to) params.to = query.to;
  if (query.limit) params.limit = query.limit;

  const data = await getJson<EventsResponse>('/events', params, signal);
  return Array.isArray(data.events) ? data.events : [];
}
