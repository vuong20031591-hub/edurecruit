'use client';
import { fetchCached, useCachedFetch, invalidateCache } from './useCachedFetch';

export interface DashboardKy {
  id: number;
  ten_ky: string;
  nam: number;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
}

export interface DashboardStatsData {
  ky: DashboardKy | null;
  stats: {
    tongSoHoSo: number;
    hopLe: number;
    canBoSung: number;
    khongDuDieuKien: number;
    soPhong: number;
    tongChoNgoi: number;
  };
  progressChart: { label: string; tong: number; hopLe: number }[];
  positionBar: { name: string; value: number; full: string }[];
}

const KEY = 'dashboard:stats';
const URL = '/api/dashboard/stats';

const EMPTY: DashboardStatsData = {
  ky: null,
  stats: { tongSoHoSo: 0, hopLe: 0, canBoSung: 0, khongDuDieuKien: 0, soPhong: 0, tongChoNgoi: 0 },
  progressChart: [],
  positionBar: []
};

export function fetchDashboardStats(force = false): Promise<DashboardStatsData> {
  return fetchCached<DashboardStatsData>(KEY, URL, { force, ttlMs: 5_000 });
}

export function refreshDashboardStats(): Promise<DashboardStatsData> {
  invalidateCache(KEY);
  return fetchDashboardStats(true);
}

export function useDashboardStats() {
  const result = useCachedFetch<DashboardStatsData>(KEY, URL, { ttlMs: 5_000 });
  return { ...result, data: result.data ?? EMPTY };
}
