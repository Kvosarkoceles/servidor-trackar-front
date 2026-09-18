import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, History, Info, List, X } from 'lucide-react';

import { DeviceListPanel } from '@/components/devices/DeviceListPanel';
import { DeviceStatusBadge } from '@/components/devices/DeviceStatusBadge';
import { ClusterLayer } from '@/components/maps/ClusterLayer';
import { MapView, type MapFocus } from '@/components/maps/MapView';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/Feedback';
import { useDevicesStore } from '@/stores/devicesStore';
import { deviceLabel, STATUS_META } from '@/utils/device';
import {
  fmtBattery,
  fmtBearing,
  fmtCoord,
  fmtDateTime,
  fmtRelative,
  fmtSpeed,
} from '@/utils/format';
import { reverseGeocode, peekCachedAddress } from '@/utils/geocode';
import { useSettingsStore } from '@/stores/settingsStore';
import { ROUTES } from '@/utils/constants';
import { cn } from '@/utils/cn';

/**
 * Rastreo en tiempo real (requisito 5) — módulo principal.
 *
 * Fuente de datos: `GET /api/devices` en polling (incluye la última posición de
 * cada dispositivo), por lo que un solo ciclo actualiza todo el mapa.
 * El estado "en movimiento / detenido / sin conexión" y el rumbo se derivan de
 * los campos reales `lastSpeed`, `lastBearing` y `lastSeenAt`.
 */
