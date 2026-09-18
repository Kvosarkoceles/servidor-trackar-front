import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Crosshair, Gauge, History, MapPin, Satellite, ServerCog } from 'lucide-react';

import { DeviceStatusBadge } from '@/components/devices/DeviceStatusBadge';
import { ClusterLayer } from '@/components/maps/ClusterLayer';
import { MapView } from '@/components/maps/MapView';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, InfoNote } from '@/components/ui/Feedback';
import { Skeleton } from '@/components/ui/Skeleton';
import { getLatestPosition } from '@/api/positions';
import { useDevicesStore } from '@/stores/devicesStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useInterval } from '@/hooks/useUtils';
import { deviceLabel } from '@/utils/device';
import {
  fmtAccuracy,
  fmtAltitude,
  fmtBattery,
  fmtBearing,
  fmtCoord,
  fmtDateTime,
  fmtRelative,
  fmtSpeed,
} from '@/utils/format';
import { toAppError, type AppError } from '@/utils/errors';
import { ROUTES } from '@/utils/constants';
import type { Position } from '@/types';

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="text-xs text-content-muted">{label}</dt>
      <dd className={`text-right text-xs text-content ${mono ? 'font-mono' : 'tabular-nums'}`}>
        {value}
      </dd>
    </div>
  );
}

/**
 * Detalle del dispositivo (requisito 9).
 *
 * Combina `GET /api/devices` (ficha) con `GET /api/positions/:deviceId/latest`
 * (posición y telemetría completas). Solo se muestran los atributos que el
 * backend realmente almacena: latitud, longitud, velocidad, rumbo, altitud,
 * precisión, batería y marcas de tiempo. No existen odómetro, combustible ni
 * temperatura en el esquema.
 */
