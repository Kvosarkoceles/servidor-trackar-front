import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { useMap } from 'react-leaflet';

import { createDeviceIcon, statusColor } from './icons';
import { STATUS_META, deviceLabel } from '@/utils/device';
import { fmtBattery, fmtCoord, fmtRelative, fmtSpeed } from '@/utils/format';
import type { DeviceWithStatus } from '@/types';

interface ClusterLayerProps {
  devices: DeviceWithStatus[];
  selectedId?: string | null;
  onSelect?: (deviceId: string) => void;
  /** Agrupa marcadores cuando hay muchos dispositivos (requisito 17/23). */
  cluster?: boolean;
  /** A partir de cuántos marcadores se activa el clustering. */
  clusterFrom?: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function popupHtml(device: DeviceWithStatus): string {
  const meta = STATUS_META[device.status];
  const rows: string[] = [
    `<div style="display:flex;align-items:center;gap:6px;font-weight:600;margin-bottom:2px">
       <span style="width:8px;height:8px;border-radius:9999px;background:${statusColor(
         device.status,
       )};display:inline-block"></span>
       ${escapeHtml(deviceLabel(device))}
     </div>`,
  ];

  if (device.deviceId) {
    rows.push(
      `<div style="color:#94a3b8">ID: <span style="font-family:monospace">${escapeHtml(
        device.deviceId,
      )}</span></div>`,
    );
  }
  if (device.coordinates) {
    rows.push(`<div style="color:#94a3b8">${escapeHtml(fmtCoord(device.coordinates.lat, device.coordinates.lng))}</div>`);
  }
  rows.push(
    `<div style="display:flex;gap:10px;margin-top:4px">
       <span>${escapeHtml(meta.label)}</span>
       <span>${escapeHtml(fmtSpeed(device.speedKmh))}</span>
     </div>`,
  );
  rows.push(
    `<div style="color:#94a3b8;margin-top:2px">
       Últ. dato: ${escapeHtml(fmtRelative(device.lastSeenAt))} · Batería: ${escapeHtml(
         fmtBattery(device.lastPosition?.battery ?? null),
       )}
     </div>`,
  );

  return `<div style="min-width:180px">${rows.join('')}</div>`;
}

/**
 * Capa de marcadores con clustering opcional.
 *
 * Se gestiona de forma imperativa (en lugar de `<Marker>` de react-leaflet)
 * porque `leaflet.markercluster` necesita control directo sobre los marcadores
 * y así se evita recrear el grupo en cada refresco de posición.
 */
export function ClusterLayer({
  devices,
  selectedId,
  onSelect,
  cluster = true,
  clusterFrom = 25,
}: ClusterLayerProps) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | L.LayerGroup | null>(null);
  const useCluster = cluster && devices.length >= clusterFrom;

  // Recrea el grupo solo cuando cambia la estrategia de clustering.
  useEffect(() => {
    const group = useCluster ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 60 }) : L.layerGroup();
    group.addTo(map);
    groupRef.current = group;
    return () => {
      group.remove();
      groupRef.current = null;
    };
  }, [map, useCluster]);

  const markers = useMemo(
    () =>
      devices
        .filter((device) => device.coordinates !== null)
        .map((device) => {
          const marker = L.marker([device.coordinates!.lat, device.coordinates!.lng], {
            icon: createDeviceIcon({
              status: device.status,
              bearing: device.lastPosition?.bearing ?? null,
              selected: device.deviceId === selectedId,
              label: deviceLabel(device),
              pulse: device.status === 'moving',
            }),
            title: deviceLabel(device),
            alt: deviceLabel(device),
            keyboard: true,
            riseOnHover: true,
          });

          marker.bindPopup(popupHtml(device), { closeButton: true, autoPan: true });
          if (onSelect) marker.on('click', () => onSelect(device.deviceId));
          return marker;
        }),
    [devices, selectedId, onSelect],
  );

  // Sincroniza los marcadores sin recrear el grupo.
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();
    for (const marker of markers) group.addLayer(marker);
  }, [markers]);

  // Abre el popup del dispositivo seleccionado y lo trae al frente.
  useEffect(() => {
    if (!selectedId) return;
    const index = devices
      .filter((device) => device.coordinates !== null)
      .findIndex((device) => device.deviceId === selectedId);
    if (index === -1) return;
    const marker = markers[index];
    if (!marker) return;
    const group = groupRef.current as L.MarkerClusterGroup | null;
    if (group && 'zoomToShowLayer' in group) {
      group.zoomToShowLayer(marker, () => marker.openPopup());
    } else {
      marker.openPopup();
    }
  }, [selectedId, devices, markers]);

  return null;
}
