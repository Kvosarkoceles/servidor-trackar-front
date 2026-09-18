import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  BellRing,
  Cpu,
  History,
  LayoutDashboard,
  Radar,
  Settings,
  Shapes,
  X,
} from 'lucide-react';

import { ConnectionStatus } from './ConnectionStatus';
import { useDevicesStore } from '@/stores/devicesStore';
import { ROUTES } from '@/utils/constants';
import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { to: ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.liveTracking, label: 'Rastreo', icon: Radar },
  { to: ROUTES.devices, label: 'Dispositivos', icon: Cpu },
  { to: ROUTES.history, label: 'Historial', icon: History },
  { to: ROUTES.statistics, label: 'Estadísticas', icon: BarChart3 },
  { to: ROUTES.events, label: 'Eventos', icon: BellRing },
  { to: ROUTES.geofences, label: 'Geocercas', icon: Shapes },
  { to: ROUTES.settings, label: 'Configuración', icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

/** Barra lateral de navegación (estática en escritorio, drawer en móvil). */
export function Sidebar({ open, onClose }: SidebarProps) {
  const devices = useDevicesStore((state) => state.devices);
  const moving = devices.filter((device) => device.status === 'moving').length;

  return (
    <>
      {/* Fondo del drawer en móvil */}
      <div
        className={cn(
          'fixed inset-0 z-[700] bg-black/50 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[701] flex w-64 shrink-0 flex-col border-r border-line bg-panel transition-transform',
          'lg:static lg:z-auto lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Navegación principal"
      >
        <div className="flex h-14 items-center justify-between border-b border-line px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Radar className="h-4 w-4" aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-content">GPS Monitor</p>
              <p className="text-[10px] uppercase tracking-wider text-content-muted">
                Telemetría en vivo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-content-muted hover:text-content lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-3">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === ROUTES.dashboard}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-brand-500/12 font-medium text-brand-400'
                          : 'text-content-muted hover:bg-panel-soft hover:text-content',
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-2 border-t border-line p-3">
          <div className="rounded-lg bg-panel-soft px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-content-muted">Dispositivos</p>
            <p className="text-sm font-semibold text-content">
              {devices.length}
              <span className="ml-1 text-[11px] font-normal text-status-moving">
                · {moving} en movimiento
              </span>
            </p>
          </div>
          <ConnectionStatus compact />
          <p className="px-1 text-[10px] leading-relaxed text-content-muted">
            backend: servidor-trackar · API Key
          </p>
        </div>
      </aside>
    </>
  );
}
