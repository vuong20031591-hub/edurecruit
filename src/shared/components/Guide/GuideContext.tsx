'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { GuideTour } from '../../lib/guide';

export interface GuideContextValue {
  /** Mở 1 tour cụ thể. */
  // eslint-disable-next-line no-unused-vars
  startTour: (tour: GuideTour) => void;
  /** Đóng tour hiện tại. */
  closeTour: () => void;
  /** Có đang chạy tour không. */
  isRunning: boolean;
  /** Tour hiện tại (null nếu đang idle). */
  currentTour: GuideTour | null;
  /** Index step hiện tại. */
  stepIndex: number;
  next: () => void;
  prev: () => void;
}

const GuideContext = createContext<GuideContextValue | null>(null);

export function GuideProvider({
  value,
  children,
}: {
  value: GuideContextValue;
  children: ReactNode;
}) {
  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}

export function useGuideContext(): GuideContextValue {
  const ctx = useContext(GuideContext);
  if (!ctx) {
    throw new Error('useGuideContext must be used within <GuideProvider>');
  }
  return ctx;
}
