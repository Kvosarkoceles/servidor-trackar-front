/**
 * Traducción de errores técnicos a mensajes humanos.
 *
 * El backend responde `{ success: false, error: "<mensaje público>" }`, pero
 * además pueden aparecer errores de red/CORS/timeout. Nunca se muestra un
 * mensaje crudo de Axios al usuario (ver requisito 20).
 */

export type AppErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'bad_request'
  | 'rate_limited'
  | 'server'
  | 'network'
  | 'timeout'
  | 'canceled'
  | 'unknown';

export interface AppError {
  kind: AppErrorKind;
  /** Mensaje listo para mostrar al usuario (en español). */
  message: string;
  /** Detalle técnico, solo para consola en desarrollo. */
  detail?: string;
  status?: number;
  /** Código del backend cuando lo envía. */
  backendMessage?: string;
}

function messageForKind(kind: AppErrorKind): string {
  switch (kind) {
    case 'unauthorized':
      return 'Tu sesión no está activa. Inicia sesión nuevamente.';
    case 'forbidden':
      return 'La clave de API no es válida o no tiene permisos.';
    case 'not_found':
      return 'No se encontró la información solicitada.';
    case 'bad_request':
      return 'La solicitud contiene datos inválidos.';
    case 'rate_limited':
      return 'Demasiadas solicitudes. Espera unos segundos e intenta de nuevo.';
    case 'server':
      return 'El servidor no pudo procesar la solicitud. Intenta nuevamente.';
    case 'network':
      return 'No fue posible conectar con el servidor. Revisa tu conexión.';
    case 'timeout':
      return 'El servidor tardó demasiado en responder. Intenta nuevamente.';
    case 'canceled':
      return 'Solicitud cancelada.';
    default:
      return 'Ocurrió un error inesperado. Intenta nuevamente.';
  }
}

interface AxiosLikeError {
  isAxiosError?: boolean;
  code?: string;
  message?: string;
  response?: { status?: number; data?: unknown };
  config?: { url?: string; method?: string };
}

function readBackendMessage(data: unknown): string | undefined {
  if (data && typeof data === 'object' && 'error' in data) {
    const value = (data as { error?: unknown }).error;
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return undefined;
}

function kindFromStatus(status: number): AppErrorKind {
  if (status === 400 || status === 413 || status === 422) return 'bad_request';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'unknown';
}

/** Convierte cualquier excepción en un `AppError` legible. */
export function toAppError(error: unknown): AppError {
  const candidate = error as AxiosLikeError;

  if (candidate?.isAxiosError === true) {
    const status = candidate.response?.status;
    let kind: AppErrorKind;

    if (candidate.code === 'ERR_CANCELED') kind = 'canceled';
    else if (candidate.code === 'ECONNABORTED' || candidate.code === 'ETIMEDOUT') kind = 'timeout';
    else if (candidate.response === undefined) kind = 'network';
    else kind = kindFromStatus(status ?? 0);

    const backendMessage = readBackendMessage(candidate.response?.data);
    return {
      kind,
      status,
      backendMessage,
      detail: `${candidate.config?.method?.toUpperCase() ?? 'GET'} ${candidate.config?.url ?? ''} -> ${
        candidate.message ?? 'error'
      }`,
      message: messageForKind(kind),
    };
  }

  if (error instanceof Error) {
    return { kind: 'unknown', message: messageForKind('unknown'), detail: error.message };
  }

  return { kind: 'unknown', message: messageForKind('unknown'), detail: String(error) };
}

/** ¿El error implica que hay que volver a autenticarse? */
export function isAuthError(error: AppError): boolean {
  return error.kind === 'unauthorized' || error.kind === 'forbidden';
}

/** Registra el detalle técnico solo en desarrollo. */
export function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(`[${context}]`, error);
  }
}
