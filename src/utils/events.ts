/** Metadatos de presentación de los eventos (etiquetas y colores). */

import type { GpsEventType } from '@/types';

export interface EventTypeMeta {
  /** Etiqueta completa (tablas, filtros). */
  label: string;
  /** Etiqueta corta (ejes de gráficas). */
  short: string;
  color: string;
  severity: 'info' | 'warning' | 'critical';
}

export const EVENT_TYPE_META: Record<GpsEventType, EventTypeMeta> = {
  overspeed: { label: 'Exceso de velocidad', short: 'Exceso', color: '#f59e0b', severity: 'warning' },
  movement: { label: 'Movimiento', short: 'Movimiento', color: '#22c55e', severity: 'info' },
  stop: { label: 'Detención', short: 'Detención', color: '#64748b', severity: 'info' },
  gps_lost: { label: 'Pérdida de GPS', short: 'Sin GPS', color: '#ef4444', severity: 'critical' },
  low_battery: { label: 'Batería baja', short: 'Batería', color: '#eab308', severity: 'warning' },
  disconnected: { label: 'Desconexión', short: 'Offline', color: '#ef4444', severity: 'critical' },
};

/** Orden estable para gráficas y listas. */
export const EVENT_TYPE_ORDER: GpsEventType[] = [
  'overspeed',
  'low_battery',
  'disconnected',
  'gps_lost',
  'movement',
  'stop',
];
