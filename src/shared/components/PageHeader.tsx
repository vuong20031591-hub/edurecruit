/**
 * PageHeader — bar tiêu đề trang, full-width, theo Figma node 11:1142
 * Height: 62px, bg white, border-bottom slate-100
 * H1: 16px Bold #1d293d (navy-800)
 * Subtitle: 12px Regular #90a1b9 (slate-400)
 */
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Actions bên phải — dùng cho detail pages */
  actions?: ReactNode;
  /** Breadcrumb text cuối (Figma: "Trang chủ › <breadcrumb>") */
  breadcrumb?: string;
  className?: string;
}

export function PageHeader({ title, description, actions, breadcrumb, className }: PageHeaderProps) {
  return (
    <div className={cn('border-b border-slate-100 bg-white px-5 py-3', className)}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold leading-snug text-navy-800">{title}</h1>
          {description && (
            <p className="mt-0.5 text-xs text-slate-400">{description}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          {breadcrumb && (
            <nav aria-label="breadcrumb" className="hidden text-xs text-slate-400 sm:block">
              <span>Trang chủ</span>
              <span className="mx-1.5 text-slate-300">›</span>
              <span className="font-medium text-navy-600">{breadcrumb}</span>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
