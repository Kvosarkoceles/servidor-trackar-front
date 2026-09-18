import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Radar } from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { ROUTES } from '@/utils/constants';

/** Pantalla de carga mientras se restaura la sesión. */
function BootLoader({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface">
      <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-brand-600 text-white">
        <Radar className="h-6 w-6" aria-hidden />
      </span>
      <p className="text-xs text-content-muted">{message}</p>
    </div>
  );
}

/**
 * Guarda de rutas privadas (requisito 19).
 *
 * La comprobación real de permisos la hace SIEMPRE el backend (responde 401/403);
 * aquí solo se gestiona la experiencia de navegación y el estado de la sesión.
 */
export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status);
  const apiKey = useAuthStore((state) => state.apiKey);
  const openMode = useAuthStore((state) => state.openMode);
  const restore = useAuthStore((state) => state.restore);
  const bootstrapped = useRef(false);

  // Restaura la sesión guardada una sola vez al arrancar.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    if (status === 'idle') void restore();
  }, [status, restore]);

  if (status === 'idle') return <BootLoader message="Iniciando GPS Monitor…" />;
  if (status === 'checking') return <BootLoader message="Validando sesión…" />;

  // Si hay credencial (o el backend está en modo abierto) pero no responde, se
  // permite entrar: la propia interfaz indicará "SIN CONEXIÓN" y reintentará.
  const allowed = status === 'authenticated' || (status === 'error' && (apiKey !== '' || openMode));
  if (!allowed) return <Navigate to={ROUTES.login} replace />;

  return <Outlet />;
}
