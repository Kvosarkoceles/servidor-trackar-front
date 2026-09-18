/**
 * `GET /api/positions/:deviceId` y `.../latest` — requieren API Key.
 *
 * Notas del backend:
 *   - El historial viene en orden DESCENDENTE por `gps_timestamp`.
 *   - `limit` por defecto 100, máximo 5000 (MAX_HISTORY_LIMIT).
 *   - `from`/`to` son ISO 8601 y opcionales.
 */

import { getJson } from './client';
import { DEFAULT_HISTORY_LIMIT, MAX_HISTORY_LIMIT, API_CONCURRENCY } from '@/utils/constants';
import { mapWithConcurrency } from '@/utils/async';
import type { HistoryQuery, LatestPositionResponse, Position, PositionHistoryResponse } from '@/types';

function clampLimit(limit: number | undefined): number {
  const value = limit ?? DEFAULT_HISTORY_LIMIT;
  return Math.max(1, Math.min(value, MAX_HISTORY_LIMIT));
}

/** Historial de posiciones de un dispositivo. */
export async function getPositionHistory(
  deviceId: string,
  query: HistoryQuery = {},
  signal?: AbortSignal,
): Promise<Position[]> {
  const params: Record<string, unknown> = { limit: clampLimit(query.limit) };
  if (query.from) params.from = query.from;
  if (query.to) params.to = query.to;

  const data = await getJson<PositionHistoryResponse>(
    `/positions/${encodeURIComponent(deviceId)}`,
    params,
    signal,
  );
  return Array.isArray(data.positions) ? data.positions : [];
}

/**
 * Última posición de un dispositivo.
 * Devuelve `null` cuando el backend responde 404 (dispositivo sin posiciones).
 */
export async function getLatestPosition(
  deviceId: string,
  signal?: AbortSignal,
): Promise<Position | null> {
  try {
    const data = await getJson<LatestPositionResponse>(
      `/positions/${encodeURIComponent(deviceId)}/latest`,
      undefined,
      signal,
    );
    return data.position ?? null;
  } catch (error) {
    const appError = error as { kind?: string };
    if (appError?.kind === 'not_found') return null;
    throw error;
  }
}

export interface HistoryBatch {
  deviceId: string;
  positions: Position[];
}

/**
 * Historial de varios dispositivos con concurrencia limitada.
 * Los dispositivos que fallan se devuelven con lista vacía (no rompen el agregado).
 */
export async function getPositionHistoryBatch(
  deviceIds: string[],
  query: HistoryQuery = {},
  signal?: AbortSignal,
): Promise<HistoryBatch[]> {
  const results = await mapWithConcurrency(deviceIds, API_CONCURRENCY, async (deviceId) => ({
    deviceId,
    positions: await getPositionHistory(deviceId, query, signal),
  }));

  return results.map((result, index) =>
    result.status === 'fulfilled' ? result.value : { deviceId: deviceIds[index], positions: [] },
  );
}
