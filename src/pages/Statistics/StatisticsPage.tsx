import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, BarChart3, Clock, Gauge, RefreshCw, Route } from 'lucide-react';

import { CategoryBarChart, DistanceChart, SpeedChart, TimeBarChart } from '@/components/charts/Charts';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, StatCard } from '@/components/ui/Card';
import { EmptyState, ErrorState, InfoNote } from '@/components/ui/Feedback';
import { Field, Input, Select } from '@/components/ui/Field';
import { SkeletonChart } from '@/components/ui/Skeleton';
import { Table } from '@/components/tables/Table';
import { getFleetAggregate, lastDaysRange, todayRange, type FleetAggregate } from '@/api/statistics';
import { useDeviceHistory } from '@/hooks/useDeviceHistory';
import { useDevicesStore } from '@/stores/devicesStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { deviceLabel } from '@/utils/device';
import { fmtDistance, fmtDuration, fmtSpeed, toDateTimeLocalValue } from '@/utils/format';
import { toAppError, logError, type AppError } from '@/utils/errors';

type PeriodId = 'today' | '7d' | '30d' | 'custom';

const PERIODS = [
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'custom', label: 'Personalizado' },
];

/**
 * Estadísticas (requisito 12).
 *
 * ⚠ El backend no tiene endpoint de estadísticas: todas las métricas se derivan
 * del historial real de posiciones (`GET /api/positions/:deviceId`). Se puede
 * analizar un dispositivo concreto o agregar el parque (limitado por
 * `VITE_DASHBOARD_MAX_DEVICES` para no saturar el backend).
 */
