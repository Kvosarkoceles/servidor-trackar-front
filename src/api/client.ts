/**
 * Cliente HTTP centralizado (Axios).
 *
 * Responsabilidades:
 *   - baseURL configurable en runtime (útil si se cambia desde /configuracion)
 *   - cabecera de autenticación (API Key del backend)
 *   - timeout
 *   - traducción de errores técnicos a mensajes humanos
 *   - aviso global cuando la API Key deja de ser válida (401/403)
 *
 * El backend autentica con API Key (Bearer / X-API-Key), NO con JWT de usuario.
 * Ver `src/middleware/auth.js` del backend y API_INTEGRATION.md.
 */

import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { API_BASE_URL, HTTP_TIMEOUT_MS } from '@/utils/constants';
import { toAppError } from '@/utils/errors';
import type { AppError } from '@/utils/errors';

let baseUrl = API_BASE_URL;

let tokenProvider: () => string | null = () => null;
let authFailureHandler: ((error: AppError) => void) | null = null;

/** Permite sobrescribir la URL base en runtime (ajustes del usuario). */
export function setApiBaseUrl(url: string): void {
  baseUrl = (url || API_BASE_URL).replace(/\/+$/, '');
  instance.defaults.baseURL = baseUrl;
}

export function getApiBaseUrl(): string {
  return baseUrl;
}

/** Registra la función que entrega la API Key actual. */
export function setAuthTokenProvider(provider: () => string | null): void {
  tokenProvider = provider;
}

/** Registra el manejador que se invoca cuando la API Key es rechazada. */
export function setAuthFailureHandler(handler: ((error: AppError) => void) | null): void {
  authFailureHandler = handler;
}

export const instance: AxiosInstance = axios.create({
  baseURL: baseUrl,
  timeout: HTTP_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenProvider();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
    config.headers.set('X-API-Key', token);
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const appError = toAppError(error);
    if (appError.kind === 'unauthorized' || appError.kind === 'forbidden') {
      authFailureHandler?.(appError);
    }
    return Promise.reject(appError);
  },
);

/** Extrae el `data` de una respuesta tipada. */
export async function getJson<T>(url: string, params?: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const response = await instance.get<T>(url, { params, signal });
  return response.data;
}

/** `PUT` con cuerpo JSON. */
export async function putJson<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await instance.put<T>(url, body, { signal });
  return response.data;
}

/** `DELETE` sin cuerpo. */
export async function deleteJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await instance.delete<T>(url, { signal });
  return response.data;
}
