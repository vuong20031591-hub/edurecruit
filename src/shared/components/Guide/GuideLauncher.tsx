'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BookOpen, ChevronDown, GraduationCap, Sparkles } from 'lucide-react';
import { findMiniTour, ONBOARDING_TOUR } from '../../lib/guide';
import { useGuideContext } from './GuideContext';

export function GuideLauncher() {
  const { startTour, isRunning } = useGuideContext();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const miniTour = findMiniTour(pathname);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (isRunning) return null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        title="Hướng dẫn sử dụng"
      >
        <BookOpen size={15} />
        <span className="hidden sm:inline">Hướng dẫn</span>
        <ChevronDown size={12} className="text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-72 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <div className="px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-slate-400">
            Bạn muốn học gì?
          </div>

          {/* Tour tổng quan 9 bước */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              startTour(ONBOARDING_TOUR);
            }}
            className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
              <Sparkles size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900">
                Hướng dẫn tổng quan (9 bước)
              </div>
              <div className="mt-0.5 text-2xs text-slate-500">
                Đi qua toàn bộ quy trình tuyển dụng theo PRD
              </div>
            </div>
          </button>

          {/* Mini-tour của trang hiện tại */}
          {miniTour && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                startTour(miniTour);
              }}
              className="flex w-full items-start gap-3 border-t border-slate-100 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                <GraduationCap size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900">
                  Hướng dẫn trang này
                </div>
                <div className="mt-0.5 text-2xs text-slate-500">
                  {miniTour.description} · {miniTour.steps.length} bước
                </div>
              </div>
            </button>
          )}

          {!miniTour && pathname.startsWith('/dashboard/cai-dat') && (
            <div className="border-t border-slate-100 px-3 py-2.5 text-2xs text-slate-400">
              Trang này chưa có mini-tour. Hãy thử "Hướng dẫn tổng quan".
            </div>
          )}
        </div>
      )}
    </div>
  );
}
