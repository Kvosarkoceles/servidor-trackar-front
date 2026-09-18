import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Monitor, Moon, Sun, User } from 'lucide-react';

import { AlertsBell } from '@/components/alerts/AlertsBell';
import { ConnectionStatus } from './ConnectionStatus';
import { GlobalSearch } from './GlobalSearch';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useDevicesStore } from '@/stores/devicesStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTheme } from '@/hooks/useTheme';
import { ROUTES } from '@/utils/constants';

/** Barra superior: búsqueda, estado de conexión, alertas, tema y usuario. */
export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const [userOpen, setUserOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const logout = useAuthStore((state) => state.logout);
  const resetDevices = useDevicesStore((state) => state.reset);
  const resetSettings = useSettingsStore((state) => state.reset);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel px-3 lg:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden min-w-0 flex-1 lg:flex">
        <GlobalSearch />
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5 lg:flex-none">
        <div className="mr-1 hidden md:block">
          <ConnectionStatus />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <AlertsBell />

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setUserOpen((value) => !value)}
            aria-label="Menú de usuario"
            aria-expanded={userOpen}
            title="Sesión"
          >
            <User className="h-4 w-4" />
          </Button>

          {userOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-[500] cursor-default"
                aria-label="Cerrar menú de usuario"
                onClick={() => setUserOpen(false)}
              />
              <div className="absolute right-0 top-12 z-[501] w-64 overflow-hidden rounded-xl border border-line bg-panel shadow-panel animate-fade-in">
                <div className="border-b border-line px-4 py-3">
                  <p className="text-xs font-semibold text-content">Sesión activa</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-content-muted">
                    Autenticación por API Key. El backend no dispone de cuentas de usuario ni de
                    roles.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setUserOpen(false);
                    navigate(ROUTES.settings);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-content hover:bg-panel-soft"
                >
                  <Monitor className="h-3.5 w-3.5" aria-hidden />
                  Configuración y conexión
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserOpen(false);
                    resetDevices();
                    resetSettings();
                    logout();
                    navigate(ROUTES.login, { replace: true });
                  }}
                  className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left text-xs text-status-offline hover:bg-status-offline/10"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden />
                  Cerrar sesión
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
