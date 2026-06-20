'use client';
import { fetchCached, useCachedFetch, invalidateCache } from './useCachedFetch';

export interface LogHeThong {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  resource_type: string | null;
  resource_id: number | null;
  ip_address: string | null;
  user_agent: string | null;
  payload: string | null;
  result: 'SUCCESS' | 'FAILURE';
  error_message: string | null;
  ngay_thuc_hien: string;
}

interface AuditListResponse {
  data: LogHeThong[];
  total: number;
}

const URL = '/api/audit?limit=8';
const KEY = (limit: number) => `audit:list:${limit}`;

export function useActivityLog(limit = 8) {
  return useCachedFetch<AuditListResponse>(KEY(limit), `/api/audit?limit=${limit}`, { ttlMs: 5_000 });
}

export function fetchActivityLog(limit = 8, force = false): Promise<AuditListResponse> {
  return fetchCached<AuditListResponse>(KEY(limit), `/api/audit?limit=${limit}`, { force, ttlMs: 5_000 });
}

export function invalidateActivityLog(limit = 8): void {
  invalidateCache(KEY(limit));
}
