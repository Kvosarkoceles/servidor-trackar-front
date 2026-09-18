import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Cpu,
  Gauge,
  Move,
  Octagon,
  RefreshCw,
  Route,
  SignalZero,
  Timer,
} from 'lucide-react';

import { CategoryBarChart, DistanceChart, SpeedChart, StatusPieChart } from '@/components/charts/Charts';
import { DeviceStatusBadge } from '@/components/devices/DeviceStatusBadge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, StatCard } from '@/components/ui/Card';
import { ErrorState, InfoNote } from '@/components/ui/Feedback';
import { SkeletonChart } from '@/components/ui/Skeleton';
import { getFleetAggregate, todayRange, STATS_THRESHOLDS } from '@/api/statistics';
import { useEventCounts } from '@/hooks/useEventCounts';
import { useDevicesStore } from '@/stores/devicesStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { deviceLabel } from '@/utils/device';
import { fmtDistance, fmtDuration, fmtNumber, fmtRelative, fmtSpeed } from '@/utils/format';
import { toAppError, logError, type AppError } from '@/utils/errors';
import { ROUTES } from '@/utils/constants';
import type { FleetAggregate } from '@/api/statistics';

/**
 * Dashboard principal (requisito 4).
 *
 * Los contadores de dispositivos son DIRECTOS del backend. Las métricas de hoy
 * (distancia, velocidades, tiempos) se calculan a partir del historial real de
 * posiciones, y los eventos proceden de `GET /api/events`.
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const devices = useDevicesStore((state) => state.devices);
  const devicesLoading = useDevicesStore((state) => state.loading);
  const settings = useSettingsStore();

  const [aggregate, setAggregate] = useState<FleetAggregate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Firma estable de dispositivos: evita recalcular en cada refresco (5 s).
  const signature = useMemo(
    () =>
      devices
        .filter((device) => device.lastPosition !== null)
        .slice(0, settings.dashboardMaxDevices)
        .map((device) => device.deviceId)
        .join('|'),
    [devices, settings.dashboardMaxDevices],
  );

  const load = useCallback(async () => {
    if (signature === '') {
      setAggregate(null);
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const result = await getFleetAggregate(devices, {
        range: todayRange(),
        speedUnit: settings.speedUnit,
        maxDevices: settings.dashboardMaxDevices,
        signal: controller.signal,
      });
      setAggregate(result);
    } catch (caught) {
      const appError = (caught as AppError)?.kind ? (caught as AppError) : toAppError(caught);
      if (appError.kind === 'canceled') return;
      logError('DashboardPage', caught);
      setError(appError);
    } finally {
      setLoading(false);
    }
    // `signature` resume los dispositivos relevantes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, settings.speedUnit, settings.dashboardMaxDevices]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const stats = aggregate?.stats;
  const moving = devices.filter((device) => device.status === 'moving').length;
  const stopped = devices.filter((device) => device.status === 'stopped').length;
  const offline = devices.filter((device) => device.status === 'offline').length;
  const unknown = devices.filter((device) => device.status === 'unknown').length;

  // Eventos de hoy derivados por el backend (`GET /api/events`).
  const eventsRange = useMemo(() => {
    const range = todayRange();
    return { from: range.from.toISOString(), to: range.to.toISOString() };
  }, []);
  const {
    events: todayEvents,
    counts: eventCounts,
    loading: eventsLoading,
  } = useEventCounts(eventsRange);

  const statusData = [
    { name: 'En movimiento', value: moving, color: '#22c55e' },
    { name: 'Detenidos', value: stopped, color: '#f59e0b' },
    { name: 'Sin conexión', value: offline, color: '#ef4444' },
    { name: 'Sin datos', value: unknown, color: '#64748b' },
  ];

  const recent = useMemo(
    () =>
      [...devices]
        .sort((a, b) => new Date(b.lastSeenAt ?? 0).getTime() - new Date(a.lastSeenAt ?? 0).getTime())
        .slice(0, 6),
    [devices],
  );

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-content">Panel de control</h1>
          <p className="text-xs text-content-muted">
            Resumen de hoy · actualización automática cada {Math.round(settings.pollingMs / 1000)} s
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => void load()}
          loading={loading}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Recalcular métricas
        </Button>
      </div>

      {/* Contadores directos del backend */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Dispositivos"
          value={devices.length}
          loading={devicesLoading && devices.length === 0}
          icon={<Cpu className="h-4 w-4 text-brand-400" />}
          hint="GET /api/devices"
        />
        <StatCard
          label="En movimiento"
          value={moving}
          loading={devicesLoading && devices.length === 0}
          accent="text-status-moving"
          icon={<Move className="h-4 w-4 text-status-moving" />}
          hint={`velocidad > ${STATS_THRESHOLDS.movingSpeedKmh} km/h`}
        />
        <StatCard
          label="Detenidos"
          value={stopped}
          loading={devicesLoading && devices.length === 0}
          accent="text-status-stopped"
          icon={<Octagon className="h-4 w-4 text-status-stopped" />}
          hint="reportando, sin movimiento"
        />
        <StatCard
          label="Sin conexión"
          value={offline}
          loading={devicesLoading && devices.length === 0}
          accent="text-status-offline"
          icon={<SignalZero className="h-4 w-4 text-status-offline" />}
          hint={`> ${Math.round(STATS_THRESHOLDS.offlineSeconds / 60)} min sin reportar`}
        />
      </div>

      {/* Métricas calculadas desde el historial real */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard
          label="Distancia hoy"
          value={fmtDistance(stats?.distanceKm ?? 0)}
          loading={loading && !aggregate}
          icon={<Route className="h-4 w-4 text-brand-400" />}
        />
        <StatCard
          label="Vel. promedio"
          value={fmtSpeed(stats?.avgSpeedKmh ?? 0)}
          loading={loading && !aggregate}
          icon={<Gauge className="h-4 w-4 text-brand-400" />}
        />
        <StatCard
          label="Vel. máxima"
          value={fmtSpeed(stats?.maxSpeedKmh ?? 0)}
          loading={loading && !aggregate}
          icon={<Gauge className="h-4 w-4 text-status-stopped" />}
        />
        <StatCard
          label="En movimiento"
          value={fmtDuration(stats?.movingSeconds ?? 0)}
          loading={loading && !aggregate}
          icon={<Timer className="h-4 w-4 text-status-moving" />}
        />
        <StatCard
          label="Detenido"
          value={fmtDuration(stats?.stoppedSeconds ?? 0)}
          loading={loading && !aggregate}
          icon={<Timer className="h-4 w-4 text-status-stopped" />}
        />
        <StatCard
          label="Eventos hoy"
          value={eventsLoading ? '…' : fmtNumber(todayEvents.length)}
          hint="GET /api/events"
          icon={<AlertTriangle className="h-4 w-4 text-status-stopped" />}
        />
      </div>

      {error ? (
        <Card>
          <ErrorState message={error.message} detail={error.detail} onRetry={() => void load()} />
        </Card>
      ) : null}

      {/* Gráficas */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Distancia recorrida hoy"
            subtitle="Kilómetros por hora (agregado de la flota)"
            icon={<Route className="h-4 w-4" />}
          />
          <CardBody>
            {loading && !aggregate ? (
              <SkeletonChart />
            ) : (
              <DistanceChart data={aggregate?.distanceByBucket ?? []} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Velocidad de la flota"
            subtitle="Promedio y máxima por hora"
            icon={<Activity className="h-4 w-4" />}
          />
          <CardBody>
            {loading && !aggregate ? (
              <SkeletonChart />
            ) : (
              <SpeedChart data={aggregate?.speedByBucket ?? []} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Estado de dispositivos"
            subtitle="Distribución actual"
            icon={<Cpu className="h-4 w-4" />}
          />
          <CardBody>
            <StatusPieChart data={statusData} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Eventos por categoría"
            subtitle="Detectados hoy por el backend"
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <CardBody>
            {eventsLoading ? (
              <SkeletonChart />
            ) : (
              <CategoryBarChart
                data={eventCounts}
                emptyTitle="Sin eventos hoy"
                emptyDescription="El backend no ha detectado eventos (exceso de velocidad, detenciones, batería baja, pérdida de GPS o desconexión) en el rango de hoy."
              />
            )}
          </CardBody>
        </Card>
      </div>

      {stats?.truncated ? (
        <InfoNote title="Métricas agregadas parcialmente">
          <p>
            Para no saturar el backend, el cálculo de métricas de hoy usa{' '}
            <span className="font-mono">{settings.dashboardMaxDevices}</span> dispositivos con
            posición ({stats.devicesWithHistory} consultados). Ajusta{' '}
            <span className="font-mono">VITE_DASHBOARD_MAX_DEVICES</span> si necesitas agregar todo
            el parque.
          </p>
        </InfoNote>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Actividad reciente"
            subtitle="Últimos dispositivos en reportar"
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(ROUTES.devices)}
                icon={<ArrowRight className="h-3.5 w-3.5" />}
              >
                Ver todos
              </Button>
            }
          />
          <CardBody className="p-0">
            {recent.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-content-muted">
                Aún no hay dispositivos reportando posiciones.
              </p>
            ) : (
              <ul className="divide-y divide-line/60">
                {recent.map((device) => (
                  <li key={device.deviceId}>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`${ROUTES.devices}/${encodeURIComponent(device.deviceId)}`)
                      }
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-panel-soft"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-content">
                          {deviceLabel(device)}
                        </span>
                        <span className="block truncate font-mono text-[11px] text-content-muted">
                          {device.deviceId}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="text-xs tabular-nums text-content-muted">
                          {fmtSpeed(device.speedKmh)}
                        </span>
                        <DeviceStatusBadge status={device.status} />
                        <span className="hidden text-[11px] text-content-muted sm:inline">
                          {fmtRelative(device.lastSeenAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Calidad de datos" icon={<Activity className="h-4 w-4" />} />
          <CardBody className="space-y-3 text-xs text-content-muted">
            <div className="flex items-center justify-between">
              <span>Dispositivos con posición</span>
              <span className="font-medium text-content">
                {devices.filter((device) => device.coordinates !== null).length} / {devices.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Consultados para métricas</span>
              <span className="font-medium text-content">{stats?.devicesWithHistory ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Sin datos ({'<'} 2 puntos)</span>
              <span className="font-medium text-content">{unknown}</span>
            </div>
            <p className="border-t border-line pt-3 leading-relaxed">
              Los estados y métricas se derivan en el cliente a partir de la última posición real
              del backend. No se muestran datos simulados.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
