import { useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle, Inbox, X } from 'lucide-react';

import { Button } from './Button';
import { cn } from '@/utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

/** Modal accesible: cierra con Escape y con clic en el fondo. */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'panel w-full max-h-[90vh] overflow-hidden animate-fade-in',
          size === 'sm' && 'max-w-sm',
          size === 'md' && 'max-w-lg',
          size === 'lg' && 'max-w-3xl',
        )}
      >
        <div className="panel-header">
          <h2 className="panel-title">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4 scrollbar-thin">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-line p-4">{footer}</div> : null}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

/** Estado vacío reutilizable (también para funcionalidades no soportadas). */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-panel-soft text-content-muted">
        {icon ?? <Inbox className="h-5 w-5" />}
      </span>
      <div>
        <p className="text-sm font-semibold text-content">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-content-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** Mensaje de error con reintento. */
export function ErrorState({
  message,
  detail,
  onRetry,
}: {
  message: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-offline/10 text-status-offline">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <p className="max-w-md text-sm text-content">{message}</p>
      {detail ? <p className="max-w-md font-mono text-[11px] text-content-muted">{detail}</p> : null}
      {onRetry ? (
        <Button size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

/** Etiqueta informativa usada para marcar funciones no soportadas por el backend. */
export function InfoNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
      <p className="text-xs font-semibold text-brand-400">{title}</p>
      <div className="mt-1 text-xs leading-relaxed text-content-muted">{children}</div>
    </div>
  );
}
