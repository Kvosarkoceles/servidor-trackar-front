/**
 * Alertas del header.
 *
 * ⚠ El backend NO envía notificaciones: no existe endpoint de alertas ni de
 * eventos. Las alertas que se muestran aquí se DERIVAN en el cliente a partir
 * de datos reales (último contacto, velocidad y batería de la última posición)
 * y se etiquetan con `source: 'derived'` para no aparentar que vienen del
 * servidor (requisitos 14 y 35).
 *
 * Cuando el backend implemente `GET /api/events`, se podrán añadir alertas con
 * `source: 'server'` sin cambiar la interfaz.
 */

import { create } from 'zustand';

import { STORAGE_KEYS } from '@/utils/constants';
import { localStore } from '@/utils/storage';
import { deviceLabel } from '@/utils/device';
import type { Alert, DeviceWithStatus, GpsEventType } from '@/types';

interface AlertsState {
  alerts: Alert[];
  /** IDs marcados como leídos (persistidos). */
  readIds: string[];
  /** Recalcula las alertas derivadas a partir del estado real de dispositivos. */
  syncFromDevices: (devices: DeviceWithStatus[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearRead: () => void;
}

function loadReadIds(): string[] {
  const raw = localStore.get(STORAGE_KEYS.readAlerts);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function severityFor(type: GpsEventType): Alert['severity'] {
  switch (type) {
    case 'overspeed':
      return 'warning';
    case 'gps_lost':
    case 'disconnected':
      return 'critical';
    case 'low_battery':
      return 'warning';
    default:
      return 'info';
  }
}

/**
 * Genera alertas derivadas. Cada alerta es determinista para el estado actual,
 * de modo que se mantiene el `read` del usuario entre refrescos.
 */
function deriveAlerts(devices: DeviceWithStatus[], readIds: string[]): Alert[] {
  const alerts: Alert[] = [];
  const read = new Set(readIds);

  for (const device of devices) {
    const name = deviceLabel(device);

    if (device.status === 'offline' && device.ageSeconds !== null) {
      const id = `${device.deviceId}:disconnected:${Math.floor(device.ageSeconds / 3600)}`;
      alerts.push({
        id,
        deviceId: device.deviceId,
        deviceName: name,
        type: 'disconnected',
        message: `${name} dejó de reportar posición`,
        detectedAt: new Date(Date.now() - device.ageSeconds * 1000).toISOString(),
        severity: severityFor('disconnected'),
        source: 'derived',
        read: read.has(id),
      });
    }

    if (device.speedKmh !== null && device.speedKmh > 100 && device.status !== 'offline') {
      const id = `${device.deviceId}:overspeed:${Math.round(device.speedKmh)}`;
      alerts.push({
        id,
        deviceId: device.deviceId,
        deviceName: name,
        type: 'overspeed',
        message: `${name} circula a ${Math.round(device.speedKmh)} km/h`,
        detectedAt: device.lastSeenAt ?? new Date().toISOString(),
        severity: severityFor('overspeed'),
        source: 'derived',
        read: read.has(id),
      });
    }

    const battery = device.lastPosition?.battery;
    if (typeof battery === 'number' && battery <= 20 && device.status !== 'offline') {
      const id = `${device.deviceId}:low_battery:${battery}`;
      alerts.push({
        id,
        deviceId: device.deviceId,
        deviceName: name,
        type: 'low_battery',
        message: `${name} tiene batería baja (${battery} %)`,
        detectedAt: device.lastSeenAt ?? new Date().toISOString(),
        severity: severityFor('low_battery'),
        source: 'derived',
        read: read.has(id),
      });
    }
  }

  return alerts.sort(
    (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
  );
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [],
  readIds: loadReadIds(),

  syncFromDevices: (devices) => {
    const readIds = get().readIds;
    set({ alerts: deriveAlerts(devices, readIds) });
  },

  markRead: (id) => {
    const readIds = [...new Set([...get().readIds, id])];
    localStore.set(STORAGE_KEYS.readAlerts, JSON.stringify(readIds));
    set({
      readIds,
      alerts: get().alerts.map((alert) => (alert.id === id ? { ...alert, read: true } : alert)),
    });
  },

  markAllRead: () => {
    const readIds = [...new Set([...get().readIds, ...get().alerts.map((alert) => alert.id)])];
    localStore.set(STORAGE_KEYS.readAlerts, JSON.stringify(readIds));
    set({ readIds, alerts: get().alerts.map((alert) => ({ ...alert, read: true })) });
  },

  clearRead: () => {
    localStore.remove(STORAGE_KEYS.readAlerts);
    set({ readIds: [], alerts: get().alerts.map((alert) => ({ ...alert, read: false })) });
  },
}));

/** Nº de alertas sin leer. */
export function unreadAlertCount(alerts: Alert[]): number {
  return alerts.reduce((total, alert) => (alert.read ? total : total + 1), 0);
}
