import { useCallback, useEffect, useRef, useState } from 'react';

import { getPositionHistory } from '@/api/positions';
import { useSettingsStore } from '@/stores/settingsStore';
import { computeDeviceStats } from '@/utils/statistics';
import { toAppError, logError, type AppError } from '@/utils/errors';
import type { DeviceStats, Position, PositionHistoryResponse } from '@/types';

interface HistoryState {
  positions: Position[];
  stats: DeviceStats | null;
  meta: Pick<PositionHistoryResponse, 'count' | 'limit'> | null;
  loading: boolean;
  error: AppError | null;
}

interface UseDeviceHistoryOptions {
  deviceId: string | null;
  from?: string;
  to?: string;
  limit?: number;
  /** Si es `true`, la consulta se lanza automáticamente al cambiar los filtros. */
  auto?: boolean;
}

/**
 * Historial de posiciones de un dispositivo + estadísticas derivadas.
 * Los puntos llegan en orden descendente (como los entrega el backend); para
 * las estadísticas y el dibujo del recorrido se invierten.
 */
export function useDeviceHistory(options: UseDeviceHistoryOptions) {
  const { deviceId, from, to, limit = 5000, auto = false } = options;
  const speedUnit = useSettingsStore((state) => state.speedUnit);

  const [state, setState] = useState<HistoryState>({
    positions: [],
    stats: null,
    meta: null,
    loading: false,
    error: null,
  });

  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!deviceId) {
      setState({ positions: [], stats: null, meta: null, loading: false, error: null });
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const positions = await getPositionHistory(deviceId, { from, to, limit }, controller.signal);
      const ascending = [...positions].sort(
        (a, b) => new Date(a.timestamp ?? 0).getTime() - new Date(b.timestamp ?? 0).getTime(),
      );
      setState({
        positions: ascending,
        stats: computeDeviceStats(deviceId, ascending, speedUnit),
        meta: { count: positions.length, limit },
        loading: false,
        error: null,
      });
    } catch (error) {
      const appError = (error as AppError)?.kind ? (error as AppError) : toAppError(error);
      if (appError.kind === 'canceled') return;
      logError('useDeviceHistory', error);
      setState({ positions: [], stats: null, meta: null, loading: false, error: appError });
    }
  }, [deviceId, from, to, limit, speedUnit]);

  useEffect(() => {
    if (auto) void load();
  }, [auto, load]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return { ...state, reload: load };
}
