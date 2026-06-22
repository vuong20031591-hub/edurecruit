'use client';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GuidePlacement, GuideStep } from '../../lib/guide';

interface TooltipProps {
  step: GuideStep;
  stepIndex: number;
  totalSteps: number;
  /** Tooltip ở giữa màn hình (cho step không có target). */
  centered: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

const TOOLTIP_W = 360;
const TOOLTIP_GAP = 12;
const SPOTLIGHT_PAD = 8; // padding của spotlight cutout quanh target
const TOOLTIP_Z = 2147483000;

type Rect = { top: number; left: number; right: number; bottom: number };

function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

interface ComputedPos {
  top: number;
  left: number;
  placement: GuidePlacement | 'corner';
}

/**
 * Tính vị trí tooltip tránh đè spotlight cutout (target + SPOTLIGHT_PAD).
 * Ưu tiên theo preferredPlacement, nếu đè → thử 3 placement còn lại,
 * nếu tất cả đều đè → chọn góc màn hình xa target nhất.
 */
function computeNonOverlappingPos(
  targetRect: DOMRect,
  preferredPlacement: GuidePlacement,
  tooltipW: number,
  tooltipH: number,
  viewportW: number,
  viewportH: number
): ComputedPos {
  const spotlight: Rect = {
    top: targetRect.top - SPOTLIGHT_PAD,
    left: targetRect.left - SPOTLIGHT_PAD,
    right: targetRect.right + SPOTLIGHT_PAD,
    bottom: targetRect.bottom + SPOTLIGHT_PAD,
  };

  const tx = targetRect.left + targetRect.width / 2;
  const ty = targetRect.top + targetRect.height / 2;

  const buildCandidate = (p: GuidePlacement): { top: number; left: number } => {
    let top = 0;
    let left = 0;
    switch (p) {
      case 'top':
        top = spotlight.top - tooltipH - TOOLTIP_GAP;
        left = tx - tooltipW / 2;
        break;
      case 'bottom':
        top = spotlight.bottom + TOOLTIP_GAP;
        left = tx - tooltipW / 2;
        break;
      case 'left':
        top = ty - tooltipH / 2;
        left = spotlight.left - tooltipW - TOOLTIP_GAP;
        break;
      case 'right':
        top = ty - tooltipH / 2;
        left = spotlight.right + TOOLTIP_GAP;
        break;
    }
    // Clamp trong viewport
    top = Math.max(12, Math.min(top, viewportH - tooltipH - 12));
    left = Math.max(12, Math.min(left, viewportW - tooltipW - 12));
    return { top, left };
  };

  const tooltipRect = (top: number, left: number): Rect => ({
    top,
    left,
    right: left + tooltipW,
    bottom: top + tooltipH,
  });

  // Thử preferred trước, rồi các placement còn lại
  const order: GuidePlacement[] = [
    preferredPlacement,
    ...(['top', 'bottom', 'left', 'right'] as GuidePlacement[]).filter(
      (p) => p !== preferredPlacement
    ),
  ];

  for (const p of order) {
    const c = buildCandidate(p);
    if (!rectsOverlap(tooltipRect(c.top, c.left), spotlight)) {
      return { ...c, placement: p };
    }
  }

  // Tất cả placement đều đè spotlight → chọn góc màn hình xa target nhất
  const corners: Array<{ top: number; left: number }> = [
    { top: 16, left: 16 }, // top-left
    { top: 16, left: viewportW - tooltipW - 16 }, // top-right
    { top: viewportH - tooltipH - 16, left: 16 }, // bottom-left
    { top: viewportH - tooltipH - 16, left: viewportW - tooltipW - 16 }, // bottom-right
  ];

  // Tính khoảng cách từ góc đến tâm target, chọn góc xa nhất (không đè spotlight nếu có thể)
  let best = corners[0];
  let bestDist = -1;
  for (const c of corners) {
    const dx = c.left + tooltipW / 2 - tx;
    const dy = c.top + tooltipH / 2 - ty;
    const dist = dx * dx + dy * dy;
    if (!rectsOverlap(tooltipRect(c.top, c.left), spotlight) && dist > bestDist) {
      best = c;
      bestDist = dist;
    }
  }
  // Nếu tất cả góc đều đè → lấy góc xa nhất
  if (bestDist < 0) {
    for (const c of corners) {
      const dx = c.left + tooltipW / 2 - tx;
      const dy = c.top + tooltipH / 2 - ty;
      const dist = dx * dx + dy * dy;
      if (dist > bestDist) {
        best = c;
        bestDist = dist;
      }
    }
  }

  return { ...best, placement: 'corner' };
}

export function Tooltip({
  step,
  stepIndex,
  totalSteps,
  centered,
  onPrev,
  onNext,
  onClose,
}: TooltipProps) {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= totalSteps - 1;
  const placement = (step.placement ?? 'bottom') as GuidePlacement;
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tự đo rect từ target selector — không phụ thuộc Spotlight
  useEffect(() => {
    if (centered || !step.target) {
      setPos(null);
      return;
    }

    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let mo: MutationObserver | null = null;

    const applyPos = (r2: DOMRect) => {
      const w = TOOLTIP_W;
      const h = 220;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const computed = computeNonOverlappingPos(r2, placement, w, h, vw, vh);
      if (!isFinite(computed.top) || !isFinite(computed.left)) return;
      setPos({ top: computed.top, left: computed.left });
    };

    const measure = () => {
      if (cancelled) return;
      let el: HTMLElement | null = null;
      try {
        el = document.querySelector<HTMLElement>(step.target!);
      } catch {
        return;
      }
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (!isFinite(r.top) || !isFinite(r.left) || r.width === 0 || r.height === 0) {
        return;
      }
      // Scroll nếu ngoài viewport
      if (r.top < 0 || r.bottom > window.innerHeight || r.left < 0 || r.right > window.innerWidth) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      requestAnimationFrame(() => {
        if (cancelled) return;
        const r2 = el!.getBoundingClientRect();
        applyPos(r2);

        // Theo dõi resize của element để cập nhật vị trí khi cần
        if (ro) ro.disconnect();
        ro = new ResizeObserver(() => {
          if (cancelled) return;
          const r3 = el!.getBoundingClientRect();
          if (r3.width > 0 && r3.height > 0) applyPos(r3);
        });
        ro.observe(el);
      });
    };

    // Retry nhiều lần cho DOM ready (10 lần × 200ms = 2s)
    let attempts = 0;
    const tryMeasure = () => {
      if (cancelled) return;
      const el = (() => {
        try { return document.querySelector(step.target!); } catch { return null; }
      })();
      if (el) {
        measure();
        return;
      }
      if (attempts < 10) {
        attempts++;
        setTimeout(tryMeasure, 200);
      }
    };
    tryMeasure();

    // Watch DOM để re-measure khi element thay đổi
    mo = new MutationObserver(() => {
      if (cancelled) return;
      const el = (() => {
        try { return document.querySelector(step.target!); } catch { return null; }
      })();
      if (el) measure();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [placement, centered, step.id, step.target]);

  if (!mounted) return null;

  // Centered mode: step khai báo center (welcome/finish)
  const isCenterMode = centered;

  // Fallback khi chưa đo được rect → đặt ở góc dưới-trái để không che spotlight
  const useCornerFallback = !isCenterMode && !pos;

  if (isCenterMode) {
    return createPortal(
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: TOOLTIP_Z,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
          pointerEvents: 'none',
        }}
      >
        <TooltipCard
          step={step}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          isFirst={isFirst}
          isLast={isLast}
          onPrev={onPrev}
          onNext={onNext}
          onClose={onClose}
          className="w-[min(480px,calc(100vw-2rem))]"
          style={{ pointerEvents: 'auto' }}
        />
      </div>,
      document.body
    );
  }

  if (useCornerFallback) {
    return createPortal(
      <div
        style={{
          position: 'fixed',
          left: 16,
          bottom: 16,
          zIndex: TOOLTIP_Z,
          maxWidth: 380,
          pointerEvents: 'auto',
        }}
      >
        <TooltipCard
          step={step}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          isFirst={isFirst}
          isLast={isLast}
          onPrev={onPrev}
          onNext={onNext}
          onClose={onClose}
        />
      </div>,
      document.body
    );
  }

  if (!pos) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: TOOLTIP_W,
        zIndex: TOOLTIP_Z,
        pointerEvents: 'auto',
      }}
    >
      <TooltipCard
        step={step}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        isFirst={isFirst}
        isLast={isLast}
        onPrev={onPrev}
        onNext={onNext}
        onClose={onClose}
      />
    </div>,
    document.body
  );
}

function TooltipCard({
  step,
  stepIndex,
  totalSteps,
  isFirst,
  isLast,
  onPrev,
  onNext,
  onClose,
  className,
  style,
}: {
  step: GuideStep;
  stepIndex: number;
  totalSteps: number;
  isFirst: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const progressPct = Math.round(((stepIndex + 1) / totalSteps) * 100);
  return (
    <div
      className={
        'rounded-xl border border-slate-200 bg-white shadow-2xl ' +
        (className ?? '')
      }
      style={style}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-2xs font-semibold uppercase tracking-wide text-brand-600">
            Bước {stepIndex + 1} / {totalSteps}
          </div>
          <h3 className="mt-0.5 text-sm font-semibold text-slate-900">
            {step.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Đóng hướng dẫn"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 text-sm leading-relaxed text-slate-600">
        {step.content}
      </div>

      {/* Progress bar */}
      <div className="px-4">
        <div className="h-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          Bỏ qua tour
        </button>
        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              type="button"
              onClick={onPrev}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={12} /> Trước
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-8 items-center gap-1 rounded-md bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700"
          >
            {isLast ? 'Hoàn tất' : 'Tiếp tục'}
            {isLast ? null : <ArrowRight size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}
