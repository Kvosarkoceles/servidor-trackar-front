import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Crosshair, History, Pencil, Trash2 } from 'lucide-react';

import { DeviceStatusBadge } from './DeviceStatusBadge';
import { deleteDevice, updateDevice } from '@/api/devices';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Feedback';
import { Field, Input, Toggle } from '@/components/ui/Field';
import { Pagination, Table } from '@/components/tables/Table';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useDevicesStore } from '@/stores/devicesStore';
import { deviceLabel } from '@/utils/device';
import { fmtBattery, fmtCoord, fmtRelative, fmtSpeed } from '@/utils/format';
import { toAppError, logError, type AppError } from '@/utils/errors';
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
  const [name, setName] = useState('');
  const [uniqueId, setUniqueId] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchDevices = useDevicesStore((state) => state.fetchDevices);

  // Inicializa el formulario cada vez que se abre el modal.
  useEffect(() => {
    if (!editDevice) return;
    setName(editDevice.name ?? '');
    setUniqueId(editDevice.uniqueId ?? '');
    setActive(editDevice.active);
    setFormError(null);
  }, [editDevice]);

  const closeModal = () => setEditDevice(null);

  const save = async () => {
    if (!editDevice) return;
    setSaving(true);
    setFormError(null);

    try {
      await updateDevice(editDevice.deviceId, {
        name: name.trim() === '' ? null : name.trim(),
        uniqueId: uniqueId.trim() === '' ? null : uniqueId.trim(),
        active,
      });
      await fetchDevices();
      closeModal();
    } catch (caught) {
      const appError = (caught as AppError)?.kind ? (caught as AppError) : toAppError(caught);
      logError('DeviceTable.save', caught);
      setFormError(appError.backendMessage ?? appError.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editDevice) return;
    const confirmed = window.confirm(
      `¿Eliminar el dispositivo ${deviceLabel(editDevice)} y todo su historial de posiciones?`,
    );
    if (!confirmed) return;

    setSaving(true);
    setFormError(null);

    try {
      await deleteDevice(editDevice.deviceId);
      await fetchDevices();
      closeModal();
    } catch (caught) {
      const appError = (caught as AppError)?.kind ? (caught as AppError) : toAppError(caught);
      logError('DeviceTable.remove', caught);
      setFormError(appError.backendMessage ?? appError.message);
    } finally {
      setSaving(false);
    }
  };

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
        onClose={closeModal}
        title="Editar dispositivo"
        size="md"
        footer={
          <>
            <Button
              variant="danger"
              onClick={() => void remove()}
              disabled={saving}
              icon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Eliminar
            </Button>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void save()} loading={saving}>
              Guardar cambios
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {editDevice ? (
            <div className="rounded-lg border border-line p-3 text-xs text-content-muted">
              <p>
                Dispositivo: <span className="text-content">{deviceLabel(editDevice)}</span>
              </p>
              <p className="font-mono">{editDevice.deviceId}</p>
              <p className="mt-1">
                El identificador es inmutable: identifica la ingesta de Traccar Client.
              </p>
            </div>
          ) : null}

          <Field label="Nombre" hint="Nombre visible en la interfaz (opcional).">
            {(id) => (
              <Input
                id={id}
                value={name}
                maxLength={120}
                placeholder="p. ej. Camioneta 1"
                onChange={(event) => setName(event.target.value)}
              />
            )}
          </Field>

          <Field label="IMEI / UID" hint="Identificador único del equipo (opcional).">
            {(id) => (
              <Input
                id={id}
                value={uniqueId}
                maxLength={128}
                onChange={(event) => setUniqueId(event.target.value)}
              />
            )}
          </Field>

          <div className="rounded-lg border border-line p-3">
            <Toggle
              checked={active}
              onChange={setActive}
              label="Dispositivo activo"
              description="Desactívalo para excluirlo de la operación sin borrar su historial."
            />
          </div>

          {formError ? (
            <p role="alert" className="text-xs text-status-offline">
              {formError}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
