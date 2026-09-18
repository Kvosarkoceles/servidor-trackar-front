import { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, Filter, RefreshCw, ServerCog } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, InfoNote } from '@/components/ui/Feedback';
import { Field, Input, Select } from '@/components/ui/Field';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Table } from '@/components/tables/Table';
import { listEvents } from '@/api/events';
import { useDevicesStore } from '@/stores/devicesStore';
import { deviceLabel } from '@/utils/device';
import { EVENT_TYPE_META, EVENT_TYPE_ORDER } from '@/utils/events';
import { fmtCoord, fmtDateTime } from '@/utils/format';
import { toAppError, logError, type AppError } from '@/utils/errors';
import type { GpsEvent, GpsEventType } from '@/types';

const EVENT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos los tipos' },
  ...EVENT_TYPE_ORDER.map((type) => ({ value: type, label: EVENT_TYPE_META[type].label })),
];

/** Convierte un valor de `<input type="datetime-local">` a ISO 8601. */
function toIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * Eventos y alertas (requisito 13).
 *
 * Datos reales de `GET /api/events`: el backend deriva los eventos del historial
 * de posiciones y de la última conexión de cada dispositivo, por lo que no hay
 * datos simulados.
 */
export function EventsPage() {
  const devices = useDevicesStore((state) => state.devices);

  const [deviceId, setDeviceId] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [events, setEvents] = useState<GpsEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await listEvents(
        {
          deviceId: deviceId || undefined,
          type: type ? (type as GpsEventType) : undefined,
          from: toIso(from),
          to: toIso(to),
          limit: 500,
        },
        controller.signal,
      );
      setEvents(result);
    } catch (caught) {
      const appError = (caught as AppError)?.kind ? (caught as AppError) : toAppError(caught);
      if (appError.kind === 'canceled') return;
      logError('EventsPage', caught);
      setError(appError);
    } finally {
      setLoading(false);
    }
  }, [deviceId, type, from, to]);

  // Carga inicial con los últimos eventos registrados.
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const resetFilters = () => {
    setDeviceId('');
    setType('');
    setFrom('');
    setTo('');
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-content">Eventos y alertas</h1>
        <p className="text-xs text-content-muted">
          Historial de eventos por dispositivo, tipo y fecha
        </p>
      </div>

      <InfoNote title="Eventos derivados en el servidor">
        El backend calcula estos eventos a partir del historial real de posiciones y del último
        contacto de cada dispositivo, con umbrales configurables (velocidad, batería, minutos sin
        GPS y tiempo offline). No se generan datos simulados.
      </InfoNote>

      <Card>
        <CardHeader
          title="Filtros"
          subtitle="Dispositivo, tipo de evento y rango de fechas"
          icon={<Filter className="h-4 w-4" />}
        />
        <CardBody className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="Dispositivo">
            {(id) => (
              <Select
                id={id}
                value={deviceId}
                onChange={(event) => setDeviceId(event.target.value)}
                options={[
                  { value: '', label: 'Todos los dispositivos' },
                  ...devices.map((device) => ({
                    value: device.deviceId,
                    label: `${deviceLabel(device)} · ${device.deviceId}`,
                  })),
                ]}
              />
            )}
          </Field>

          <Field label="Tipo de evento">
            {(id) => (
              <Select
                id={id}
                value={type}
                onChange={(event) => setType(event.target.value)}
                options={EVENT_OPTIONS}
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
              />
            )}
          </Field>

          <div className="md:col-span-4 flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void load()}
              loading={loading}
              icon={<Filter className="h-4 w-4" />}
            >
              Consultar eventos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Limpiar filtros
            </Button>
            {!loading ? (
              <span className="text-[11px] text-content-muted" aria-live="polite">
                {events.length} {events.length === 1 ? 'evento' : 'eventos'}
              </span>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title="Eventos"
          subtitle="Fecha · Dispositivo · Evento · Ubicación · Detalle"
          icon={<BellRing className="h-4 w-4" />}
        />

        {error ? (
          <ErrorState message={error.message} detail={error.detail} onRetry={() => void load()} />
        ) : loading ? (
          <SkeletonTable rows={6} columns={5} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={<BellRing className="h-5 w-5" />}
            title="Sin eventos en el rango"
            description="No se han detectado eventos con los filtros seleccionados. Amplía el rango de fechas o quita algún filtro para ver más resultados."
          />
        ) : (
          <Table
            caption="Eventos registrados"
            headers={['Fecha', 'Dispositivo', 'Evento', 'Ubicación', 'Detalle']}
          >
            {events.map((event) => {
              const meta = EVENT_TYPE_META[event.type];
              const device = devices.find((item) => item.deviceId === event.deviceId);
              return (
                <tr key={event.id} className="hover:bg-panel-soft/60">
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-content-muted">
                    {fmtDateTime(event.timestamp)}
                  </td>
                  <td className="px-4 py-2.5 text-content">
                    {device ? deviceLabel(device) : event.deviceId}
                    <span className="block font-mono text-[11px] text-content-muted">
                      {event.deviceId}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                      style={{ borderColor: `${meta.color}55`, color: meta.color }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: meta.color }}
                        aria-hidden
                      />
                      {meta.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-content-muted">
                    {fmtCoord(event.latitude, event.longitude)}
                  </td>
                  <td className="px-4 py-2.5 text-content-muted">
                    {event.message}
                    {event.speed !== null ? (
                      <span className="block text-[11px] tabular-nums">
                        {Math.round(event.speed)} km/h
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {/* Contrato para el backend */}
      <Card>
        <CardHeader
          title="Contrato del endpoint"
          icon={<ServerCog className="h-4 w-4" />}
        />
        <CardBody className="space-y-3">
          <pre className="overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-[11px] leading-relaxed text-content-muted">
{`GET /api/events?deviceId=<id>&type=<tipo>&from=<ISO>&to=<ISO>&limit=<n>
Authorization: Bearer <API_KEY>

200 {
  "success": true,
  "count": 12,
  "events": [
    {
      "id": "1",
      "deviceId": "123456",
      "type": "overspeed",
      "timestamp": "2026-09-18T10:23:00Z",
      "latitude": 19.4326,
      "longitude": -99.1332,
      "speed": 112.4,
      "message": "Exceso de velocidad"
    }
  ]
}`}
          </pre>

          <div className="grid gap-2 text-[11px] text-content-muted sm:grid-cols-2">
            <p>
              <span className="text-content">Tipos:</span> {EVENT_TYPE_ORDER.join(', ')}
            </p>
            <p>
              <span className="text-content">Query:</span> deviceId, type, from (ISO 8601), to (ISO
              8601), limit (máx. 2000, por defecto 200). Orden: más reciente primero.
            </p>
          </div>

          <p className="text-[11px] leading-relaxed text-content-muted">
            Con ese contrato, la tabla muestra los eventos reales derivados por el backend (
            <span className="font-mono">overspeed</span>,{' '}
            <span className="font-mono">movement</span>, <span className="font-mono">stop</span>,{' '}
            <span className="font-mono">gps_lost</span>,{' '}
            <span className="font-mono">low_battery</span> y{' '}
            <span className="font-mono">disconnected</span>) sin cambios adicionales.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
