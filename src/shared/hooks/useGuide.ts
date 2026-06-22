'use client';
import { useCallback, useEffect, useState } from 'react';
import type { GuideTour } from '../lib/guide';

const STORAGE_PREFIX = 'edurecruit.guide';
const ONBOARDING_KEY = `${STORAGE_PREFIX}.onboarding`;
const MINI_PREFIX = `${STORAGE_PREFIX}.mini`;

/** Trạng thái tour hiện tại. */
export type GuideStatus = 'idle' | 'running';

interface GuideState {
  status: GuideStatus;
  tour: GuideTour | null;
  /** Index hiện tại trong tour. */
  stepIndex: number;
}

const initialState: GuideState = { status: 'idle', tour: null, stepIndex: 0 };

/**
 * useGuide — hook toàn cục để mở/tắt tour, điều hướng qua các step.
 *
 * - State lưu trong React + persist vào localStorage để lần sau không hiện lại.
 * - Auto-trigger onboarding cho user lần đầu (chưa từng hoàn thành).
 */
export function useGuide() {
  const [state, setState] = useState<GuideState>(initialState);

  // Load auto-trigger state từ localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const onboardingDone = localStorage.getItem(ONBOARDING_KEY) === 'done';
      if (!onboardingDone && !hasSeenWelcomeModal()) {
        // Auto mở tour onboarding lần đầu user truy cập
        setState({ status: 'running', tour: null /* sẽ set ở effect sau */, stepIndex: 0 });
      }
    } catch {
      // ignore
    }
  }, []);

  const startTour = useCallback((tour: GuideTour) => {
    setState({ status: 'running', tour, stepIndex: 0 });
  }, []);

  const closeTour = useCallback((opts?: { completed?: boolean }) => {
    setState((s) => {
      if (s.tour) {
        try {
          if (opts?.completed) {
            localStorage.setItem(`${MINI_PREFIX}.${s.tour.id}`, 'done');
          }
          if (s.tour.id === 'onboarding-9-buoc' && opts?.completed) {
            localStorage.setItem(ONBOARDING_KEY, 'done');
          }
        } catch {
          // ignore
        }
      }
      return initialState;
    });
  }, []);

  const next = useCallback(() => {
    setState((s) => {
      if (!s.tour) return s;
      const last = s.stepIndex >= s.tour.steps.length - 1;
      if (last) {
        // Hoàn tất
        try {
          localStorage.setItem(`${MINI_PREFIX}.${s.tour.id}`, 'done');
          if (s.tour.id === 'onboarding-9-buoc') {
            localStorage.setItem(ONBOARDING_KEY, 'done');
          }
        } catch {
          // ignore
        }
        return initialState;
      }
      return { ...s, stepIndex: s.stepIndex + 1 };
    });
  }, []);

  const prev = useCallback(() => {
    setState((s) => {
      if (!s.tour || s.stepIndex <= 0) return s;
      return { ...s, stepIndex: s.stepIndex - 1 };
    });
  }, []);

  const goTo = useCallback((idx: number) => {
    setState((s) => {
      if (!s.tour) return s;
      const clamped = Math.max(0, Math.min(idx, s.tour.steps.length - 1));
      return { ...s, stepIndex: clamped };
    });
  }, []);

  return {
    state,
    startTour,
    closeTour,
    next,
    prev,
    goTo,
    /** Helper: reset toàn bộ trạng thái đã xem (dùng cho trang Cài đặt nếu cần). */
    resetAll: () => {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith(STORAGE_PREFIX))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        // ignore
      }
    },
  };
}

function hasSeenWelcomeModal(): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}.welcome_seen`) === '1';
  } catch {
    return false;
  }
}
