/**
 * Estado global de dispositivos y del canal de tiempo real.
 *
 * El "tiempo real" del backend es polling sobre `GET /api/devices`, que ya
 * incluye la última posición de cada dispositivo: un único request actualiza
 * posición, velocidad, rumbo, batería y último contacto de todo el parque.
 */

import { create } from 'zustand';

import { listDevices } from '@/api/devices';
import { useSettingsStore } from './settingsStore';
import { toDeviceWithStatus } from '@/utils/device';
import { toAppError, logError, type AppError } from '@/utils/errors';
import type { ConnectionState, Device, DeviceWithStatus } from '@/types';

interface DevicesState {
  devices: DeviceWithStatus[];
  byId: Record<string, DeviceWithStatus>;
  /** `true` solo en la primera carga (para skeletons). */
  loading: boolean;
  /** `true` en refrescos en segundo plano. */
  refreshing: boolean;
  error: AppError | null;
  lastUpdatedAt: number | null;
  connection: ConnectionState;
  selectedDeviceId: string | null;
  /** Nº de refrescos completados (útil para validar el polling). */
  refreshCount: number;

  fetchDevices: (options?: { silent?: boolean }) => Promise<void>;
  selectDevice: (deviceId: string | null) => void;
  reset: () => void;
}

function normalize(devices: Device[]): DeviceWithStatus[] {
  const settings = useSettingsStore.getState();
  return devices.map((device) =>
    toDeviceWithStatus(device, {
      unit: settings.speedUnit,
      offlineThresholdSeconds: settings.offlineThresholdSeconds,
      movingSpeedKmh: settings.movingSpeedKmh,
    }),
  );
}

function indexById(devices: DeviceWithStatus[]): Record<string, DeviceWithStatus> {
  return devices.reduce<Record<string, DeviceWithStatus>>((acc, device) => {
    acc[device.deviceId] = device;
    return acc;
  }, {});
}

export const useDevicesStore = create<DevicesState>((set, get) => ({
  devices: [],
  byId: {},
  loading: false,
  refreshing: false,
  error: null,
  lastUpdatedAt: null,
  connection: 'checking',
  selectedDeviceId: null,
  refreshCount: 0,

  fetchDevices: async (options = {}) => {
    const silent = options.silent === true;
    const isFirstLoad = get().lastUpdatedAt === null;

    if (!silent && isFirstLoad) set({ loading: true });
    if (silent) set({ refreshing: true });

    try {
      const raw = await listDevices();
      const devices = normalize(raw);
      const selected = get().selectedDeviceId;

      set({
        devices,
        byId: indexById(devices),
        loading: false,
        refreshing: false,
        error: null,
        lastUpdatedAt: Date.now(),
        connection: 'online',
        refreshCount: get().refreshCount + 1,
        // Si el dispositivo seleccionado desapareció, se limpia la selección.
        selectedDeviceId: selected && devices.some((d) => d.deviceId === selected) ? selected : null,
      });
    } catch (error) {
      const appError = (error as AppError)?.kind ? (error as AppError) : toAppError(error);
      logError('devicesStore.fetchDevices', error);

      set({
        loading: false,
        refreshing: false,
        error: appError,
        connection:
          appError.kind === 'unauthorized' || appError.kind === 'forbidden'
            ? 'unauthorized'
            : 'offline',
      });
    }
  },

  selectDevice: (deviceId) => set({ selectedDeviceId: deviceId }),

  reset: () =>
    set({
      devices: [],
      byId: {},
      loading: false,
      refreshing: false,
      error: null,
      lastUpdatedAt: null,
      connection: 'checking',
      selectedDeviceId: null,
      refreshCount: 0,
    }),
}));

/** Selector: dispositivo seleccionado. */
export function selectSelectedDevice(state: DevicesState): DeviceWithStatus | null {
  if (!state.selectedDeviceId) return null;
  return state.byId[state.selectedDeviceId] ?? null;
}
