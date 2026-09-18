/**
 * `GET /api/health` — público, sin API Key.
 * Se usa para distinguir "backend caído" de "clave inválida" en /login.
 */

import { getJson } from './client';
import type { HealthResponse } from '@/types';

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return getJson<HealthResponse>('/health', undefined, signal);
}
