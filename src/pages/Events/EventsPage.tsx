import { useState } from 'react';
import { BellRing, Filter, ServerCog } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState, InfoNote } from '@/components/ui/Feedback';
import { Field, Input, Select } from '@/components/ui/Field';
import { Table } from '@/components/tables/Table';
import { useDevicesStore } from '@/stores/devicesStore';
import { deviceLabel } from '@/utils/device';
import type { GpsEventType } from '@/types';

const EVENT_TYPES: Array<{ value: GpsEventType; label: string }> = [
  { value: 'overspeed', label: '⚠ Exceso de velocidad' },
  { value: 'movement', label: '🚗 Movimiento' },
  { value: 'stop', label: '🛑 Detención' },
  { value: 'gps_lost', label: '📡 GPS perdido' },
  { value: 'low_battery', label: '🔋 Batería baja' },
  { value: 'disconnected', label: '🔌 Dispositivo desconectado' },
];

/**
 * Eventos y alertas (requisito 13).
 *
 * ⚠ El backend NO expone ningún endpoint de eventos. Por la regla fundamental
 * del proyecto (no inventar funcionalidades), esta página:
 *   - muestra los filtros ya preparados,
 *   - deja la tabla lista para renderizar `GpsEvent[]`,
 *   - documenta el contrato exacto que debe implementar el backend.
 *
 * No se generan eventos ficticios.
 */
export function EventsPage() {
  const devices = useDevicesStore((state) => state.devices);
  const [deviceId, setDeviceId] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-content">Eventos y alertas</h1>
        <p className="text-xs text-content-muted">
          Historial de eventos por dispositivo, tipo y fecha
        </p>
      </div>

      <InfoNote title="El backend todavía no expone eventos">
        <p>
          La tabla <span className="font-mono">gps_positions</span> solo almacena posición,
          velocidad, rumbo, altitud, precisión y batería. No hay detección de exceso de velocidad,
          geocercas, pérdida de GPS ni desconexiones, y no existe el endpoint{' '}
          <span className="font-mono">GET /api/events</span>.
        </p>
        <p className="mt-2">
          Esta interfaz está preparada para integrarlo sin cambios: en cuanto el endpoint exista, la
          tabla y los filtros empezarán a mostrar datos reales.
        </p>
      </InfoNote>

      {/* Filtros preparados */}
      <Card>
        <CardHeader
          title="Filtros"
          subtitle="Coinciden con la query propuesta para GET /api/events"
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
                options={[{ value: '', label: 'Todos los tipos' }, ...EVENT_TYPES]}
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
            <Button disabled icon={<Filter className="h-4 w-4" />}>
              Consultar eventos
            </Button>
            <span className="text-[11px] text-content-muted">
              Deshabilitado: el endpoint no existe en el backend.
            </span>
          </div>
        </CardBody>
      </Card>

      {/* Tabla preparada */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Eventos"
          subtitle="Fecha · Dispositivo · Evento · Ubicación · Estado"
          icon={<BellRing className="h-4 w-4" />}
        />
        <Table
          caption="Eventos registrados"
          headers={['Fecha', 'Dispositivo', 'Evento', 'Ubicación', 'Estado']}
        >
          {[]}
        </Table>
        <EmptyState
          icon={<BellRing className="h-5 w-5" />}
          title="Sin eventos disponibles"
          description="No hay un origen de datos de eventos en el backend. La campana del encabezado sí muestra señales derivadas localmente (offline, exceso de velocidad y batería baja) a partir de la última posición reportada."
        />
      </Card>

      {/* Contrato para el backend */}
      <Card>
        <CardHeader
          title="Contrato pendiente de implementar"
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
              <span className="text-content">Tipos esperados:</span>{' '}
              {EVENT_TYPES.map((item) => item.value).join(', ')}
            </p>
            <p>
              <span className="text-content">Alternativa:</span> detección en el backend al vuelo
              sobre <span className="font-mono">gps_positions</span> (velocidad &gt; umbral, brecha
              entre posiciones superior a N minutos…).
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
