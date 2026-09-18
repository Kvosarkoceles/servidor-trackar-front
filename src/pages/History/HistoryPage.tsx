import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FastForward,
  Pause,
  Play,
  RefreshCw,
  Rewind,
  Route,
  Search,
} from 'lucide-react';

import { TrailPolyline } from '@/components/maps/TrailPolyline';
import { MapView } from '@/components/maps/MapView';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, StatCard } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { Field, Input, Select } from '@/components/ui/Field';
import { SkeletonChart } from '@/components/ui/Skeleton';
import { Table, Pagination } from '@/components/tables/Table';
import { useDeviceHistory } from '@/hooks/useDeviceHistory';
import { useInterval } from '@/hooks/useUtils';
import { useDevicesStore } from '@/stores/devicesStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { deviceLabel, speedToKmh } from '@/utils/device';
import {
  fmtClock,
  fmtDateTime,
  fmtDistance,
  fmtDuration,
  fmtSpeed,
  fmtTime,
  toDateTimeLocalValue,
} from '@/utils/format';
import { DEFAULT_MAP_CENTER } from '@/utils/constants';
import type { LatLng } from '@/utils/geo';
import { cn } from '@/utils/cn';

const PLAYBACK_BASE_MS = 220;
const PLAYBACK_RATES = [1, 2, 4, 8] as const;

/**
 * Historial de recorridos + reproductor (requisitos 10 y 11).
 *
 * Datos: `GET /api/positions/:deviceId?from&to&limit`. El backend devuelve los
 * puntos más recientes primero y aplica un límite máximo de 5000 por consulta.
 */
