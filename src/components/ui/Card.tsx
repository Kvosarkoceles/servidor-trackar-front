import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('panel', className)}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="panel-header">
      <div className="flex min-w-0 items-center gap-2">
        {icon ? <span className="text-content-muted">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="panel-title truncate">{title}</h2>
          {subtitle ? <p className="truncate text-xs text-content-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-4', className)}>{children}</div>;
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: string;
  loading?: boolean;
}

/** Tarjeta compacta de KPI para el dashboard. */
export function StatCard({ label, value, hint, icon, accent, loading }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-content-muted">
            {label}
          </p>
          {loading ? (
            <div className="mt-2 h-7 w-16 animate-pulse rounded bg-line" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tabular-nums text-content">{value}</p>
          )}
          {hint ? <p className="mt-1 truncate text-xs text-content-muted">{hint}</p> : null}
        </div>
        {icon ? (
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-panel-soft',
              accent,
            )}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
