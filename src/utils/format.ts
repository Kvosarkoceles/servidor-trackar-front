/**
 * Utilidades de formato para la interfaz.
 *
 * Nomenclatura usada en toda la app:
 *   `fmt*`    -> devuelve string listo para pintar.
 *   `parse*`  -> convierte de string a valor.
 */

const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Formatea un ISO en fecha + hora legibles. */
export function fmtDateTime(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : '—';
}

/** Formatea un ISO solo como hora. */
export function fmtTime(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  return date ? timeFormatter.format(date) : '—';
}

/** Formatea un ISO solo como fecha. */
export function fmtDate(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : '—';
}

/** Convierte a `Date` si es válido; en caso contrario `null`. */
export function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Convierte un Date a valor para `<input type="datetime-local">`. */
export function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** "Hace 2 minutos", "Hace 3 horas", etc. */
export function fmtRelative(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return 'Sin datos';

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 0) return 'Ahora';
  if (seconds < 45) return 'Hace unos segundos';
  if (seconds < 90) return 'Hace 1 minuto';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} minutos`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;

  const days = Math.round(hours / 24);
  return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
}

/** Duración legible a partir de segundos: "2 h 15 min", "45 min", "30 s". */
export function fmtDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds)) {
    return '—';
  }
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds} s`;

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (restMinutes === 0) return `${hours} h`;
  return `${hours} h ${restMinutes} min`;
}

/** Cronómetro `mm:ss` / `hh:mm:ss` para el reproductor de recorridos. */
export function fmtClock(totalSeconds: number | null | undefined): string {
  const seconds = Math.max(0, Math.round(totalSeconds ?? 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Distancia: "0 m", "850 m", "12.4 km". */
export function fmtDistance(km: number | null | undefined): string {
  if (km === null || km === undefined || !Number.isFinite(km)) return '—';
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return meters === 0 ? '0 m' : `${meters} m`;
  }
  return `${km.toFixed(km < 10 ? 2 : 1)} km`;
}

/** Velocidad en km/h. */
export function fmtSpeed(kmh: number | null | undefined): string {
  if (kmh === null || kmh === undefined || !Number.isFinite(kmh)) return '—';
  return `${Math.round(kmh)} km/h`;
}

/** Coordenadas con 5 decimales (~1 m de precisión). */
export function fmtCoord(lat: number | null | undefined, lng: number | null | undefined): string {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return '—';
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '—';
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/** Batería: "87 %". */
export function fmtBattery(level: number | null | undefined): string {
  if (level === null || level === undefined || !Number.isFinite(level)) return '—';
  return `${Math.round(level)} %`;
}

/** Altitud en metros. */
export function fmtAltitude(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) return '—';
  return `${Math.round(meters)} m`;
}

/** Precisión en metros. */
export function fmtAccuracy(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) return '—';
  return `±${Math.round(meters)} m`;
}

/** Rumbo en grados + punto cardinal. */
export function fmtBearing(bearing: number | null | undefined): string {
  if (bearing === null || bearing === undefined || !Number.isFinite(bearing)) return '—';
  const normalized = ((bearing % 360) + 360) % 360;
  const cardinal = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][
    Math.round(normalized / 45) % 8
  ];
  return `${Math.round(normalized)}° ${cardinal}`;
}

/** Número entero con separador de miles. */
export function fmtNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('es-MX').format(value);
}