export function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const devices = useDevicesStore((state) => state.devices);
  const selectDevice = useDevicesStore((state) => state.selectDevice);
  const selectedId = useDevicesStore((state) => state.selectedDeviceId);
  const speedUnit = useSettingsStore((state) => state.speedUnit);

  const now = useMemo(() => new Date(), []);
  const startOfDay = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const [deviceId, setDeviceId] = useState(searchParams.get('deviceId') ?? selectedId ?? '');
  const [from, setFrom] = useState(toDateTimeLocalValue(startOfDay));
  const [to, setTo] = useState(toDateTimeLocalValue(now));
  const [submitted, setSubmitted] = useState<{ deviceId: string; from: string; to: string } | null>(
    null,
  );

  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState<(typeof PLAYBACK_RATES)[number]>(1);
  const [playhead, setPlayhead] = useState(0);
  const [pointsPage, setPointsPage] = useState(1);

  const { positions, stats, meta, loading, error, reload } = useDeviceHistory({
    deviceId: submitted?.deviceId ?? null,
    from: submitted?.from,
    to: submitted?.to,
    limit: 5000,
    // Se recarga en cuanto se envía el formulario o llega deviceId por la URL.
    auto: true,
  });

  // Si la URL trae deviceId, se consulta automáticamente al entrar.
  useEffect(() => {
    const fromUrl = searchParams.get('deviceId');
    if (!fromUrl) return;
    setDeviceId(fromUrl);
    selectDevice(fromUrl);
    setSubmitted({
      deviceId: fromUrl,
      from: new Date(startOfDay).toISOString(),
      to: new Date().toISOString(),
    });
    // Solo al montar / cuando cambia el deviceId de la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('deviceId')]);

  const points: LatLng[] = useMemo(
    () => positions.map((position) => ({ lat: position.latitude, lng: position.longitude })),
    [positions],
  );

  // Reproductor: avanza un punto por tick, a la velocidad seleccionada.
  useInterval(
    () => {
      setPlayhead((current) => {
        if (current >= positions.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    },
    playing && positions.length > 1 ? Math.round(PLAYBACK_BASE_MS / rate) : null,
  );

  useEffect(() => {
    setPlayhead(0);
    setPlaying(false);
    setPointsPage(1);
  }, [positions]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!deviceId) return;
    selectDevice(deviceId);
    setSearchParams({ deviceId }, { replace: true });
    setSubmitted({
      deviceId,
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
    });
  };

  const currentPoint = positions[playhead];
  const progress = positions.length > 1 ? (playhead / (positions.length - 1)) * 100 : 0;
  const elapsedSeconds =
    currentPoint && positions[0]
      ? (new Date(currentPoint.timestamp ?? 0).getTime() -
          new Date(positions[0].timestamp ?? 0).getTime()) /
        1000
      : 0;
  const totalSeconds = stats?.spanSeconds ?? 0;

  const pageSize = 25;
  const pageItems = positions.slice((pointsPage - 1) * pageSize, pointsPage * pageSize);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-content">Historial de recorridos</h1>
        <p className="text-xs text-content-muted">
          Selecciona dispositivo y rango · los puntos se ordenan cronológicamente para trazar la ruta
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <form onSubmit={submit}>
          <CardBody className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="Dispositivo" className="md:col-span-2">
              {(id) => (
                <Select
                  id={id}
                  value={deviceId}
                  onChange={(event) => setDeviceId(event.target.value)}
                  options={[
                    { value: '', label: devices.length ? 'Selecciona un dispositivo…' : 'Sin dispositivos' },
                    ...devices.map((device) => ({
                      value: device.deviceId,
                      label: `${deviceLabel(device)} · ${device.deviceId}`,
                    })),
                  ]}
                  required
                />
              )}
            </Field>

            <Field label="Desde">
              {(id) => (
                <Input
                  id={id}
                  type="datetime-local"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Hasta">
              {(id) => (
                <Input
                  id={id}
                  type="datetime-local"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  required
                />
              )}
            </Field>

            <div className="md:col-span-4">
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={!deviceId}
                icon={<Search className="h-4 w-4" />}
              >
                Consultar
              </Button>
            </div>
          </CardBody>
        </form>
      </Card>

      {error ? (
        <Card>
          <ErrorState message={error.message} detail={error.detail} onRetry={() => void reload()} />
        </Card>
      ) : null}

      {!submitted ? (
        <Card>
          <EmptyState
            icon={<Route className="h-5 w-5" />}
            title="Selecciona un dispositivo y un rango de fechas"
            description="El recorrido se dibujará sobre el mapa con los puntos reales devueltos por GET /api/positions/:deviceId."
          />
        </Card>
      ) : null}

      {submitted && !loading && positions.length === 0 && !error ? (
        <Card>
          <EmptyState
            icon={<Route className="h-5 w-5" />}
            title="Sin posiciones en el rango"
            description="El backend no devolvió puntos para ese dispositivo en el intervalo seleccionado. Prueba con otro rango o verifica que el dispositivo haya reportado."
          />
        </Card>
      ) : null}

      {submitted && (positions.length > 0 || loading) ? (
        <>
          {/* Métricas del recorrido */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Kilómetros" value={fmtDistance(stats?.distanceKm ?? 0)} loading={loading && !stats} />
            <StatCard label="Duración" value={fmtDuration(stats?.spanSeconds ?? 0)} loading={loading && !stats} />
            <StatCard label="Vel. máxima" value={fmtSpeed(stats?.maxSpeedKmh ?? 0)} loading={loading && !stats} />
            <StatCard label="Vel. promedio" value={fmtSpeed(stats?.avgSpeedKmh ?? 0)} loading={loading && !stats} />
            <StatCard
              label="Puntos"
              value={meta?.count ?? 0}
              hint={`límite backend: ${meta?.limit ?? 5000}`}
              loading={loading && !stats}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {/* Mapa */}
            <Card className="overflow-hidden xl:col-span-2">
              <CardHeader
                title="Recorrido"
                subtitle={
                  currentPoint
                    ? `Reproduciendo ${fmtTime(currentPoint.timestamp)} · ${fmtSpeed(
                        speedToKmh(currentPoint.speed, speedUnit),
                      )}`
                    : 'Polilínea coloreada por velocidad'
                }
                icon={<Route className="h-4 w-4" />}
              />
              <div className="h-[460px]">
                {loading && positions.length === 0 ? (
                  <SkeletonChart height={460} />
                ) : (
                  <MapView
                    className="h-full rounded-none"
                    center={points[0] ?? DEFAULT_MAP_CENTER}
                    fitPoints={points}
                  >
                    <TrailPolyline
                      positions={positions}
                      speedUnit={speedUnit}
                      playheadIndex={playing || playhead > 0 ? playhead : null}
                    />
                  </MapView>
                )}
              </div>
            </Card>

            {/* Reproductor + resumen */}
            <div className="space-y-4">
              <Card>
                <CardHeader title="Reproducción" subtitle="x1 · x2 · x4 · x8" icon={<Play className="h-4 w-4" />} />
                <CardBody className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] tabular-nums text-content-muted">
                    <span>{fmtClock(elapsedSeconds)}</span>
                    <span>{fmtClock(totalSeconds)}</span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, positions.length - 1)}
                    value={playhead}
                    onChange={(event) => {
                      setPlaying(false);
                      setPlayhead(Number(event.target.value));
                    }}
                    aria-label="Posición en el recorrido"
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-line accent-brand-500"
                    style={{
                      background: `linear-gradient(to right, #2f83f6 ${progress}%, rgb(var(--line)) ${progress}%)`,
                    }}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => setPlayhead((value) => Math.max(0, value - 1))}
                      aria-label="Retroceder un punto"
                      title="Retroceder"
                    >
                      <Rewind className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="primary"
                      onClick={() => setPlaying((value) => !value)}
                      disabled={positions.length < 2}
                      aria-label={playing ? 'Pausar' : 'Reproducir'}
                      icon={
                        playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />
                      }
                    >
                      {playing ? 'Pausar' : 'Reproducir'}
                    </Button>

                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() =>
                        setPlayhead((value) => Math.min(positions.length - 1, value + 1))
                      }
                      aria-label="Avanzar un punto"
                      title="Avanzar"
                    >
                      <FastForward className="h-4 w-4" />
                    </Button>

                    <div className="ml-auto flex gap-1" role="group" aria-label="Velocidad de reproducción">
                      {PLAYBACK_RATES.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setRate(option)}
                          aria-pressed={rate === option}
                          className={cn(
                            'rounded-md border px-2 py-1 text-[11px] font-medium tabular-nums transition-colors',
                            rate === option
                              ? 'border-brand-500/40 bg-brand-500/10 text-brand-400'
                              : 'border-line text-content-muted hover:text-content',
                          )}
                        >
                          x{option}
                        </button>
                      ))}
                    </div>
                  </div>

                  {currentPoint ? (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line pt-3 text-[11px]">
                      <dt className="text-content-muted">Hora</dt>
                      <dd className="text-right tabular-nums text-content">
                        {fmtDateTime(currentPoint.timestamp)}
                      </dd>
                      <dt className="text-content-muted">Velocidad</dt>
                      <dd className="text-right tabular-nums text-content">
                        {fmtSpeed(speedToKmh(currentPoint.speed, speedUnit))}
                      </dd>
                      <dt className="text-content-muted">Altitud</dt>
                      <dd className="text-right tabular-nums text-content">
                        {currentPoint.altitude !== null ? `${Math.round(currentPoint.altitude)} m` : '—'}
                      </dd>
                      <dt className="text-content-muted">Batería</dt>
                      <dd className="text-right tabular-nums text-content">
                        {currentPoint.battery !== null ? `${currentPoint.battery} %` : '—'}
                      </dd>
                    </dl>
                  ) : null}
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Tiempos"
                  subtitle="Calculados desde los intervalos entre puntos"
                  icon={<RefreshCw className="h-4 w-4" />}
                />
                <CardBody>
                  <dl className="divide-y divide-line/60">
                    <div className="flex items-center justify-between py-1.5">
                      <dt className="text-xs text-content-muted">En movimiento</dt>
                      <dd className="text-xs tabular-nums text-status-moving">
                        {fmtDuration(stats?.movingSeconds ?? 0)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <dt className="text-xs text-content-muted">Detenido</dt>
                      <dd className="text-xs tabular-nums text-status-stopped">
                        {fmtDuration(stats?.stoppedSeconds ?? 0)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-content-muted">
                    Las paradas y los eventos del recorrido (geocercas, excesos, alertas) requerirían
                    un endpoint de eventos en el backend; aquí solo se muestran los tiempos derivados
                    de la velocidad real.
                  </p>
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Tabla de puntos */}
          <Card className="overflow-hidden">
            <CardHeader title="Puntos del recorrido" subtitle="Orden cronológico ascendente" />
            <Table
              caption="Puntos de posición del recorrido seleccionado"
              headers={['#', 'Hora', 'Latitud', 'Longitud', 'Velocidad', 'Rumbo', 'Altitud', 'Batería']}
            >
              {pageItems.map((point, index) => {
                const absoluteIndex = (pointsPage - 1) * pageSize + index;
                return (
                  <tr key={`${point.timestamp}-${absoluteIndex}`} className="hover:bg-panel-soft/60">
                    <td className="px-4 py-2 tabular-nums text-content-muted">{absoluteIndex + 1}</td>
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums text-content">
                      {fmtTime(point.timestamp)}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-content-muted">
                      {point.latitude.toFixed(5)}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-content-muted">
                      {point.longitude.toFixed(5)}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-content">
                      {fmtSpeed(speedToKmh(point.speed, speedUnit))}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-content-muted">
                      {point.bearing !== null ? `${Math.round(point.bearing)}°` : '—'}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-content-muted">
                      {point.altitude !== null ? `${Math.round(point.altitude)} m` : '—'}
                    </td>
                    <td className="px-4 py-2 tabular-nums text-content-muted">
                      {point.battery !== null ? `${point.battery} %` : '—'}
                    </td>
                  </tr>
                );
              })}
            </Table>
            <Pagination
              page={pointsPage}
              pageSize={pageSize}
              total={positions.length}
              onPageChange={setPointsPage}
            />
          </Card>
        </>
      ) : null}
    </div>
  );
}
