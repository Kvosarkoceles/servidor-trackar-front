import { Shapes, ServerCog } from 'lucide-react';

import { ClusterLayer } from '@/components/maps/ClusterLayer';
import { GeofenceLayer, GEOFENCES_ENDPOINT_CONTRACT } from '@/components/maps/GeofenceLayer';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { InfoNote } from '@/components/ui/Feedback';
import { MapView } from '@/components/maps/MapView';
import { useDevicesStore } from '@/stores/devicesStore';

/**
 * Geocercas (requisito 16).
 *
 * ⚠ El backend NO soporta geocercas (ni tabla ni endpoint). La página muestra
 * el mapa real con los dispositivos y la capa de geocercas preparada
 * (`GeofenceLayer`), que renderizaría círculos y polígonos en cuanto existan
 * datos. No se dibujan zonas inventadas.
 */
export function GeofencesPage() {
  const devices = useDevicesStore((state) => state.devices);
  const selectDevice = useDevicesStore((state) => state.selectDevice);
  const selectedId = useDevicesStore((state) => state.selectedDeviceId);

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

      <InfoNote title="Funcionalidad pendiente en el backend">
        El backend no almacena geocercas ni expone un endpoint para consultarlas. La capa de dibujo
        (<span className="font-mono">GeofenceLayer</span>) ya soporta círculos, polígonos y etiquetas,
        de modo que se activará en cuanto el backend devuelva datos.
      </InfoNote>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Card className="overflow-hidden xl:col-span-3">
          <CardHeader
            title="Mapa de zonas"
            subtitle={`${devices.length} dispositivos · 0 geocercas configuradas`}
            icon={<Shapes className="h-4 w-4" />}
          />
          <div className="h-[520px]">
            <MapView className="h-full rounded-none" fitPoints={points} autoFit>
              <ClusterLayer devices={devices} selectedId={selectedId} onSelect={selectDevice} />
              <GeofenceLayer geofences={[]} />
            </MapView>
          </div>
        </Card>

        <Card>
          <CardHeader title="Contrato pendiente" icon={<ServerCog className="h-4 w-4" />} />
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
