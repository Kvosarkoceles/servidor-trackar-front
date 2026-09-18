/**
 * Estado de autenticación (basado en API Key del backend).
 *
 * No hay usuario/contraseña: `apiKey` es la credencial completa. Se guarda en
 * `localStorage` si el usuario marca "recordar sesión" y en `sessionStorage`
 * en caso contrario, igual que haría un token de sesión.
 */

import { create } from 'zustand';

import { validateApiKey } from '@/api/auth';
import { getHealth } from '@/api/health';
import { setAuthFailureHandler, setAuthTokenProvider } from '@/api/client';
import { DEFAULT_API_KEY, STORAGE_KEYS } from '@/utils/constants';
import { localStore, sessionStore } from '@/utils/storage';
import { toAppError, type AppError } from '@/utils/errors';

export type AuthStatus = 'idle' | 'checking' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthState {
  apiKey: string;
  status: AuthStatus;
  deviceCount: number;
  error: AppError | null;
  /** `true` mientras se valida la clave en el backend. */
  loading: boolean;
  login: (apiKey: string, remember: boolean) => Promise<boolean>;
  logout: () => void;
  restore: () => Promise<void>;
  /** Mensaje de sesión caducada (p. ej. la clave cambió en el servidor). */
  sessionExpired: boolean;
  /** `true` cuando el backend no exige API Key (GPS_API_KEY vacía). */
  openMode: boolean;
}

/** Recupera la clave guardada (localStorage prioriza sobre sessionStorage). */
function readStoredKey(): string {
  return localStore.get(STORAGE_KEYS.apiKey) ?? sessionStore.get(STORAGE_KEYS.apiKey) ?? '';
}

function persistKey(apiKey: string, remember: boolean): void {
  localStore.remove(STORAGE_KEYS.apiKey);
  sessionStore.remove(STORAGE_KEYS.apiKey);
  if (!apiKey) return;
  if (remember) localStore.set(STORAGE_KEYS.apiKey, apiKey);
  else sessionStore.set(STORAGE_KEYS.apiKey, apiKey);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  apiKey: readStoredKey() || DEFAULT_API_KEY,
  status: 'idle',
  deviceCount: 0,
  error: null,
  loading: false,
  sessionExpired: false,
  openMode: false,

  login: async (apiKey, remember) => {
    set({ loading: true, error: null });
    try {
      const result = await validateApiKey(apiKey);
      persistKey(apiKey.trim(), remember);
      set({
        apiKey: apiKey.trim(),
        status: 'authenticated',
        deviceCount: result.deviceCount,
        openMode: result.openMode,
        loading: false,
        sessionExpired: false,
      });
      return true;
    } catch (error) {
      const appError = (error as AppError)?.kind ? (error as AppError) : toAppError(error);
      set({ status: 'unauthenticated', loading: false, error: appError });
      return false;
    }
  },

  logout: () => {
    persistKey('', true);
    set({
      apiKey: '',
      status: 'unauthenticated',
      deviceCount: 0,
      error: null,
      sessionExpired: false,
      openMode: false,
    });
  },

  restore: async () => {
    const apiKey = get().apiKey;

    set({ status: 'checking' });
    try {
      // Primero comprobamos que el servicio responde (endpoint público).
      await getHealth();
      // Sin clave se intenta el modo abierto del backend.
      const result = await validateApiKey(apiKey);
      set({
        status: 'authenticated',
        deviceCount: result.deviceCount,
        openMode: result.openMode,
        sessionExpired: false,
      });
    } catch (error) {
      const appError = (error as AppError)?.kind ? (error as AppError) : toAppError(error);
      if (appError.kind === 'unauthorized' || appError.kind === 'forbidden') {
        persistKey('', true);
        set({ apiKey: '', status: 'unauthenticated', error: appError, openMode: false });
      } else {
        // El backend no responde, pero conservamos la clave para reintentar.
        set({ status: 'error', error: appError });
      }
    }
  },
}));

/** Inicializa el cliente HTTP con la clave actual. Debe llamarse una vez en main.tsx. */
export function initAuthIntegration(): void {
  setAuthTokenProvider(() => useAuthStore.getState().apiKey);
  setAuthFailureHandler((error) => {
    // Un 401/403 del backend significa que la clave dejó de ser válida.
    const state = useAuthStore.getState();
    if (state.status === 'authenticated' || state.status === 'checking') {
      persistKey('', true);
      useAuthStore.setState({
        apiKey: '',
        status: 'unauthenticated',
        error,
        sessionExpired: true,
        openMode: false,
      });
    }
  });
}
