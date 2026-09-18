import { useDevicesStore } from '@/stores/devicesStore';
import { fmtRelative } from '@/utils/format';
import { cn } from '@/utils/cn';

/**
 * Indicador de conexión con el backend (requisito 7).
 *
 * Refleja el resultado del último polling: `online`, `offline` (error de red o
 * del servidor) o `unauthorized` (API Key rechazada).
 */
export function ConnectionStatus({ compact = false }: { compact?: boolean }) {
  const connection = useDevicesStore((state) => state.connection);
  const lastUpdatedAt = useDevicesStore((state) => state.lastUpdatedAt);
  const refreshing = useDevicesStore((state) => state.refreshing);

  const config = {
    online: {
      label: 'CONECTADO',
      dot: 'bg-status-moving',
      text: 'text-status-moving',
    },
    checking: {
      label: 'CONECTANDO',
      dot: 'bg-brand-400',
      text: 'text-brand-400',
    },
    offline: {
      label: 'SIN CONEXIÓN',
      dot: 'bg-status-offline',
      text: 'text-status-offline',
    },
    unauthorized: {
      label: 'SIN AUTORIZACIÓN',
      dot: 'bg-status-offline',
      text: 'text-status-offline',
    },
  }[connection];

  return (
    <div
      className="flex items-center gap-2"
      role="status"
      aria-live="polite"
      title={
        lastUpdatedAt
          ? `Última actualización: ${fmtRelative(lastUpdatedAt)}`
          : 'Aún no se ha consultado el backend'
      }
    >
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        <span className={cn('h-2 w-2 rounded-full', config.dot)} aria-hidden />
        {connection === 'online' && refreshing ? (
          <span className={cn('absolute h-2.5 w-2.5 animate-pulse-ring rounded-full', config.dot)} aria-hidden />
        ) : null}
      </span>
      <span className={cn('text-[11px] font-semibold tracking-wide', config.text)}>
        {config.label}
      </span>
      {!compact && lastUpdatedAt ? (
        <span className="hidden text-[11px] text-content-muted lg:inline">
          · {fmtRelative(lastUpdatedAt)}
        </span>
      ) : null}
    </div>
  );
}
