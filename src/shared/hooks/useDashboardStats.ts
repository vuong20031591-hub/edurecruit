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

const BASE_URL = '/api/dashboard/stats';

const EMPTY: DashboardStatsData = {
  ky: null,
  stats: { tongSoHoSo: 0, hopLe: 0, canBoSung: 0, khongDuDieuKien: 0, soPhong: 0, tongChoNgoi: 0 },
  progressChart: [],
  positionBar: []
};

function cacheKey(kyId?: number) {
  return kyId ? `dashboard:stats:${kyId}` : 'dashboard:stats';
}

function apiUrl(kyId?: number) {
  return kyId ? `${BASE_URL}?ky_id=${kyId}` : BASE_URL;
}

export function fetchDashboardStats(force = false, kyId?: number): Promise<DashboardStatsData> {
  return fetchCached<DashboardStatsData>(cacheKey(kyId), apiUrl(kyId), { force, ttlMs: 5_000 });
}

export function refreshDashboardStats(kyId?: number): Promise<DashboardStatsData> {
  invalidateCache(cacheKey(kyId));
  return fetchDashboardStats(true, kyId);
}

export function useDashboardStats(kyId?: number) {
  const result = useCachedFetch<DashboardStatsData>(cacheKey(kyId), apiUrl(kyId), { ttlMs: 5_000 });
  return { ...result, data: result.data ?? EMPTY };
}
