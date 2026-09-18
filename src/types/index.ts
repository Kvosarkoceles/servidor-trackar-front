/**
 * Tipos TypeScript que reflejan EXACTAMENTE las respuestas del backend
 * `servidor-trackar` (Vercel Functions + Supabase).
 *
 * Fuente: src/services/deviceService.js, src/services/gpsService.js,
 * src/middleware/auth.js, src/utils/errors.js.
 *
 * No se añaden campos que el backend no devuelva. Si el backend incorpora
 * nuevos campos, se documentan primero en API_INTEGRATION.md.
 */

/* -------------------------------------------------------------------------- */
/* API: respuestas genéricas                                                  */
/* -------------------------------------------------------------------------- */

/** Formato de error uniforme del backend (`src/utils/http.js`). */
export interface ApiErrorBody {
  success: false;
  /** Mensaje público y seguro: "Missing API key", "Invalid API key",
   *  "Internal server error", "Server configuration error", etc. */
  error: string;
}

export interface HealthResponse {
  success: true;
  service: string;
  status: string;
}

/* -------------------------------------------------------------------------- */
/* Dispositivos                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Última posición conocida desnormalizada en la tabla `devices`.
 * Es `null` cuando el dispositivo existe pero nunca ha enviado posición.
 */
export interface DeviceLastPosition {
  latitude: number | null;
  longitude: number | null;
  /** Velocidad tal cual la envía el dispositivo (unidad del cliente Traccar). */
  speed: number | null;
  /** Rumbo/curso en grados (0-360). */
  bearing: number | null;
  /** Batería 0-100, o null. */
  battery: number | null;
}

/** Elemento del array `devices` de `GET /api/devices`. */
export interface Device {
  deviceId: string;
  name: string | null;
  uniqueId: string | null;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  /** ISO 8601 de la última recepción de posición, o null. */
  lastSeenAt: string | null;
  lastPosition: DeviceLastPosition | null;
}

export interface DevicesResponse {
  success: true;
  devices: Device[];
}

/* -------------------------------------------------------------------------- */
/* Posiciones                                                                 */
/* -------------------------------------------------------------------------- */

/** Elemento del array `positions` (historial y última posición). */
export interface Position {
  deviceId: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  bearing: number | null;
  altitude: number | null;
  accuracy: number | null;
  battery: number | null;
  /** Timestamp GPS en ISO 8601 (o null si la fila es inconsistente). */
  timestamp: string | null;
  /** Cuándo lo recibió el servidor, ISO 8601. */
  receivedAt: string | null;
}

export interface LatestPositionResponse {
  success: true;
  position: Position;
}

export interface PositionHistoryResponse {
  success: true;
  deviceId: string;
  count: number;
  /** Límite aplicado por el backend. */
  limit: number;
  /** Orden descendente por `gps_timestamp` (más reciente primero). */
  positions: Position[];
}

export interface HistoryQuery {
  /** ISO 8601. Se mapea al parámetro `from`. */
  from?: string;
  /** ISO 8601. Se mapea al parámetro `to`. */
  to?: string;
  /** Máximo 5000 (MAX_HISTORY_LIMIT). Por defecto 100. */
  limit?: number;
}

/* -------------------------------------------------------------------------- */
/* Estado derivado (calculado en el frontend, NO lo entrega el backend)       */
/* -------------------------------------------------------------------------- */

export type DeviceStatus = 'moving' | 'stopped' | 'offline' | 'unknown';

/**
 * Estado derivado en el cliente a partir de `lastSeenAt` y `lastPosition.speed`.
 *
 * El backend NO expone un campo `status`: la ingesta guarda únicamente
 * posición, velocidad, rumbo y batería. Los umbrales son configurables
 * (VITE_OFFLINE_THRESHOLD_SECONDS, VITE_MOVING_SPEED_KMH).
 */
export interface DeviceWithStatus extends Device {
  status: DeviceStatus;
  /** Segundos desde `lastSeenAt`; null si nunca se ha visto. */
  ageSeconds: number | null;
  /** Velocidad normalizada a km/h (el cliente Traccar reporta en `speed`). */
  speedKmh: number | null;
  /** Coordenadas listas para el mapa, o null si no hay posición. */
  coordinates: { lat: number; lng: number } | null;
}

/* -------------------------------------------------------------------------- */
/* Eventos y alertas                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Categorías de evento del backend.
 *
 * IMPORTANTE: el backend actual NO expone ningún endpoint de eventos.
 * Estas categorías corresponden a lo que sería posible derivar de los datos
 * ya disponibles, pero NO se inventan datos: la página /eventos muestra un
 * estado vacío documentado hasta que exista `GET /api/events`.
 */
export type GpsEventType =
  | 'overspeed'
  | 'movement'
  | 'stop'
  | 'gps_lost'
  | 'low_battery'
  | 'disconnected';

export interface GpsEvent {
  id: string;
  deviceId: string;
  type: GpsEventType;
  /** ISO 8601 */
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  message: string;
}

/**
 * Alertas mostradas en la campana del header.
 *
 * Origen: cálculo local a partir de datos REALES del backend
 * (última posición, último contacto y batería). Se marcan como `derived`
 * para no confundirlas con notificaciones del servidor, que hoy no existen.
 */
export interface Alert {
  id: string;
  deviceId: string;
  deviceName: string;
  type: GpsEventType;
  message: string;
  /** ISO 8601 del momento en que se detectó en el cliente. */
  detectedAt: string;
  severity: 'info' | 'warning' | 'critical';
  source: 'derived' | 'server';
  read: boolean;
}

/* -------------------------------------------------------------------------- */
/* Estadísticas (calculadas en el cliente a partir del historial real)        */
/* -------------------------------------------------------------------------- */

export interface DistancePoint {
  /** Etiqueta legible, p. ej. "12:30" o "18/09". */
  label: string;
  /** Distancia acumulada en kilómetros. */
  km: number;
}

export interface SpeedPoint {
  label: string;
  /** Velocidad media del intervalo, en km/h. */
  avgKmh: number;
  /** Velocidad máxima del intervalo, en km/h. */
  maxKmh: number;
}

export interface DeviceStats {
  deviceId: string;
  distanceKm: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
  movingSeconds: number;
  stoppedSeconds: number;
  /** Tiempo entre el primer y el último punto del rango. */
  spanSeconds: number;
  positionCount: number;
  distanceByBucket: DistancePoint[];
  speedByBucket: SpeedPoint[];
}

export interface FleetStats {
  deviceCount: number;
  movingCount: number;
  stoppedCount: number;
  offlineCount: number;
  unknownCount: number;
  distanceKm: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  movingSeconds: number;
  stoppedSeconds: number;
  /** Nº de dispositivos realmente incluidos en los agregados de historial. */
  devicesWithHistory: number;
  /** true si se truncó por VITE_DASHBOARD_MAX_DEVICES. */
  truncated: boolean;
}

/* -------------------------------------------------------------------------- */
/* Estado de sesión / conexión                                                */
/* -------------------------------------------------------------------------- */

export type ConnectionState = 'online' | 'offline' | 'checking' | 'unauthorized';

export interface SessionInfo {
  /** API Key con la que se autentica el cliente (no hay login de usuarios). */
  apiKey: string;
  /** Momento de validación de la clave. */
  validatedAt: number;
}
