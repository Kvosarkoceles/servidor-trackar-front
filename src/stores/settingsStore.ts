/**
 * Preferencias de la aplicación (persistidas en localStorage).
 */

import { create } from 'zustand';

import {
  API_BASE_URL,
  DASHBOARD_MAX_DEVICES,
  DEFAULT_THEME,
  MOVING_SPEED_KMH,
  OFFLINE_THRESHOLD_SECONDS,
  POSITION_REFRESH_MS,
  STORAGE_KEYS,
} from '@/utils/constants';
import { setApiBaseUrl } from '@/api/client';
import { localStore } from '@/utils/storage';
import type { SpeedUnit } from '@/utils/device';

export type MapProviderId = 'openstreetmap' | 'opentopomap' | 'carto-dark';
export type Theme = 'dark' | 'light';

export interface Settings {
  theme: Theme;
  /** ms entre refrescos de posición (polling; el backend no tiene WebSocket). */
  pollingMs: number;
  /** Unidad de la velocidad almacenada por el backend. */
  speedUnit: SpeedUnit;
  /** Segundos sin reportar para marcar "sin conexión". */
  offlineThresholdSeconds: number;
  /** km/h a partir de los cuales se considera "en movimiento". */
  movingSpeedKmh: number;
  mapProvider: MapProviderId;
  /** Geocodificación inversa opcional (ver utils/geocode.ts). */
  geocoding: boolean;
  /** URL base de la API (puede diferir de la compilada). */
  apiBaseUrl: string;
  dashboardMaxDevices: number;
}

const DEFAULTS: Settings = {
  theme: DEFAULT_THEME,
  pollingMs: POSITION_REFRESH_MS,
  speedUnit: 'kmh',
  offlineThresholdSeconds: OFFLINE_THRESHOLD_SECONDS,
  movingSpeedKmh: MOVING_SPEED_KMH,
  mapProvider: 'openstreetmap',
  geocoding: false,
  apiBaseUrl: API_BASE_URL,
  dashboardMaxDevices: DASHBOARD_MAX_DEVICES,
};

function loadSettings(): Settings {
  const raw = localStore.get(STORAGE_KEYS.settings);
  if (!raw) return { ...DEFAULTS, theme: localStore.get(STORAGE_KEYS.theme) === 'light' ? 'light' : DEFAULTS.theme };

  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
  setTheme: (theme: Theme) => void;
}

const initial = loadSettings();
setApiBaseUrl(initial.apiBaseUrl);

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initial,

  update: (patch) => {
    const next = { ...get(), ...patch };
    const settings: Settings = {
      theme: next.theme,
      pollingMs: next.pollingMs,
      speedUnit: next.speedUnit,
      offlineThresholdSeconds: next.offlineThresholdSeconds,
      movingSpeedKmh: next.movingSpeedKmh,
      mapProvider: next.mapProvider,
      geocoding: next.geocoding,
      apiBaseUrl: next.apiBaseUrl,
      dashboardMaxDevices: next.dashboardMaxDevices,
    };
    localStore.set(STORAGE_KEYS.settings, JSON.stringify(settings));
    localStore.set(STORAGE_KEYS.theme, settings.theme);
    if (patch.apiBaseUrl !== undefined) setApiBaseUrl(patch.apiBaseUrl);
    set(settings);
  },

  setTheme: (theme) => get().update({ theme }),

  reset: () => {
    localStore.set(STORAGE_KEYS.settings, JSON.stringify(DEFAULTS));
    localStore.set(STORAGE_KEYS.theme, DEFAULTS.theme);
    setApiBaseUrl(DEFAULTS.apiBaseUrl);
    set({ ...DEFAULTS });
  },
}));
