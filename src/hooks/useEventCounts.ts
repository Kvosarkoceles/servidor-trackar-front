/**
 * Carga eventos reales del backend y los agrega por categoría, listo para
 * `CategoryBarChart`. Comparte la lógica entre Dashboard y Estadísticas.
 */

import { useEffect, useMemo, useState } from 'react';

import { listEvents } from '@/api/events';
import { EVENT_TYPE_META, EVENT_TYPE_ORDER } from '@/utils/events';
import { toAppError, logError, type AppError } from '@/utils/errors';
import type { GpsEvent } from '@/types';

interface UseEventCountsOptions {
  /** ISO 8601 */
  from?: string;
  /** ISO 8601 */
  to?: string;
  deviceId?: string | null;
  limit?: number;
  enabled?: boolean;
}

export interface EventCountDatum {
  label: string;
  value: number;
  color: string;
}

export function useEventCounts(options: UseEventCountsOptions) {
  const { from, to, deviceId = null, limit = 2000, enabled = true } = options;

  const [events, setEvents] = useState<GpsEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    listEvents({ from, to, deviceId: deviceId ?? undefined, limit }, controller.signal)
      .then((result) => setEvents(result))
      .catch((caught) => {
        const appError = (caught as AppError)?.kind ? (caught as AppError) : toAppError(caught);
        if (appError.kind === 'canceled') return;
        logError('useEventCounts', caught);
        setError(appError);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [from, to, deviceId, limit, enabled]);

  const counts = useMemo<EventCountDatum[]>(() => {
    const totals = new Map<string, number>();
    for (const event of events) totals.set(event.type, (totals.get(event.type) ?? 0) + 1);

    return EVENT_TYPE_ORDER.map((type) => ({
      label: EVENT_TYPE_META[type].short,
      value: totals.get(type) ?? 0,
      color: EVENT_TYPE_META[type].color,
    }));
  }, [events]);

  return { events, counts, loading, error };
}
