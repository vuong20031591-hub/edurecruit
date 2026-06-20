'use client';
import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * usePageFetch: hook fetch có race-condition guard dùng AbortController.
 *
 * Vấn đề giải quyết:
 *   - Trong React 19 Strict Mode (dev), mỗi useEffect chạy 2 lần (mount → unmount
 *     → mount), và khi user gõ search/filter, deps đổi liên tục → request cũ có
 *     thể resolve SAU request mới → setState cũ → UI stale.
 *   - Hook này dùng AbortController để hủy request cũ + cancelled flag để bỏ
 *     qua result đến trễ.
 *
 * Khác với useCachedFetch (dùng cho data share như topbar/stats có TTL cache),
 * usePageFetch dùng cho data per-page có filter/search — URL là identity.
 *
 * @param url URL đầy đủ (kèm query string). Truyền `null` để skip fetch (vd
 *           khi chưa có kyId).
 * @param options.fallback Giá trị mặc định khi url=null hoặc trước khi load xong.
 * @param options.transform Optional: biến đổi response trước khi setData.
 */
export interface UsePageFetchResult<T> {
  data: T;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<T | null>;
}

export function usePageFetch<T>(
  url: string | null,
  options: { fallback: T; transform?: (raw: unknown) => T }
): UsePageFetchResult<T> {
  const { fallback, transform } = options;

  // Lưu fallback vào ref để KHÔNG đưa vào deps của useCallback — nếu không,
  // mỗi render consumer truyền object literal `{ data: [] }` sẽ tạo reference
  // mới → callback đổi → useEffect re-run → fetch → setLoading → re-render
  // → vòng lặp vô hạn. Đây là pattern React quan trọng.
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  const transformRef = useRef(transform);
  transformRef.current = transform;

  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(url !== null);
  const [error, setError] = useState<Error | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(async (): Promise<T | null> => {
    if (!url) {
      setData(fallbackRef.current);
      setLoading(false);
      return null;
    }
    // Hủy request cũ (nếu còn) trước khi tạo cái mới
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || `HTTP ${res.status}`);
      }
      const raw = await res.json();
      const next = transformRef.current ? transformRef.current(raw) : (raw as T);
      // Bỏ qua nếu request đã bị abort bởi caller mới
      if (controller.signal.aborted) return null;
      setData(next);
      setLoading(false);
      return next;
    } catch (err) {
      if (controller.signal.aborted) return null;
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setLoading(false);
      return null;
    }
  }, [url]); // ← CHỈ url trong deps; fallback/transform truy cập qua ref

  // Sync data về fallback khi url chuyển từ non-null sang null
  useEffect(() => {
    if (!url) setData(fallbackRef.current);
  }, [url]);

  useEffect(() => {
    run();
    return () => {
      controllerRef.current?.abort();
    };
  }, [run]);

  return { data, loading, error, refresh: run };
}
