'use client';
import { useEffect } from 'react';
import { useGuide } from '../../hooks/useGuide';
import { ONBOARDING_TOUR } from '../../lib/guide';
import { GuideProvider } from './GuideContext';
import { GuideTour } from './GuideTour';

const ONBOARDING_KEY = 'edurecruit.guide.onboarding';
const WELCOME_KEY = 'edurecruit.guide.welcome_seen';

/**
 * GuideRoot — client wrapper: cung cấp context + auto-trigger onboarding.
 * Đặt 1 lần trong dashboard layout.
 */
export function GuideRoot({ children }: { children: React.ReactNode }) {
  const guide = useGuide();

  // Auto mở tour onboarding cho user lần đầu
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const onboardingDone = localStorage.getItem(ONBOARDING_KEY) === 'done';
      const welcomeSeen = localStorage.getItem(WELCOME_KEY) === '1';
      if (onboardingDone || welcomeSeen) return;

      // Đánh dấu đã thấy welcome modal (kể cả khi user bỏ qua)
      localStorage.setItem(WELCOME_KEY, '1');

      // Delay 600ms để dashboard render xong rồi mới mở tour
      const t = setTimeout(() => {
        guide.startTour(ONBOARDING_TOUR);
      }, 600);
      return () => clearTimeout(t);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GuideProvider
      value={{
        isRunning: guide.state.status === 'running',
        currentTour: guide.state.tour,
        stepIndex: guide.state.stepIndex,
        startTour: guide.startTour,
        closeTour: () => guide.closeTour({ completed: false }),
        next: guide.next,
        prev: guide.prev,
      }}
    >
      {children}
      <GuideTour />
    </GuideProvider>
  );
}
