import { useMemo, useState } from 'react';
import { Car, Crosshair, Search, X } from 'lucide-react';

import { DeviceStatusBadge } from './DeviceStatusBadge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/Feedback';
import { deviceLabel, deviceSearchText } from '@/utils/device';
import { fmtRelative, fmtSpeed } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { DeviceStatus, DeviceWithStatus } from '@/types';

export type StatusFilter = 'all' | DeviceStatus;

interface DeviceListPanelProps {
  devices: DeviceWithStatus[];
  selectedId: string | null;
  loading?: boolean;
  /** Nº de dispositivos que no se muestran por el filtro o la búsqueda. */
  onSelect: (deviceId: string) => void;
  onCenter?: (deviceId: string) => void;
  className?: string;
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'moving', label: 'En movimiento' },
  { value: 'stopped', label: 'Detenidos' },
  { value: 'offline', label: 'Offline' },
  { value: 'unknown', label: 'Sin datos' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'name', label: 'Nombre' },
  { value: 'speed', label: 'Velocidad' },
];

/**
 * Panel lateral con la lista de dispositivos: búsqueda, filtro por estado,
 * orden y selección (requisito 5).
 */
export function DeviceListPanel({
  devices,
  selectedId,
  loading = false,
  onSelect,
  onCenter,
  className,
}: DeviceListPanelProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState('recent');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const result = devices.filter((device) => {
      if (status !== 'all' && device.status !== status) return false;
      if (needle === '') return true;
      return deviceSearchText(device).includes(needle);
    });

    switch (sort) {
      case 'name':
        return result.sort((a, b) => deviceLabel(a).localeCompare(deviceLabel(b)));
      case 'speed':
        return result.sort((a, b) => (b.speedKmh ?? -1) - (a.speedKmh ?? -1));
      default:
        return result.sort(
          (a, b) =>
            new Date(b.lastSeenAt ?? 0).getTime() - new Date(a.lastSeenAt ?? 0).getTime(),
        );
    }
  }, [devices, query, status, sort]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: devices.length };
    for (const device of devices) {
      map[device.status] = (map[device.status] ?? 0) + 1;
    }
    return map;
  }, [devices]);

  return (
    <div className={cn('panel flex h-full min-h-0 flex-col', className)}>
      <div className="space-y-3 border-b border-line p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar dispositivo, IMEI o ID…"
            aria-label="Buscar dispositivo"
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

        <div className="grid grid-cols-2 gap-2">
          <Select
            aria-label="Filtrar por estado"
            value={status}
            options={FILTER_OPTIONS.map((option) => ({
              ...option,
              label: `${option.label}${counts[option.value] !== undefined ? ` (${counts[option.value]})` : ''}`,
            }))}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
          />
          <Select
            aria-label="Ordenar"
            value={sort}
            options={SORT_OPTIONS}
            onChange={(event) => setSort(event.target.value)}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin" role="listbox" aria-label="Dispositivos">
        {loading && devices.length === 0 ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Sin resultados"
            description={
              devices.length === 0
                ? 'El backend todavía no reporta dispositivos. Envía una posición desde Traccar Client para verlos aquí.'
                : 'Ningún dispositivo coincide con la búsqueda o el filtro seleccionado.'
            }
          />
        ) : (
          <ul className="divide-y divide-line/60">
            {filtered.map((device) => {
              const selected = device.deviceId === selectedId;
              return (
                <li key={device.deviceId}>
                  <div
                    role="option"
                    aria-selected={selected}
                    tabIndex={0}
                    onClick={() => onSelect(device.deviceId)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect(device.deviceId);
                      }
                    }}
                    className={cn(
                      'cursor-pointer px-3 py-2.5 transition-colors',
                      selected ? 'bg-brand-500/10' : 'hover:bg-panel-soft',
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-panel-soft text-content-muted">
                        <Car className="h-3.5 w-3.5" aria-hidden />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-content">
                            {deviceLabel(device)}
                          </p>
                          <span className="shrink-0 text-xs tabular-nums text-content-muted">
                            {fmtSpeed(device.speedKmh)}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-2">
                          <DeviceStatusBadge status={device.status} />
                          <span className="truncate text-[11px] text-content-muted">
                            {fmtRelative(device.lastSeenAt)}
                          </span>
                        </div>

                        <p className="mt-1 truncate font-mono text-[11px] text-content-muted">
                          {device.deviceId}
                        </p>
                      </div>

                      {onCenter ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          aria-label={`Centrar ${deviceLabel(device)} en el mapa`}
                          title="Centrar en el mapa"
                          onClick={(event) => {
                            event.stopPropagation();
                            onCenter(device.deviceId);
                          }}
                        >
                          <Crosshair className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-line px-3 py-2 text-[11px] text-content-muted" aria-live="polite">
        {filtered.length} de {devices.length} dispositivos
      </div>
    </div>
  );
}
