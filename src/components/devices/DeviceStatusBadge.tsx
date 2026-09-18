import { cn } from '@/utils/cn';
import { STATUS_META } from '@/utils/device';
import type { DeviceStatus } from '@/types';

/** Badge de estado (color + texto, nunca solo color: requisito 30). */
export function DeviceStatusBadge({
  status,
  className,
}: {
  status: DeviceStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
        meta.badge,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}

/** Punto de estado cuadrado para espacios reducidos. */
export function DeviceStatusDot({ status }: { status: DeviceStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', meta.dot)}
      title={meta.label}
      role="img"
      aria-label={meta.label}
    />
  );
}
