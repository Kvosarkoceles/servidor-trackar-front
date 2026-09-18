/**
 * Autenticación.
 *
 * ⚠ REALIDAD DEL BACKEND: no existe login de usuarios, ni JWT, ni sesiones, ni
 * OAuth. El único mecanismo es una **API Key global** (`GPS_API_KEY`) que se
 * envía en `Authorization: Bearer` o `X-API-Key`.
 *
 * Por eso `login()` NO envía usuario/contraseña: valida la API Key contra
 * `GET /api/devices`, que es el endpoint autenticado más ligero disponible.
 * Ver requisito 19 y 35 en API_INTEGRATION.md.
 * Además, el backend admite "modo abierto": si `GPS_API_KEY` NO está definida
 * en el servidor, no exige clave (registra el aviso `auth_disabled`). Por eso
 * esta función es capaz de entrar sin clave cuando el servidor lo permite.
 *
 * Ver requisitos 19/31 y API_INTEGRATION.md.
 */

import { instance } from './client';
import { listDevices } from './devices';
import type { Device } from '@/types';

export interface LoginResult {
  deviceCount: number;
  /** `true` si el backend no exige API Key (GPS_API_KEY vacía en el servidor). */
  openMode: boolean;
}

/** Aplica (o limpia) la cabecera de autenticación por defecto del cliente. */
function withApiKey<T>(apiKey: string, task: () => Promise<T>): Promise<T> {
  const previous = instance.defaults.headers.common['Authorization'];

  if (apiKey !== '') instance.defaults.headers.common['Authorization'] = `Bearer ${apiKey}`;
  else delete instance.defaults.headers.common['Authorization'];

  return task().finally(() => {
    if (previous === undefined) delete instance.defaults.headers.common['Authorization'];
    else instance.defaults.headers.common['Authorization'] = previous;
  });
}

/**
 * Valida el acceso al backend.
 *
 * - Con clave: la envía y comprueba contra `GET /api/devices`.
 * - Sin clave: intenta la misma llamada; si el servidor responde 200 está en
 *   modo abierto y se permite el acceso; si responde 401/403 se informa.
 *
 * Lanza `AppError` (unauthorized/forbidden/network/...) si no es posible.
 */
export async function validateApiKey(apiKey: string, signal?: AbortSignal): Promise<LoginResult> {
  const trimmed = apiKey.trim();
  const devices: Device[] = await withApiKey(trimmed, () => listDevices(signal));

  return { deviceCount: devices.length, openMode: trimmed === '' };
}
