import { cn } from '@/utils/cn';

/** Bloque de esqueleto para estados de carga. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-line', className)} />;
}

/** Esqueleto de tarjeta KPI. */
export function SkeletonCard() {
  return (
    <div className="panel space-y-3 p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-14" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

/** Esqueleto de fila de tabla. */
export function SkeletonTable({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2 p-4" aria-hidden>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn('h-8 flex-1', columnIndex === 0 && 'max-w-[180px]')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Esqueleto de panel con gráfica. */
export function SkeletonChart({ height = 240 }: { height?: number }) {
  return (
    <div className="space-y-3 p-4" aria-hidden style={{ height }}>
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-full w-full" />
    </div>
  );
}
