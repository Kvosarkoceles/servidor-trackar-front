import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, X } from 'lucide-react';

import { DeviceStatusBadge } from '@/components/devices/DeviceStatusBadge';
import { deviceLabel, deviceSearchText } from '@/utils/device';
import { useDevicesStore } from '@/stores/devicesStore';
import { useDebouncedValue } from '@/hooks/useUtils';
import { fmtCoord } from '@/utils/format';
import { ROUTES } from '@/utils/constants';
import { cn } from '@/utils/cn';

/**
 * Búsqueda global del header (requisito 18).
 *
 * Busca por nombre, `deviceId` (identificador) y `uniqueId` (IMEI/UID).
 * El backend no almacena teléfono ni modelo, por lo que no se ofrecen como
 * criterio de búsqueda para no sugerir datos inexistentes.
 */
export function GlobalSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const devices = useDevicesStore((state) => state.devices);
  const selectDevice = useDevicesStore((state) => state.selectDevice);
  const debounced = useDebouncedValue(query, 200);

  const results = useMemo(() => {
    const needle = debounced.trim().toLowerCase();
    if (needle.length < 2) return [];
    return devices.filter((device) => deviceSearchText(device).includes(needle)).slice(0, 8);
  }, [devices, debounced]);

  // Cierra al hacer clic fuera.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const choose = (deviceId: string) => {
    setQuery('');
    setOpen(false);
    selectDevice(deviceId);
    navigate(`${ROUTES.devices}/${encodeURIComponent(deviceId)}`);
  };

  return (
    <div ref={containerRef} className={cn('relative w-full max-w-md', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted"
        aria-hidden
      />
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && results[0]) choose(results[0].deviceId);
          if (event.key === 'Escape') setOpen(false);
        }}
        placeholder="Buscar vehículo, IMEI o ID…"
        aria-label="Búsqueda global de dispositivos"
        className="w-full rounded-lg border border-line bg-panel-soft py-2 pl-9 pr-9 text-sm text-content placeholder:text-content-muted/70 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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

      {open && debounced.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-11 z-[600] overflow-hidden rounded-xl border border-line bg-panel shadow-panel animate-fade-in">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-xs text-content-muted">Sin coincidencias.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto scrollbar-thin divide-y divide-line/60">
              {results.map((device) => (
                <li key={device.deviceId}>
                  <button
                    type="button"
                    onClick={() => choose(device.deviceId)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-panel-soft"
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-content-muted" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-content">
                        {deviceLabel(device)}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-content-muted">
                        ID: {device.deviceId}
                        {device.uniqueId ? ` · UID: ${device.uniqueId}` : ''}
                      </span>
                      <span className="block text-[11px] text-content-muted">
                        {fmtCoord(device.coordinates?.lat ?? null, device.coordinates?.lng ?? null)}
                      </span>
                    </span>
                    <DeviceStatusBadge status={device.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
