import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BatteryLow, Bell, BellOff, CheckCheck, Gauge, WifiOff, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { unreadAlertCount, useAlertsStore } from '@/stores/alertsStore';
import { fmtRelative } from '@/utils/format';
import { cn } from '@/utils/cn';
import { ROUTES } from '@/utils/constants';
import type { Alert } from '@/types';

const ICONS = {
  overspeed: Gauge,
  low_battery: BatteryLow,
  disconnected: WifiOff,
  gps_lost: WifiOff,
  movement: Gauge,
  stop: Gauge,
} as const;

function AlertRow({ alert, onOpen }: { alert: Alert; onOpen: () => void }) {
  const Icon = ICONS[alert.type] ?? Gauge;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-panel-soft',
        alert.read && 'opacity-60',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          alert.severity === 'critical'
            ? 'bg-status-offline/10 text-status-offline'
            : alert.severity === 'warning'
              ? 'bg-status-stopped/10 text-status-stopped'
              : 'bg-brand-500/10 text-brand-400',
        )}
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-content">{alert.message}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-content-muted">
          {fmtRelative(alert.detectedAt)}
          {!alert.read ? <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-label="Sin leer" /> : null}
        </span>
      </span>
    </button>
  );
}

/**
 * Campana de alertas del header (requisito 14).
 *
 * Las alertas se derivan en el cliente a partir de datos reales del backend
 * (último contacto, velocidad y batería). El backend no envía notificaciones,
 * lo que se indica explícitamente en el pie del panel.
 */
export function AlertsBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const alerts = useAlertsStore((state) => state.alerts);
  const markAllRead = useAlertsStore((state) => state.markAllRead);
  const unread = useMemo(() => unreadAlertCount(alerts), [alerts]);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Alertas${unread > 0 ? `: ${unread} sin leer` : ''}`}
        aria-expanded={open}
        title="Alertas"
      >
        <span className="relative">
          <Bell className="h-[18px] w-[18px]" aria-hidden />
          {unread > 0 ? (
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-offline px-1 text-[10px] font-semibold text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </span>
      </Button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Cerrar alertas"
            className="fixed inset-0 z-[500] cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-12 z-[501] w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-panel shadow-panel animate-fade-in">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <p className="text-xs font-semibold text-content">Alertas</p>
              <div className="flex items-center gap-1">
                {alerts.length > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={markAllRead}
                    icon={<CheckCheck className="h-3.5 w-3.5" />}
                  >
                    Marcar leídas
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {alerts.length === 0 ? (
                <EmptyState
                  icon={<BellOff className="h-5 w-5" />}
                  title="Sin alertas"
                  description="No hay dispositivos offline, excesos de velocidad ni batería baja en la última actualización."
                />
              ) : (
                <ul className="divide-y divide-line/60">
                  {alerts.map((alert) => (
                    <li key={alert.id}>
                      <AlertRow
                        alert={alert}
                        onOpen={() => {
                          setOpen(false);
                          navigate(`${ROUTES.devices}/${encodeURIComponent(alert.deviceId)}`);
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="border-t border-line px-4 py-2 text-[10px] leading-relaxed text-content-muted">
              Derivadas en el cliente a partir de la última posición reportada. El backend no expone
              todavía un endpoint de notificaciones ({' '}
              <span className="font-mono">GET /api/events</span> ).
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}