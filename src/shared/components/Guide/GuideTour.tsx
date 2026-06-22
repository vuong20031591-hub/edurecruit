'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { useGuideContext } from './GuideContext';
import { Spotlight } from './Spotlight';
import { Tooltip } from './Tooltip';

const WAITING_Z = 2147481000;
const PAGE_RENDER_DELAY = 800; // ms — chờ page render xong sau khi navigate

/**
 * GuideTour — overlay toàn cục hiển thị spotlight + tooltip.
 * Tự navigate đến route của step trước khi highlight.
 */
export function GuideTour() {
  const { isRunning, currentTour, stepIndex, next, prev, closeTour } =
    useGuideContext();
  const router = useRouter();
  const pathname = usePathname();
  const [waitingForRoute, setWaitingForRoute] = useState(false);
  const [pageReady, setPageReady] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const step = currentTour?.steps[stepIndex];
  const centered = step?.center === true;

  // Điều hướng + chờ page render
  useEffect(() => {
    if (!isRunning || !step) return;
    if (step.route && step.route !== pathname) {
      setWaitingForRoute(true);
      setPageReady(false);
      router.push(step.route);
    } else {
      setWaitingForRoute(false);
    }
  }, [isRunning, step, pathname, router]);

  // Khi pathname thay đổi (sau navigate) → chờ page render
  useEffect(() => {
    if (!isRunning) return;
    const target = step?.target;
    setPageReady(false);

    // Nếu không có target (centered step) → không cần chờ
    if (!target) {
      setPageReady(true);
      return;
    }

    // Nếu element đã có sẵn trong DOM → ready ngay
    const checkEl = () => {
      try {
        const el = document.querySelector(target);
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            setPageReady(true);
            return true;
          }
        }
      } catch {
        // ignore
      }
      return false;
    };

    if (checkEl()) return;

    // Watch DOM để set ready ngay khi element xuất hiện + có size
    const mo = new MutationObserver(() => {
      if (checkEl()) mo.disconnect();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Fallback timeout
    const t = setTimeout(() => {
      setPageReady(true);
      mo.disconnect();
    }, PAGE_RENDER_DELAY);

    return () => {
      clearTimeout(t);
      mo.disconnect();
    };
  }, [pathname, isRunning, step]);

  useEffect(() => {
    if (!isRunning) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTour();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isRunning, next, prev, closeTour]);

  useEffect(() => {
    if (!isRunning) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isRunning]);

  if (!isRunning || !currentTour || !step || !mounted) return null;

  if (waitingForRoute || !pageReady) {
    return createPortal(
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: WAITING_Z,
          background: 'rgba(15, 23, 42, 0.4)',
          pointerEvents: 'none',
        }}
        aria-hidden
      />,
      document.body
    );
  }

  return (
    <>
      <Spotlight target={centered ? undefined : step.target} />
      <Tooltip
        step={step}
        stepIndex={stepIndex}
        totalSteps={currentTour.steps.length}
        centered={centered}
        onPrev={prev}
        onNext={next}
        onClose={closeTour}
      />
    </>
  );
}
