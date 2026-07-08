'use client';
import { useState, useCallback } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { usePageFetch } from '@/shared/hooks/usePageFetch';
import { refreshTopbar } from '@/shared/hooks/useTopbar';
import type { ThongBao } from '@/db/schema';

const LOAI_LABEL: Record<string, string> = {
  HoSo: 'Hồ sơ', XetTuyen: 'Xét tuyển', ChiTieu: 'Chỉ tiêu', HeThong: 'Hệ thống',
};

const LOAI_COLOR: Record<string, string> = {
  HoSo: 'bg-blue-100 text-blue-700',
  XetTuyen: 'bg-green-100 text-green-700',
  ChiTieu: 'bg-purple-100 text-purple-700',
  HeThong: 'bg-slate-100 text-slate-700',
};

export default function ThongBaoPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const url = `/api/thong-bao?limit=${pageSize}&offset=${(page - 1) * pageSize}`;
  const { data, loading, refresh: reload } = usePageFetch<{ data: ThongBao[]; unreadCount: number }>(url, {
    fallback: { data: [], unreadCount: 0 },
  });

  const items = data?.data ?? [];
  const total = items.length; // approximate — no total from API yet
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const markAll = useCallback(async () => {
    await fetch('/api/thong-bao/doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    reload();
    refreshTopbar();
  }, [reload]);

  const markOne = useCallback(async (id: number, lienKet?: string | null) => {
    await fetch('/api/thong-bao/doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    });
    reload();
    refreshTopbar();
    if (lienKet) window.location.href = lienKet;
  }, [reload]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-slate-600" />
          <h1 className="text-lg font-semibold text-slate-900">Thông báo</h1>
          {(data?.unreadCount ?? 0) > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
              {data!.unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={markAll}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50"
        >
          <CheckCheck size={14} />
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading && (
          <div className="flex items-center justify-center py-12 text-sm text-slate-400">
            Đang tải...
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Bell size={32} className="mb-2 opacity-30" />
            <span className="text-sm">Không có thông báo nào</span>
          </div>
        )}
        {!loading && items.length > 0 && (
          <div className="divide-y divide-slate-100">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => markOne(item.id, item.lien_ket)}
                className={`w-full text-left px-4 py-3 transition-colors hover:bg-slate-50 ${item.da_doc ? 'opacity-60' : 'bg-blue-50/30'}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 shrink-0 h-2 w-2 rounded-full ${item.da_doc ? 'bg-transparent' : 'bg-blue-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{item.tieu_de}</span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${LOAI_COLOR[item.loai] ?? 'bg-slate-100 text-slate-600'}`}>
                        {LOAI_LABEL[item.loai] ?? item.loai}
                      </span>
                    </div>
                    {item.noi_dung && (
                      <div className="mt-0.5 text-sm text-slate-500">{item.noi_dung}</div>
                    )}
                    <div className="mt-1 text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`h-8 w-8 rounded text-sm ${p === page ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