export function LiveTrackingPage() {
  const navigate = useNavigate();
  const devices = useDevicesStore((state) => state.devices);
  const loading = useDevicesStore((state) => state.loading);
  const error = useDevicesStore((state) => state.error);
  const selectedId = useDevicesStore((state) => state.selectedDeviceId);
  const selectDevice = useDevicesStore((state) => state.selectDevice);
  const fetchDevices = useDevicesStore((state) => state.fetchDevices);

  const geocoding = useSettingsStore((state) => state.geocoding);

  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [autoFit, setAutoFit] = useState(true);
  const [listOpen, setListOpen] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  const selected = useMemo(
    () => (selectedId ? devices.find((device) => device.deviceId === selectedId) ?? null : null),
    [devices, selectedId],
  );

  const points = useMemo(
    () =>
      devices
        .filter((device) => device.coordinates !== null)
        .map((device) => device.coordinates!),
    [devices],
  );

  // Encuadre automático solo la primera vez que hay posiciones.
  useEffect(() => {
    if (!autoFit || points.length === 0) return;
    const timer = setTimeout(() => setAutoFit(false), 1200);
    return () => clearTimeout(timer);
  }, [autoFit, points.length]);

  // Dirección aproximada del dispositivo seleccionado (opcional, con caché).
  useEffect(() => {
    setAddress(null);
    if (!geocoding || !selected?.coordinates) return;

    const { lat, lng } = selected.coordinates;
    const cached = peekCachedAddress(lat, lng);
    if (cached !== undefined) {
      setAddress(cached);
      return;
    }

    let active = true;
    void reverseGeocode(lat, lng).then((value) => {
      if (active) setAddress(value);
    });
    return () => {
      active = false;
    };
  }, [geocoding, selected?.coordinates?.lat, selected?.coordinates?.lng, selected?.coordinates]);

  const centerOn = useCallback(
    (deviceId: string) => {
      const device = devices.find((item) => item.deviceId === deviceId);
      if (!device?.coordinates) return;
      selectDevice(deviceId);
      setAutoFit(false);
      setFocus({ center: device.coordinates, zoom: 16, nonce: Date.now() });
      setListOpen(false);
    },
    [devices, selectDevice],
  );

  const overlay = (
    <div className="pointer-events-auto flex flex-col gap-2">
      <div className="rounded-lg border border-line bg-panel/95 px-3 py-2 shadow-panel backdrop-blur">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-content-muted">
          Estados
        </p>
        <ul className="space-y-1">
          {(['moving', 'stopped', 'offline'] as const).map((status) => (
            <li key={status} className="flex items-center gap-2 text-[11px] text-content">
              <span className={cn('h-2 w-2 rounded-full', STATUS_META[status].dot)} aria-hidden />
              {STATUS_META[status].label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 lg:flex-row">
      {/* Panel lateral de dispositivos (drawer en móvil) */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-[600] h-[65vh] transition-transform lg:static lg:z-auto lg:h-auto lg:w-80 lg:shrink-0 lg:translate-y-0',
          listOpen ? 'translate-y-0' : 'translate-y-[calc(100%-3.25rem)]',
        )}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-t-2xl border border-line bg-panel lg:rounded-xl">
          <button
            type="button"
            onClick={() => setListOpen((value) => !value)}
            className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4 py-2.5 lg:hidden"
            aria-expanded={listOpen}
          >
            <span className="flex items-center gap-2 text-xs font-medium text-content">
              <List className="h-4 w-4" aria-hidden />
              Dispositivos ({devices.length})
            </span>
            <ChevronDown
              className={cn('h-4 w-4 text-content-muted transition-transform', listOpen && 'rotate-180')}
              aria-hidden
            />
          </button>

          <div className="min-h-0 flex-1">
            <DeviceListPanel
              devices={devices}
              selectedId={selectedId}
              loading={loading}
              onSelect={(deviceId) => {
                selectDevice(deviceId);
                setAutoFit(false);
              }}
              onCenter={centerOn}
              className="h-full rounded-none border-0 shadow-none lg:rounded-xl lg:border lg:shadow-panel"
            />
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="relative min-h-[60vh] flex-1 lg:min-h-0">
        {error && devices.length === 0 ? (
          <Card className="h-full">
            <ErrorState
              message={error.message}
              detail={error.detail}
              onRetry={() => void fetchDevices()}
            />
          </Card>
        ) : (
          <MapView className="h-full" fitPoints={points} autoFit={autoFit} focus={focus} overlay={overlay}>
            <ClusterLayer devices={devices} selectedId={selectedId} onSelect={selectDevice} />
          </MapView>
        )}

        {/* Ficha del dispositivo seleccionado */}
        {selected ? (
          <div className="absolute left-3 top-3 z-[450] w-[min(22rem,calc(100%-1.5rem))] animate-fade-in">
            <div className="rounded-xl border border-line bg-panel/97 p-3 shadow-panel backdrop-blur">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-content">
                    {deviceLabel(selected)}
                  </p>
                  <p className="truncate font-mono text-[11px] text-content-muted">
                    {selected.deviceId}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => selectDevice(null)}
                  aria-label="Cerrar ficha del dispositivo"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <DeviceStatusBadge status={selected.status} />
                <Badge>{fmtSpeed(selected.speedKmh)}</Badge>
                <Badge>{fmtBearing(selected.lastPosition?.bearing ?? null)}</Badge>
              </div>

              <dl className="mt-2.5 space-y-1 text-[11px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-content-muted">Coordenadas</dt>
                  <dd className="tabular-nums text-content">
                    {fmtCoord(selected.coordinates?.lat ?? null, selected.coordinates?.lng ?? null)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-content-muted">Última actualización</dt>
                  <dd className="text-content">{fmtRelative(selected.lastSeenAt)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-content-muted">Último contacto</dt>
                  <dd className="tabular-nums text-content">{fmtDateTime(selected.lastSeenAt)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-content-muted">Batería</dt>
                  <dd className="text-content">
                    {fmtBattery(selected.lastPosition?.battery ?? null)}
                  </dd>
                </div>
                {address ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-content-muted">Dirección aprox.</dt>
                    <dd className="max-w-[60%] truncate text-right text-content" title={address}>
                      {address}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  className="flex-1"
                  onClick={() => navigate(`${ROUTES.devices}/${encodeURIComponent(selected.deviceId)}`)}
                  icon={<Info className="h-3.5 w-3.5" />}
                >
                  Detalle
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() =>
                    navigate(`${ROUTES.history}?deviceId=${encodeURIComponent(selected.deviceId)}`)
                  }
                  icon={<History className="h-3.5 w-3.5" />}
                >
                  Historial
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
