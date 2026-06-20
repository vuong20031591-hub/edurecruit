'use client';
import { fetchCached, useCachedFetch, invalidateCache } from './useCachedFetch';

export interface TopbarKy {
  id: number;
  ten_ky: string;
  nam: number;
  trang_thai: string;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
}

export interface TopbarData {
  ky: TopbarKy | null;
  badgeHoSoChoDuyet: number;
  hoSoHopLe: number;
  hoSoChoDuyet: number;
  thongBao: number;
}

const EMPTY: TopbarData = {
  ky: null,
  badgeHoSoChoDuyet: 0,
  hoSoHopLe: 0,
  hoSoChoDuyet: 0,
  thongBao: 0
};

const KEY = 'dashboard:topbar';
const URL = '/api/dashboard/topbar';

/** Public API: gọi fetch trực tiếp (vd từ vi-tri/page.tsx). Dedup qua inflight. */
export function fetchTopbarData(force = false): Promise<TopbarData> {
  return fetchCached<TopbarData>(KEY, URL, { force, ttlMs: 5_000 });
}

/** Invalidate cache + trigger refresh, dùng sau khi CRUD để cập nhật badge. */
export function refreshTopbar(): Promise<TopbarData> {
  invalidateCache(KEY);
  return fetchTopbarData(true);
}

/** Hook: data luôn là TopbarData (không null), fallback EMPTY khi chưa có. */
export function useTopbar(intervalMs = 30_000) {
  const result = useCachedFetch<TopbarData>(KEY, URL, { intervalMs, ttlMs: 5_000 });
  return { ...result, data: result.data ?? EMPTY };
}
