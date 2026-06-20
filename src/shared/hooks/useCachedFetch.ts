'use client';
import { useEffect, useState } from 'react';

/**
 * Generic SWR-lite cache + dedup + broadcast cho client-side fetch.
 *
 * Mục đích: trong Next.js App Router, mỗi page/component gọi fetch() riêng
 * sẽ phát sinh nhiều request trùng nhau — đặc biệt với React Strict Mode
 * (dev) double-effect và khi nhiều component cùng cần 1 resource.
 *
 * Pattern:
 *   - cache: Map<key, {data, ts}> lưu data + timestamp; trả về nếu còn fresh
 *   - inflight: Map<key, Promise> dedup các caller đang chờ cùng 1 request
 *   - broadcast: CustomEvent để nhiều hook subscribe nhận cùng data khi resolve
 *
 * Tham khảo pattern tương tự:
 *   - vercel/swr: https://github.com/vercel/swr (core fetcher + mutate + cache)
 *   - tanstack/query: staleTime + cacheTime + queryKey
 */

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const CACHE_EVENT = 'edurecruit:cache:update';

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function isFresh(key: string, ttlMs: number): boolean {
  const entry = cache.get(key);
  return entry !== undefined && Date.now() - entry.ts < ttlMs;
}

function notify(key: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CACHE_EVENT, { detail: { key, data } }));
}

export function fetchCached<T>(
  key: string,
  url: string,
  options: { ttlMs?: number; force?: boolean; cache?: RequestCache } = {}
): Promise<T> {
  const { ttlMs = 5_000, force = false, cache: reqCache = 'no-store' } = options;

  if (!force && isFresh(key, ttlMs)) {
    return Promise.resolve(cache.get(key)!.data as T);
  }
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    try {
      const res = await fetch(url, { cache: reqCache });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${key}`);
      const data = (await res.json()) as T;
      cache.set(key, { data, ts: Date.now() });
      notify(key, data);
      return data;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export function invalidateCache(key: string): void {
  cache.delete(key);
}

export interface UseCachedFetchOptions {
  /** Polling interval (ms). 0 = no polling. Default 0. */
  intervalMs?: number;
  /** Client cache TTL (ms). Default 5000. */
  ttlMs?: number;
}

export function useCachedFetch<T>(
  key: string,
  url: string,
  options: UseCachedFetchOptions = {}
): { data: T | null; loading: boolean; error: Error | null; refresh: () => Promise<T> } {
  const { intervalMs = 0, ttlMs = 5_000 } = options;

  const cached = cache.get(key);
  const [data, setData] = useState<T | null>((cached?.data as T) ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    function apply(d: unknown) {
      if (cancelled) return;
      setData(d as T);
      setLoading(false);
      setError(null);
    }

    function onNotify(e: Event) {
      const detail = (e as CustomEvent<{ key: string; data: unknown }>).detail;
      if (detail?.key === key) apply(detail.data);
    }
    window.addEventListener(CACHE_EVENT, onNotify);

    // Seed từ cache ngay (Strict Mode mount lần 2 không phải chờ)
    const entry = cache.get(key);
    if (entry) apply(entry.data);

    fetchCached<T>(key, url, { ttlMs })
      .then(apply)
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    if (intervalMs > 0) {
      timer = setInterval(() => {
        fetchCached<T>(key, url, { ttlMs, force: true }).catch(() => {});
      }, intervalMs);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('edurecruit:cache:update', onNotify);
      if (timer) clearInterval(timer);
    };
  }, [key, url, intervalMs, ttlMs]);

  return {
    data,
    loading,
    error,
    refresh: () => fetchCached<T>(key, url, { ttlMs, force: true })
  };
}
