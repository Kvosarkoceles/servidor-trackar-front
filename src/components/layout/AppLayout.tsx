import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useDevicesPolling } from '@/hooks/useDevicesPolling';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/stores/authStore';
import { useDevicesStore } from '@/stores/devicesStore';
import { ROUTES, STORAGE_KEYS } from '@/utils/constants';
import { localStore } from '@/utils/storage';
import { useNavigate } from 'react-router-dom';

/**
 * Layout principal de la aplicación autenticada.
 *
 * Arranca aquí el polling de posiciones (`GET /api/devices` cada N segundos),
 * porque es el canal de tiempo real del backend para todas las páginas.
 */
export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const error = useDevicesStore((state) => state.error);

  useTheme();
  useDevicesPolling();

  // Si la API Key deja de ser válida, se vuelve a /login conservando el motivo.
  useEffect(() => {
    if (status === 'unauthenticated') {
      navigate(ROUTES.login, { replace: true });
    }
  }, [status, navigate]);

  useEffect(() => {
    if (error?.kind === 'unauthorized' || error?.kind === 'forbidden') {
      navigate(ROUTES.login, { replace: true });
    }
  }, [error, navigate]);

  // Restaura el tema guardado si cambió en otra pestaña.
  useEffect(() => {
    localStore.set(STORAGE_KEYS.theme, document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