export function StatisticsPage() {
  const devices = useDevicesStore((state) => state.devices);
  const settings = useSettingsStore();

  const initialFrom = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const [deviceId, setDeviceId] = useState('all');
  const [period, setPeriod] = useState<PeriodId>('today');
  const [customFrom, setCustomFrom] = useState(toDateTimeLocalValue(initialFrom));
  const [customTo, setCustomTo] = useState(toDateTimeLocalValue(new Date()));

  const range = useMemo(() => {
    switch (period) {
      case '7d':
        return lastDaysRange(7);
      case '30d':
        return lastDaysRange(30);
      case 'custom':
        return { from: new Date(customFrom), to: new Date(customTo) };
      default:
        return todayRange();
    }
  }, [period, customFrom, customTo]);

  const isSingle = deviceId !== 'all';

  // --- Un solo dispositivo ---
  const single = useDeviceHistory({
    deviceId: isSingle ? deviceId : null,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    limit: 5000,
    auto: true,
  });

  // --- Toda la flota ---
  const [fleet, setFleet] = useState<FleetAggregate | null>(null);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [fleetError, setFleetError] = useState<AppError | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const loadFleet = useCallback(async () => {
    if (isSingle) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setFleetLoading(true);
    setFleetError(null);

    try {
      const result = await getFleetAggregate(devices, {
        range,
        speedUnit: settings.speedUnit,
        maxDevices: settings.dashboardMaxDevices,
        signal: controller.signal,
      });
      setFleet(result);
    } catch (caught) {
      const appError = (caught as AppError)?.kind ? (caught as AppError) : toAppError(caught);
      if (appError.kind === 'canceled') return;
      logError('StatisticsPage', caught);
      setFleetError(appError);
    } finally {
      setFleetLoading(false);
    }
  }, [isSingle, devices, range, settings.speedUnit, settings.dashboardMaxDevices]);

  useEffect(() => {
    void loadFleet();
  }, [loadFleet]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const stats = isSingle ? single.stats : fleet?.stats ?? null;
  const loading = isSingle ? single.loading : fleetLoading;
  const error = isSingle ? single.error : fleetError;

  const distanceSeries = isSingle ? single.stats?.distanceByBucket ?? [] : fleet?.distanceByBucket ?? [];
  const speedSeries = isSingle ? single.stats?.speedByBucket ?? [] : fleet?.speedByBucket ?? [];

  const timeData = stats
    ? [
        { label: 'En movimiento', value: stats.movingSeconds, color: '#22c55e' },
        { label: 'Detenido', value: stats.stoppedSeconds, color: '#f59e0b' },
      ]
    : [];

  /** Nº de puntos analizados (en flota se suman los de cada dispositivo). */
  const analyzedPoints = isSingle
    ? single.stats?.positionCount ?? 0
    : fleet?.perDevice.reduce((total, item) => total + item.positionCount, 0) ?? 0;

  const reload = () => {
    if (isSingle) void single.reload();
    else void loadFleet();
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-content">Estadísticas</h1>
          <p className="text-xs text-content-muted">
            Métricas calculadas desde el historial real de posiciones
          </p>
        </div>
        <Button size="sm" onClick={reload} loading={loading} icon={<RefreshCw className="h-3.5 w-3.5" />}>
          Recalcular
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardBody className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="Dispositivo" className="md:col-span-2">
            {(id) => (
              <Select
                id={id}
                value={deviceId}
                onChange={(event) => setDeviceId(event.target.value)}
                options={[
                  { value: 'all', label: `Toda la flota (${devices.length} dispositivos)` },
                  ...devices.map((device) => ({
                    value: device.deviceId,
                    label: `${deviceLabel(device)} · ${device.deviceId}`,
                  })),
                ]}
              />
            )}
          </Field>

          <Field label="Periodo">
            {(id) => (
              <Select
                id={id}
                value={period}
                onChange={(event) => setPeriod(event.target.value as PeriodId)}
                options={PERIODS}
              />
            )}
          </Field>

          {period === 'custom' ? (
            <div className="grid grid-cols-2 gap-2 md:col-span-1">
              <Field label="Desde">
                {(id) => (
                  <Input
                    id={id}
                    type="datetime-local"
                    value={customFrom}
                    onChange={(event) => setCustomFrom(event.target.value)}
                  />
                )}
              </Field>
              <Field label="Hasta">
                {(id) => (
                  <Input
                    id={id}
                    type="datetime-local"
                    value={customTo}
                    onChange={(event) => setCustomTo(event.target.value)}
                  />
                )}
              </Field>
            </div>
          ) : (
            <div className="hidden md:block" />
          )}
        </CardBody>
      </Card>

      {error ? (
        <Card>
          <ErrorState message={error.message} detail={error.detail} onRetry={reload} />
        </Card>
      ) : null}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Distancia"
          value={fmtDistance(stats?.distanceKm ?? 0)}
          loading={loading && !stats}
          icon={<Route className="h-4 w-4 text-brand-400" />}
        />
        <StatCard
          label="Vel. máxima"
          value={fmtSpeed(stats?.maxSpeedKmh ?? 0)}
          loading={loading && !stats}
          icon={<Gauge className="h-4 w-4 text-status-stopped" />}
        />
        <StatCard
          label="Vel. promedio"
          value={fmtSpeed(stats?.avgSpeedKmh ?? 0)}
          loading={loading && !stats}
          icon={<Gauge className="h-4 w-4 text-brand-400" />}
        />
        <StatCard
          label="Tiempo en movimiento"
          value={fmtDuration(stats?.movingSeconds ?? 0)}
          loading={loading && !stats}
          icon={<Activity className="h-4 w-4 text-status-moving" />}
        />
        <StatCard
          label="Tiempo detenido"
          value={fmtDuration(stats?.stoppedSeconds ?? 0)}
          loading={loading && !stats}
          icon={<Clock className="h-4 w-4 text-status-stopped" />}
        />
      </div>

      {!loading && analyzedPoints === 0 ? (
        <Card>
          <EmptyState
            icon={<BarChart3 className="h-5 w-5" />}
            title="Sin datos en el periodo seleccionado"
            description="No se encontraron posiciones para los filtros actuales. Cambia el periodo o el dispositivo."
          />
        </Card>
      ) : null}

      {/* Gráficas */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Kilómetros por intervalo"
            subtitle={period === 'today' ? 'Agrupado por hora' : 'Agrupado por día'}
            icon={<Route className="h-4 w-4" />}
          />
          <CardBody>
            {loading && !stats ? <SkeletonChart /> : <DistanceChart data={distanceSeries} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Velocidad"
            subtitle="Promedio y máxima"
            icon={<Gauge className="h-4 w-4" />}
          />
          <CardBody>
            {loading && !stats ? <SkeletonChart /> : <SpeedChart data={speedSeries} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Tiempo por estado"
            subtitle="Derivado de la velocidad real por intervalo"
            icon={<Clock className="h-4 w-4" />}
          />
          <CardBody>
            {loading && !stats ? <SkeletonChart /> : <TimeBarChart data={timeData} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Eventos"
            subtitle="Requiere GET /api/events en el backend"
            icon={<Activity className="h-4 w-4" />}
          />
          <CardBody>
            <CategoryBarChart
              data={[]}
              emptyTitle="Sin endpoint de eventos"
              emptyDescription="El backend no registra eventos (exceso de velocidad, geocercas, detenciones), por lo que no hay datos que graficar."
            />
          </CardBody>
        </Card>
      </div>

      {/* Desglose por dispositivo */}
      {!isSingle && fleet && fleet.perDevice.length > 0 ? (
        <Card className="overflow-hidden">
          <CardHeader
            title="Desglose por dispositivo"
            subtitle={`${fleet.perDevice.length} dispositivos con historial en el periodo`}
          />
          <Table
            caption="Estadísticas por dispositivo"
            headers={['Dispositivo', 'Distancia', 'Vel. máxima', 'Vel. promedio', 'En movimiento', 'Detenido', 'Puntos']}
          >
            {fleet.perDevice.map((item) => {
              const device = devices.find((d) => d.deviceId === item.deviceId);
              return (
                <tr key={item.deviceId} className="hover:bg-panel-soft/60">
                  <td className="px-4 py-2">
                    <p className="text-sm text-content">
                      {device ? deviceLabel(device) : item.deviceId}
                    </p>
                    <p className="font-mono text-[11px] text-content-muted">{item.deviceId}</p>
                  </td>
                  <td className="px-4 py-2 tabular-nums text-content">{fmtDistance(item.distanceKm)}</td>
                  <td className="px-4 py-2 tabular-nums text-content">{fmtSpeed(item.maxSpeedKmh)}</td>
                  <td className="px-4 py-2 tabular-nums text-content">{fmtSpeed(item.avgSpeedKmh)}</td>
                  <td className="px-4 py-2 tabular-nums text-status-moving">
                    {fmtDuration(item.movingSeconds)}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-status-stopped">
                    {fmtDuration(item.stoppedSeconds)}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-content-muted">{item.positionCount}</td>
                </tr>
              );
            })}
          </Table>
        </Card>
      ) : null}

      {fleet?.stats.truncated ? (
        <InfoNote title="Agregado parcial de la flota">
          <p>
            Se consultaron {fleet.stats.devicesWithHistory} de {fleet.stats.deviceCount} dispositivos
            para limitar la carga del backend. Ajusta{' '}
            <span className="font-mono">VITE_DASHBOARD_MAX_DEVICES</span> o selecciona un
            dispositivo concreto para métricas completas.
          </p>
        </InfoNote>
      ) : null}
    </div>
  );
}
