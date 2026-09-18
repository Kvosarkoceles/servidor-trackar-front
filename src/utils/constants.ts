/**
 * Constantes y lectura de variables de entorno.
 *
 * Todos los valores tienen un valor por defecto seguro para que la app arranque
 * (`npm run dev`) incluso sin `.env`.
 */

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function str(value: string | undefined, fallback: string): string {
  return value !== undefined && String(value).trim() !== '' ? String(value).trim() : fallback;
}

/** URL base de la API, sin barra final. */
export const API_BASE_URL = str(import.meta.env.VITE_API_URL, 'http://localhost:3000/api').replace(
  /\/+$/,
  '',
);

/** Intervalo de polling en ms. El backend no ofrece WebSocket/SSE. */
export const POSITION_REFRESH_MS = num(import.meta.env.VITE_POSITION_REFRESH, 5000);

/** Segundos sin reportar para considerar un dispositivo offline. */
export const OFFLINE_THRESHOLD_SECONDS = num(import.meta.env.VITE_OFFLINE_THRESHOLD_SECONDS, 300);

/** Velocidad mínima (km/h) para considerar "en movimiento". */
export const MOVING_SPEED_KMH = num(import.meta.env.VITE_MOVING_SPEED_KMH, 3);

/** Máximo de dispositivos con historial agregado en el Dashboard. */
export const DASHBOARD_MAX_DEVICES = num(import.meta.env.VITE_DASHBOARD_MAX_DEVICES, 25);

/** Peticiones concurrentes contra el backend. */
export const API_CONCURRENCY = num(import.meta.env.VITE_API_CONCURRENCY, 4);

/** Timeout HTTP en ms. */
export const HTTP_TIMEOUT_MS = num(import.meta.env.VITE_HTTP_TIMEOUT, 20000);

/** API Key por defecto (opcional; si está vacía se pide en /login). */
export const DEFAULT_API_KEY = str(import.meta.env.VITE_API_KEY, '');

/** Tema inicial. */
export const DEFAULT_THEME: 'dark' | 'light' =
  str(import.meta.env.VITE_DEFAULT_THEME, 'dark') === 'light' ? 'light' : 'dark';

/** Límite duro del backend para el historial. */
export const MAX_HISTORY_LIMIT = 5000;

/** Límite por defecto que aplica el backend si no se envía `limit`. */
export const DEFAULT_HISTORY_LIMIT = 100;

/** Claves de almacenamiento local. */
export const STORAGE_KEYS = {
  apiKey: 'gps-monitor.apiKey',
  apiKeyPersistent: 'gps-monitor.apiKey.persistent',
  theme: 'gps-monitor.theme',
  settings: 'gps-monitor.settings',
  readAlerts: 'gps-monitor.alerts.read',
} as const;

/** Rutas de la aplicación. */
export const ROUTES = {
  login: '/login',
  dashboard: '/',
  liveTracking: '/rastreo',
  devices: '/dispositivos',
  deviceDetails: '/dispositivos/:deviceId',
  history: '/historial',
  statistics: '/estadisticas',
  events: '/eventos',
  geofences: '/geocercas',
  settings: '/configuracion',
} as const;

/** Centro por defecto del mapa (CDMX) si no hay dispositivos con posición. */
export const DEFAULT_MAP_CENTER = { lat: 19.4326, lng: -99.1332 };
export const DEFAULT_MAP_ZOOM = 5;

/** Caché de geocodificación en memoria (TTL en ms). */
export const GEOCODE_CACHE_TTL_MS = 10 * 60 * 1000;
