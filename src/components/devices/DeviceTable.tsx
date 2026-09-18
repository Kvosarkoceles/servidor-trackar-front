import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Crosshair, History, Pencil, ServerCog } from 'lucide-react';

import { DeviceStatusBadge } from './DeviceStatusBadge';
import { Button } from '@/components/ui/Button';
import { InfoNote, Modal } from '@/components/ui/Feedback';
import { Pagination, Table } from '@/components/tables/Table';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { deviceLabel } from '@/utils/device';
import { fmtBattery, fmtCoord, fmtRelative, fmtSpeed } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { DeviceWithStatus } from '@/types';

type SortKey = 'name' | 'status' | 'speed' | 'lastSeen';

interface DeviceTableProps {
  devices: DeviceWithStatus[];
  loading?: boolean;
  onView: (deviceId: string) => void;
  onHistory: (deviceId: string) => void;
  onCenter?: (deviceId: string) => void;
}

const STATUS_ORDER: Record<string, number> = { moving: 0, stopped: 1, offline: 2, unknown: 3 };

/** Tabla de dispositivos con ordenación y paginación (requisito 8). */
export function DeviceTable({ devices, loading = false, onView, onHistory, onCenter }: DeviceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('lastSeen');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [editDevice, setEditDevice] = useState<DeviceWithStatus | null>(null);

  const sorted = useMemo(() => {
    const factor = direction === 'asc' ? 1 : -1;
    return [...devices].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return deviceLabel(a).localeCompare(deviceLabel(b)) * factor;
        case 'status':
          return ((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)) * factor;
        case 'speed':
          return ((a.speedKmh ?? -1) - (b.speedKmh ?? -1)) * factor;
        default:
          return (
            (new Date(a.lastSeenAt ?? 0).getTime() - new Date(b.lastSeenAt ?? 0).getTime()) * factor
          );
      }
    });
  }, [devices, sortKey, direction]);

  // Reinicia la página cuando el conjunto cambia de tamaño.
  useEffect(() => setPage(1), [devices.length, pageSize]);

  const pageItems = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize],
  );

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setDirection(direction === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setDirection(key === 'name' ? 'asc' : 'desc');
    }
  };

  const sortIcon = (key: SortKey) =>
    key === sortKey ? (
      direction === 'asc' ? (
        <ArrowUp className="inline h-3 w-3" aria-hidden />
      ) : (
        <ArrowDown className="inline h-3 w-3" aria-hidden />
      )
    ) : null;

  const headerButton = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className={cn('inline-flex items-center gap-1 hover:text-content', key === sortKey && 'text-content')}
      aria-label={`Ordenar por ${label}`}
    >
      {label}
      {sortIcon(key)}
    </button>
  );

  if (loading && devices.length === 0) {
    return (
      <div className="panel">
        <SkeletonTable rows={8} columns={6} />
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <Table
        caption="Listado de dispositivos registrados en el backend"
        headers={[
          headerButton('name', 'Dispositivo'),
          'Identificador',
          headerButton('status', 'Estado'),
          headerButton('speed', 'Velocidad'),
          'Última posición',
          headerButton('lastSeen', 'Última conexión'),
          'Acciones',
        ]}
      >
        {pageItems.map((device) => (
          <tr key={device.deviceId} className="hover:bg-panel-soft/60">
            <td className="px-4 py-2.5">
              <button
                type="button"
                onClick={() => onView(device.deviceId)}
                className="text-left text-sm font-medium text-content hover:text-brand-400"
              >
                {deviceLabel(device)}
              </button>
              {device.uniqueId ? (
                <p className="text-[11px] text-content-muted">IMEI/UID: {device.uniqueId}</p>
              ) : null}
            </td>
            <td className="px-4 py-2.5 font-mono text-xs text-content-muted">{device.deviceId}</td>
            <td className="px-4 py-2.5">
              <DeviceStatusBadge status={device.status} />
            </td>
            <td className="px-4 py-2.5 tabular-nums text-content">{fmtSpeed(device.speedKmh)}</td>
            <td className="px-4 py-2.5">
              <p className="tabular-nums text-content">
                {fmtCoord(device.coordinates?.lat ?? null, device.coordinates?.lng ?? null)}
              </p>
              <p className="text-[11px] text-content-muted">
                Batería: {fmtBattery(device.lastPosition?.battery ?? null)}
              </p>
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 text-content-muted">
              {fmtRelative(device.lastSeenAt)}
            </td>
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(device.deviceId)}
                  aria-label={`Ver ${deviceLabel(device)}`}
                  title="Ver detalle"
                >
                  Ver
                </Button>
                {onCenter ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onCenter(device.deviceId)}
                    aria-label={`Centrar ${deviceLabel(device)} en el mapa`}
                    title="Centrar en el mapa"
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onHistory(device.deviceId)}
                  aria-label={`Historial de ${deviceLabel(device)}`}
                  title="Ver historial"
                >
                  <History className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditDevice(device)}
                  aria-label={`Editar ${deviceLabel(device)}`}
                  title="Editar información"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={sorted.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <Modal
        open={editDevice !== null}
        onClose={() => setEditDevice(null)}
        title="Editar dispositivo"
        size="md"
      >
        <div className="space-y-3">
          <InfoNote title="Función no disponible en el backend">
            El backend <code className="font-mono">servidor-trackar</code> expone actualmente solo
            <code className="mx-1 font-mono">GET /api/devices</code>,{' '}
            <code className="font-mono">GET /api/positions/:deviceId</code> y{' '}
            <code className="font-mono">GET /api/positions/:deviceId/latest</code>. No existe ningún
            endpoint para crear, renombrar o desactivar dispositivos, por lo que este formulario no
            se envía a ningún servidor.
          </InfoNote>

          <div>
            <p className="text-xs font-semibold text-content">Endpoint necesario</p>
            <pre className="mt-1 overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-[11px] text-content-muted">
{`PUT /api/devices/:deviceId
Authorization: Bearer <API_KEY>
Content-Type: application/json

{ "name": "string", "uniqueId": "string", "active": true }`}
            </pre>
          </div>

          {editDevice ? (
            <div className="rounded-lg border border-line p-3 text-xs text-content-muted">
              <p>
                Dispositivo: <span className="text-content">{deviceLabel(editDevice)}</span>
              </p>
              <p className="font-mono">{editDevice.deviceId}</p>
            </div>
          ) : null}

          <div className="flex items-center gap-2 text-[11px] text-content-muted">
            <ServerCog className="h-3.5 w-3.5" aria-hidden />
            Documentado en API_INTEGRATION.md
          </div>
        </div>
      </Modal>
    </div>
  );
}
