'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SpotlightProps {
  target: string | undefined;
}

const SPOTLIGHT_Z = 2147482000;

/**
 * Spotlight — overlay đen với 1 "lỗ hổng" hình chữ nhật làm nổi target.
 * Nếu target không tìm thấy → fallback che toàn màn hình.
 * Render qua Portal để tránh stacking context từ parent.
 */
export function Spotlight({ target }: SpotlightProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!target) {
      setTargetRect(null);
      return;
    }

    let cancelled = false;

    const findEl = (): HTMLElement | null => {
      try {
        return document.querySelector<HTMLElement>(target);
      } catch {
        return null;
      }
    };

    const measure = (el: HTMLElement) => {
      if (cancelled) return;
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight || r.left < 0 || r.right > window.innerWidth) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      requestAnimationFrame(() => {
        if (cancelled) return;
        const r2 = el.getBoundingClientRect();
        if (!isFinite(r2.top) || !isFinite(r2.left) || r2.width === 0 || r2.height === 0) {
          return;
        }
        setTargetRect({
          top: r2.top,
          left: r2.left,
          width: r2.width,
          height: r2.height,
        });
      });
    };

    const tryUpdate = (attempts = 0) => {
      if (cancelled) return;
      const el = findEl();
      if (el) {
        measure(el);
        return;
      }
      if (attempts < 8) {
        setTimeout(() => tryUpdate(attempts + 1), 150);
      } else {
        setTargetRect(null);
      }
    };

    tryUpdate();

    const mo = new MutationObserver(() => {
      const el = findEl();
      if (el) measure(el);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('resize', () => tryUpdate());
    window.addEventListener('scroll', () => tryUpdate(), true);
    return () => {
      cancelled = true;
      mo.disconnect();
      window.removeEventListener('resize', () => tryUpdate());
      window.removeEventListener('scroll', () => tryUpdate(), true);
    };
  }, [target]);

  if (!mounted) return null;

  const fullscreen = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: SPOTLIGHT_Z,
        background: 'rgba(15, 23, 42, 0.7)',
        pointerEvents: 'none',
      }}
      aria-hidden
    />
  );

  if (!target || !targetRect) {
    return createPortal(fullscreen, document.body);
  }

  const PAD = 8;
  const top = Math.max(0, targetRect.top - PAD);
  const left = Math.max(0, targetRect.left - PAD);
  const width = targetRect.width + PAD * 2;
  const height = targetRect.height + PAD * 2;

  if (!isFinite(top) || !isFinite(left) || !isFinite(width) || !isFinite(height)) {
    return createPortal(fullscreen, document.body);
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: SPOTLIGHT_Z,
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.7)' }} />
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="guide-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={left}
              y={top}
              width={width}
              height={height}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.7)"
          mask="url(#guide-spotlight-mask)"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top,
          left,
          width,
          height,
          borderRadius: 8,
          boxShadow: '0 0 0 2px #1e6dff, 0 0 0 6px rgba(15, 23, 42, 0.7)',
        }}
      />
    </div>,
    document.body
  );
}
