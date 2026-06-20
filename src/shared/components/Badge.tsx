import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

const variants: Record<Variant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger:  'bg-red-100 text-red-800',
  info:    'bg-sky-100 text-sky-800',
  neutral: 'bg-slate-100 text-slate-700',
  primary: 'bg-brand-100 text-brand-700'
};

export function Badge({
  variant = 'neutral',
  children,
  className
}: {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