export function DeviceDetailsPage() {
  const { deviceId = '' } = useParams();
  const navigate = useNavigate();

  const device = useDevicesStore((state) => (deviceId ? state.byId[deviceId] ?? null : null));
  const devices = useDevicesStore((state) => state.devices);
  const selectDevice = useDevicesStore((state) => state.selectDevice);
  const pollingMs = useSettingsStore((state) => state.pollingMs);

  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    if (deviceId) selectDevice(deviceId);
  }, [deviceId, selectDevice]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getLatestPosition(deviceId)
      .then((result) => {
        if (active) setPosition(result);
      })
      .catch((caught) => {
        if (active) setError(toAppError(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [deviceId]);

  // Refresco de la última posición con el mismo intervalo que el resto de la app.
  useInterval(() => {
    void getLatestPosition(deviceId)
      .then(setPosition)
      .catch(() => undefined);
  }, pollingMs);

  const coordinates = useMemo(() => {
    if (position) return { lat: position.latitude, lng: position.longitude };
    return device?.coordinates ?? null;
  }, [position, device]);

  if (!device) {
    return (
      <div className="p-4">
        <Card>
          <EmptyState
            title="Dispositivo no encontrado"
            description={`El backend no reporta ningún dispositivo con el identificador ${deviceId}. Puede que aún no haya enviado posiciones.`}
            action={
              <Button size="sm" onClick={() => navigate(ROUTES.devices)} icon={<ArrowLeft className="h-3.5 w-3.5" />}>
                Volver al listado
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 -ml-2"
            onClick={() => navigate(ROUTES.devices)}
            icon={<ArrowLeft className="h-3.5 w-3.5" />}
          >
            Dispositivos
          </Button>
          <h1 className="truncate text-lg font-semibold tracking-tight text-content">
            {deviceLabel(device)}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <DeviceStatusBadge status={device.status} />
            <span className="font-mono text-[11px] text-content-muted">{device.deviceId}</span>
            <span className="text-[11px] text-content-muted">
              · Último contacto {fmtRelative(device.lastSeenAt)}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              selectDevice(device.deviceId);
              navigate(ROUTES.liveTracking);
            }}
            icon={<Crosshair className="h-3.5 w-3.5" />}
          >
            Ver en mapa
          </Button>
          <Button
            size="sm"
            onClick={() =>
              navigate(`${ROUTES.history}?deviceId=${encodeURIComponent(device.deviceId)}`)
            }
            icon={<History className="h-3.5 w-3.5" />}
          >
            Historial
          </Button>
        </div>
      </div>

      {error ? (
        <Card>
          <ErrorState message={error.message} detail={error.detail} />
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Información del dispositivo */}
        <Card>
          <CardHeader title="Información" icon={<ServerCog className="h-4 w-4" />} />
          <CardBody>
            <dl className="divide-y divide-line/60">
              <Row label="Nombre" value={device.name ?? '— (sin nombre en el backend)'} />
              <Row label="Identificador" value={device.deviceId} mono />
              <Row label="IMEI / UID" value={device.uniqueId ?? 'No informado'} mono />
              <Row label="Activo" value={device.active ? 'Sí' : 'No'} />
              <Row label="Registrado" value={fmtDateTime(device.createdAt)} />
              <Row label="Actualizado" value={fmtDateTime(device.updatedAt)} />
              <Row label="Última conexión" value={fmtDateTime(device.lastSeenAt)} />
            </dl>
            <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-content-muted">
              Modelo y teléfono no están en el esquema del backend (
              <span className="font-mono">devices</span> solo guarda nombre, identificadores y última
              posición).
            </p>
          </CardBody>
        </Card>

        {/* Posición */}
        <Card>
          <CardHeader
            title="Posición"
            subtitle="GET /api/positions/:deviceId/latest"
            icon={<MapPin className="h-4 w-4" />}
          />
          <CardBody>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 7 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-full" />
                ))}
              </div>
            ) : (
              <dl className="divide-y divide-line/60">
                <Row label="Latitud" value={position ? position.latitude.toFixed(6) : '—'} />
                <Row label="Longitud" value={position ? position.longitude.toFixed(6) : '—'} />
                <Row
                  label="Velocidad"
                  value={fmtSpeed(device.speedKmh)}
                />
                <Row label="Rumbo" value={fmtBearing(position?.bearing ?? null)} />
                <Row label="Altitud" value={fmtAltitude(position?.altitude ?? null)} />
                <Row label="Precisión" value={fmtAccuracy(position?.accuracy ?? null)} />
                <Row label="Timestamp GPS" value={fmtDateTime(position?.timestamp ?? null)} />
                <Row label="Recibido por el servidor" value={fmtDateTime(position?.receivedAt ?? null)} />
              </dl>
            )}
            <p className="mt-3 border-t border-line pt-3 font-mono text-[11px] text-content-muted">
              {fmtCoord(coordinates?.lat ?? null, coordinates?.lng ?? null)}
            </p>
          </CardBody>
        </Card>

        {/* Telemetría */}
        <Card>
          <CardHeader
            title="Telemetría"
            subtitle="Atributos disponibles en el backend"
            icon={<Gauge className="h-4 w-4" />}
          />
          <CardBody className="space-y-3">
            <dl className="divide-y divide-line/60">
              <Row label="Batería" value={fmtBattery(position?.battery ?? device.lastPosition?.battery ?? null)} />
              <Row label="Velocidad" value={fmtSpeed(device.speedKmh)} />
              <Row label="Rumbo" value={fmtBearing(position?.bearing ?? null)} />
              <Row label="Altitud" value={fmtAltitude(position?.altitude ?? null)} />
              <Row label="Precisión GPS" value={fmtAccuracy(position?.accuracy ?? null)} />
            </dl>

            <InfoNote title="Atributos no disponibles">
              El backend no almacena odómetro, nivel de combustible, temperatura, voltaje ni señal
              GSM. Solo persiste los campos escritos por el protocolo OsmAnd de Traccar Client
              (posición, velocidad, rumbo, altitud, precisión y batería). Para añadirlos haría falta
              ampliar <span className="font-mono">gps_positions</span> y el endpoint de ingesta.
            </InfoNote>
          </CardBody>
        </Card>
      </div>

      {/* Mapa */}
      <Card className="overflow-hidden">
        <CardHeader title="Ubicación" subtitle="Última posición conocida" icon={<Satellite className="h-4 w-4" />} />
        <div className="h-[420px]">
          {coordinates ? (
            <MapView
              className="h-full rounded-none"
              center={coordinates}
              zoom={16}
              fitPoints={[coordinates]}
              autoFit={false}
            >
              <ClusterLayer devices={[device]} selectedId={device.deviceId} cluster={false} />
            </MapView>
          ) : (
            <EmptyState
              title="Sin posición registrada"
              description="El dispositivo existe en el backend pero todavía no ha enviado ninguna posición."
            />
          )}
        </div>
      </Card>

      {devices.length > 1 ? (
        <p className="text-[11px] text-content-muted">
          Hay {devices.length} dispositivos registrados ·{' '}
          <button
            type="button"
            className="text-brand-400 hover:underline"
            onClick={() => navigate(ROUTES.liveTracking)}
          >
            ver todos en el mapa
          </button>
        </p>
      ) : null}
    </div>
  );
}
