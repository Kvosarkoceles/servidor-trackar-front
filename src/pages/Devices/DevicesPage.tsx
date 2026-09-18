import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, X } from 'lucide-react';

import { DeviceTable } from '@/components/devices/DeviceTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { ErrorState } from '@/components/ui/Feedback';
import { useDevicesStore } from '@/stores/devicesStore';
import { deviceSearchText } from '@/utils/device';
import { useDebouncedValue } from '@/hooks/useUtils';
import { ROUTES } from '@/utils/constants';
import { cn } from '@/utils/cn';
import type { DeviceStatus } from '@/types';

type Filter = 'all' | DeviceStatus;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'moving', label: 'En movimiento' },
  { value: 'stopped', label: 'Detenidos' },
  { value: 'offline', label: 'Offline' },
  { value: 'unknown', label: 'Sin datos' },
];

/**
 * Listado de dispositivos (requisito 8).
 *
 * Datos: `GET /api/devices`. Incluye búsqueda, filtro por estado, orden,
 * paginación y accesos a detalle / historial / centrado en el mapa.
 * No se ofrece crear/editar/eliminar porque el backend no expone esos endpoints.
 */
export function DevicesPage() {
  const navigate = useNavigate();
  const devices = useDevicesStore((state) => state.devices);
  const loading = useDevicesStore((state) => state.loading);
  const refreshing = useDevicesStore((state) => state.refreshing);
  const error = useDevicesStore((state) => state.error);
  const fetchDevices = useDevicesStore((state) => state.fetchDevices);
  const selectDevice = useDevicesStore((state) => state.selectDevice);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const debouncedQuery = useDebouncedValue(query, 200);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: devices.length };
    for (const device of devices) map[device.status] = (map[device.status] ?? 0) + 1;
    return map;
  }, [devices]);

  const filtered = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    return devices.filter((device) => {
      if (filter !== 'all' && device.status !== filter) return false;
      if (needle === '') return true;
      return deviceSearchText(device).includes(needle);
    });
  }, [devices, filter, debouncedQuery]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-content">Dispositivos</h1>
          <p className="text-xs text-content-muted">
            {devices.length} registrados · actualizado {refreshing ? 'ahora' : 'automáticamente'}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => void fetchDevices()}
          loading={refreshing}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Actualizar
        </Button>
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative lg:max-w-xs lg:flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, IMEI o ID…"
              aria-label="Buscar dispositivos"
              className="pl-9 pr-9"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-content-muted hover:text-content"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
            {FILTERS.map((option) => {
              const active = filter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-full border px-3 py-1 text-[11px] font-medium transition-colors',
                    active
                      ? 'border-brand-500/40 bg-brand-500/10 text-brand-400'
                      : 'border-line text-content-muted hover:bg-panel-soft hover:text-content',
                  )}
                >
                  {option.label}
                  <span className="ml-1 tabular-nums opacity-70">{counts[option.value] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {error && devices.length === 0 ? (
        <Card>
          <ErrorState
            message={error.message}
            detail={error.detail}
            onRetry={() => void fetchDevices()}
          />
        </Card>
      ) : (
        <DeviceTable
          devices={filtered}
          loading={loading}
          onView={(deviceId) => navigate(`${ROUTES.devices}/${encodeURIComponent(deviceId)}`)}
          onHistory={(deviceId) =>
            navigate(`${ROUTES.history}?deviceId=${encodeURIComponent(deviceId)}`)
          }
          onCenter={(deviceId) => {
            selectDevice(deviceId);
            navigate(ROUTES.liveTracking);
          }}
        />
      )}
    </div>
  );
}
