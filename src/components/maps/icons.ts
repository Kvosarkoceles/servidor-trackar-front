/**
 * Iconos de dispositivo para Leaflet.
 *
 * Los marcadores NO son pines estáticos: son un SVG construido a partir del
 * estado (color) y del `bearing` real del backend, de modo que el icono apunta
 * hacia el rumbo del vehículo (requisito 6).
 */

import L from 'leaflet';

import type { DeviceStatus } from '@/types';

const STATUS_COLOR: Record<DeviceStatus, string> = {
  moving: '#22c55e',
  stopped: '#f59e0b',
  offline: '#ef4444',
  unknown: '#64748b',
};

export interface DeviceIconOptions {
  status: DeviceStatus;
  /** Rumbo en grados (0 = norte). Si es `null`, se usa un círculo. */
  bearing: number | null;
  selected?: boolean;
  label?: string;
  /** Muestra un halo pulsante (dispositivo en movimiento). */
  pulse?: boolean;
}

/** Construye el HTML del marcador (flecha orientada + color por estado). */
export function buildDeviceIconHtml({
  status,
  bearing,
  selected = false,
  label,
  pulse = false,
}: DeviceIconOptions): string {
  const color = STATUS_COLOR[status];
  const hasBearing = bearing !== null && Number.isFinite(bearing);
  const rotation = hasBearing ? `rotate(${Number(bearing)} 0 0)` : '';

  const shape = hasBearing
    ? `<polygon points="0,-13 8,10 0,5 -8,10" fill="${color}" stroke="#0b1220" stroke-width="1.4" />`
    : `<circle cx="0" cy="0" r="8" fill="${color}" stroke="#0b1220" stroke-width="1.4" />`;

  const ring = selected
    ? `<circle cx="0" cy="0" r="16" fill="none" stroke="${color}" stroke-width="2" opacity="0.95" />`
    : '';

  const pulseElement = pulse
    ? `<circle cx="0" cy="0" r="13" fill="${color}" opacity="0.25">
         <animate attributeName="r" values="10;20" dur="1.8s" repeatCount="indefinite" />
         <animate attributeName="opacity" values="0.35;0" dur="1.8s" repeatCount="indefinite" />
       </circle>`
    : '';

  return `<div class="relative">
    <svg width="34" height="34" viewBox="-17 -17 34 34" role="img" aria-label="${
      label ?? 'Dispositivo'
    }" style="overflow:visible">
      ${pulseElement}
      ${ring}
      <g transform="${rotation}">${shape}</g>
    </svg>
  </div>`;
}

/** Crea el `DivIcon` de Leaflet para un dispositivo. */
export function createDeviceIcon(options: DeviceIconOptions): L.DivIcon {
  return L.divIcon({
    html: buildDeviceIconHtml(options),
    className: 'device-marker-icon',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -14],
  });
}

/** Color del estado (también usado por la leyenda del mapa). */
export function statusColor(status: DeviceStatus): string {
  return STATUS_COLOR[status];
}
