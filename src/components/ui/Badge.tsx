import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

interface BadgeProps {
  children: ReactNode;
  className?: string;
  dot?: string;
}

export function Badge({ children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line bg-panel-soft px-2 py-0.5',
        'text-[11px] font-medium text-content',
        className,
      )}
    >
      {dot ? <span className={cn('h-1.5 w-1.5 rounded-full', dot)} aria-hidden /> : null}
      {children}
    </span>
  );
}
