import { useCallback, useEffect, useRef, useState } from 'react';
import { Shapes, ServerCog } from 'lucide-react';

import { ClusterLayer } from '@/components/maps/ClusterLayer';
import { GeofenceLayer } from '@/components/maps/GeofenceLayer';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, InfoNote } from '@/components/ui/Feedback';
import { Skeleton } from '@/components/ui/Skeleton';
import { MapView } from '@/components/maps/MapView';
import { GEOFENCES_ENDPOINT_CONTRACT, listGeofences } from '@/api/geofences';
import { useDevicesStore } from '@/stores/devicesStore';
import { toAppError, logError, type AppError } from '@/utils/errors';
import type { Geofence } from '@/types';

/**
 * Geocercas (requisito 16).
 *
 * Datos reales de `GET /api/geofences`: la capa `GeofenceLayer` dibuja los
 * círculos y polígonos almacenados en el backend sobre el mapa con los
 * dispositivos.
 */
export function GeofencesPage() {
  const devices = useDevicesStore((state) => state.devices);
  const selectDevice = useDevicesStore((state) => state.selectDevice);
  const selectedId = useDevicesStore((state) => state.selectedDeviceId);

  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const loadGeofences = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      setGeofences(await listGeofences(controller.signal));
    } catch (caught) {
      const appError = (caught as AppError)?.kind ? (caught as AppError) : toAppError(caught);
      if (appError.kind === 'canceled') return;
      logError('GeofencesPage', caught);
      setError(appError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGeofences();
  }, [loadGeofences]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const points = devices
    .filter((device) => device.coordinates !== null)
    .map((device) => device.coordinates!);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-content">Geocercas</h1>
        <p className="text-xs text-content-muted">
          Zonas circulares y polígonos superpuestos al mapa
        </p>
      </div>

      <InfoNote title="Zonas servidas por el backend">
        Las geocercas se leen de la tabla <span className="font-mono">geofences</span> a través de{' '}
        <span className="font-mono">GET /api/geofences</span>. La capa dibuja círculos y polígonos
        (con su color y etiqueta) superpuestos al mapa de dispositivos.
      </InfoNote>

      <Card>
        <CardHeader
          title="Zonas configuradas"
          subtitle={`${geofences.length} ${geofences.length === 1 ? 'geocerca activa' : 'geocercas activas'}`}
          icon={<Shapes className="h-4 w-4" />}
        />

        {loading ? (
          <CardBody>
            <Skeleton className="h-16 w-full" />
          </CardBody>
        ) : error ? (
          <ErrorState
            message={error.message}
            detail={error.detail}
            onRetry={() => void loadGeofences()}
          />
        ) : geofences.length === 0 ? (
          <EmptyState
            icon={<Shapes className="h-5 w-5" />}
            title="Sin geocercas configuradas"
            description="Añade zonas (círculos o polígonos) a la tabla geofences del backend para verlas dibujadas sobre el mapa."
          />
        ) : (
          <CardBody className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {geofences.map((zone) => (
              <div key={zone.id} className="rounded-lg border border-line p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: zone.color ?? '#2f83f6' }}
                    aria-hidden
                  />
                  <p className="truncate text-sm font-medium text-content">{zone.name}</p>
                </div>
                <p className="mt-1 text-[11px] text-content-muted">
                  {zone.type === 'circle'
                    ? `Círculo · radio ${zone.radiusMeters ?? '—'} m`
                    : `Polígono · ${zone.points?.length ?? 0} vértices`}
                </p>
              </div>
            ))}
          </CardBody>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Card className="overflow-hidden xl:col-span-3">
          <CardHeader
            title="Mapa de zonas"
            subtitle={`${devices.length} dispositivos · ${geofences.length} geocercas`}
            icon={<Shapes className="h-4 w-4" />}
          />
          <div className="h-[520px]">
            <MapView className="h-full rounded-none" fitPoints={points} autoFit>
              <ClusterLayer devices={devices} selectedId={selectedId} onSelect={selectDevice} />
              <GeofenceLayer geofences={geofences} />
            </MapView>
          </div>
        </Card>

        <Card>
          <CardHeader title="Contrato del endpoint" icon={<ServerCog className="h-4 w-4" />} />
          <CardBody className="space-y-3">
            <pre className="overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-[11px] leading-relaxed text-content-muted">
{`${GEOFENCES_ENDPOINT_CONTRACT.method} ${GEOFENCES_ENDPOINT_CONTRACT.path}
Authorization: ${GEOFENCES_ENDPOINT_CONTRACT.auth}

200 {
  "success": true,
  "geofences": [
    {
      "id": "1",
      "name": "Bodega central",
      "type": "circle",
      "center": { "lat": 19.43, "lng": -99.13 },
      "radiusMeters": 300,
      "color": "#2f83f6"
    },
    {
      "id": "2",
      "name": "Ruta norte",
      "type": "polygon",
      "points": [
        { "lat": 19.44, "lng": -99.14 },
        { "lat": 19.45, "lng": -99.12 },
        { "lat": 19.43, "lng": -99.11 }
      ]
    }
  ]
}`}
            </pre>

            <div className="grid gap-2 text-[11px] text-content-muted sm:grid-cols-2">
              <p>
                <span className="text-content">Query:</span> ninguna · orden por{' '}
                <span className="font-mono">id</span> ascendente.
              </p>
              <p>
                <span className="text-content">Solo activas:</span> el backend devuelve las zonas
                con <span className="font-mono">active = true</span>.
              </p>
            </div>

            <p className="text-[11px] leading-relaxed text-content-muted">
              Con ese contrato, la capa ya dibuja los círculos (
              <span className="font-mono">type: circle</span>) y polígonos (
              <span className="font-mono">type: polygon</span>) sin cambios adicionales.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
