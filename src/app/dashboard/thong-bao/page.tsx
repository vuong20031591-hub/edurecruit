'use client';

import { useState, useCallback } from 'react';
import { 
  Bell, CheckCheck, FileText, Trophy, Target, Settings, 
  Eye, ArrowRight, X, Clock, Inbox
} from 'lucide-react';
import { usePageFetch } from '@/shared/hooks/usePageFetch';
import { refreshTopbar } from '@/shared/hooks/useTopbar';
import { PageHeader, Button, Spinner, Modal } from '@/shared/components';
import { cn } from '@/shared/lib/cn';
import type { ThongBao } from '@/db/schema';

const LOAI_LABEL: Record<string, string> = {
  HoSo: 'Hồ sơ',
  XetTuyen: 'Xét tuyển',
  ChiTieu: 'Chỉ tiêu',
  HeThong: 'Hệ thống',
};

const LOAI_COLOR: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  HoSo: { 
    bg: 'bg-blue-50', 
    text: 'text-blue-700', 
    border: 'border-blue-250',
    iconBg: 'bg-blue-500/10 text-blue-600'
  },
  XetTuyen: { 
    bg: 'bg-emerald-50', 
    text: 'text-emerald-700', 
    border: 'border-emerald-250',
    iconBg: 'bg-emerald-500/10 text-emerald-600'
  },
  ChiTieu: { 
    bg: 'bg-purple-50', 
    text: 'text-purple-700', 
    border: 'border-purple-250',
    iconBg: 'bg-purple-500/10 text-purple-600'
  },
  HeThong: { 
    bg: 'bg-slate-50', 
    text: 'text-slate-700', 
    border: 'border-slate-200',
    iconBg: 'bg-slate-500/10 text-slate-600'
  },
};

function getNotificationIcon(loai: string, size = 18) {
  switch (loai) {
    case 'HoSo':
      return <FileText size={size} />;
    case 'XetTuyen':
      return <Trophy size={size} />;
    case 'ChiTieu':
      return <Target size={size} />;
    default:
      return <Settings size={size} />;
  }
}

export default function ThongBaoPage() {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'TatCa' | 'HoSo' | 'XetTuyen' | 'ChiTieu' | 'HeThong'>('TatCa');
  const [selectedThongBao, setSelectedThongBao] = useState<ThongBao | null>(null);
  const pageSize = 20;

  const url = `/api/thong-bao?limit=100&offset=0`; // Fetch more items to filter on client accurately
  const { data, loading, refresh: reload } = usePageFetch<{ data: ThongBao[]; unreadCount: number }>(url, {
    fallback: { data: [], unreadCount: 0 },
  });

  const rawItems = data?.data ?? [];
  const items = rawItems.filter(item => activeTab === 'TatCa' || item.loai === activeTab);
  
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

  const markAll = useCallback(async () => {
    await fetch('/api/thong-bao/doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    reload();
    refreshTopbar();
  }, [reload]);

  const handleViewDetail = useCallback(async (item: ThongBao) => {
    setSelectedThongBao(item);
    if (!item.da_doc) {
      // Đánh dấu đã đọc ngầm trên server
      await fetch('/api/thong-bao/doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [item.id] }),
      });
      // reload dữ liệu ngầm để update UI
      reload();
      refreshTopbar();
    }
  }, [reload]);

  const handleMarkAsRead = useCallback(async (id: number) => {
    await fetch('/api/thong-bao/doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    });
    reload();
    refreshTopbar();
    if (selectedThongBao && selectedThongBao.id === id) {
      setSelectedThongBao(prev => prev ? { ...prev, da_doc: 1 } : null);
    }
  }, [reload, selectedThongBao]);

  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Thông báo hệ thống"
          description="Theo dõi các biến động về hồ sơ đăng ký, kết quả xét tuyển và chỉ tiêu tuyển dụng"
        />
        <Button
          variant="outline"
          size="sm"
          leftIcon={<CheckCheck size={15} />}
          onClick={markAll}
          disabled={loading || (data?.unreadCount ?? 0) === 0}
          className="self-start sm:self-auto"
        >
          Đánh dấu tất cả đã đọc
        </Button>
      </div>

      {/* Tabs Filter */}
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none">
        {(['TatCa', 'HoSo', 'XetTuyen', 'ChiTieu', 'HeThong'] as const).map(tab => {
          const tabCount = tab === 'TatCa' 
            ? rawItems.filter(i => !i.da_doc).length 
            : rawItems.filter(i => i.loai === tab && !i.da_doc).length;

          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1); }}
              className={cn(
                'border-b-2 px-5 py-3 text-sm font-medium transition-all duration-200 -mb-px whitespace-nowrap flex items-center gap-2',
                activeTab === tab
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              )}
            >
              <span>{tab === 'TatCa' ? 'Tất cả' : LOAI_LABEL[tab] ?? tab}</span>
              {tabCount > 0 && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-all',
                  activeTab === tab ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
                )}>
                  {tabCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Danh sách thông báo */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner size={24} />
            <span className="text-sm text-slate-400">Đang tải danh sách thông báo...</span>
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Inbox size={48} className="mb-3 text-slate-300 stroke-[1.5]" />
            <span className="text-sm font-medium">Không có thông báo nào trong mục này</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {paginatedItems.map(item => {
              const meta = LOAI_COLOR[item.loai] ?? LOAI_COLOR.HeThong;
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex flex-col sm:flex-row items-start sm:items-center gap-4 px-5 py-4 transition-all duration-200 hover:bg-slate-50/80',
                    !item.da_doc ? 'bg-blue-50/10' : 'bg-white'
                  )}
                >
                  {/* Indicator & Icon */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={cn(
                      'h-2 w-2 rounded-full shrink-0 transition-all',
                      !item.da_doc ? 'bg-blue-600 shadow-sm' : 'bg-transparent'
                    )} />
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg shadow-sm', meta.iconBg)}>
                      {getNotificationIcon(item.loai, 18)}
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className={cn('text-sm font-semibold truncate', !item.da_doc ? 'text-slate-900' : 'text-slate-600')}>
                        {item.tieu_de}
                      </span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border shrink-0', meta.bg, meta.text, meta.border)}>
                        {LOAI_LABEL[item.loai] ?? item.loai}
                      </span>
                    </div>
                    {item.noi_dung && (
                      <p className="text-sm text-slate-500 leading-relaxed truncate">{item.noi_dung}</p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock size={12} />
                      <span>{new Date(item.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Eye size={13} />}
                      onClick={() => handleViewDetail(item)}
                    >
                      Chi tiết
                    </Button>
                    {item.lien_ket && (
                      <Button
                        variant="primary"
                        size="sm"
                        rightIcon={<ArrowRight size={13} />}
                        onClick={() => {
                          handleMarkAsRead(item.id);
                          window.location.href = item.lien_ket!;
                        }}
                      >
                        Đi đến
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={cn(
                'h-8 w-8 rounded text-sm font-medium transition-all',
                p === page 
                  ? 'bg-brand-500 text-white shadow-sm' 
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Modal Chi tiết thông báo (Premium popup) */}
      <Modal
        open={!!selectedThongBao}
        onClose={() => setSelectedThongBao(null)}
        title="Chi tiết thông báo"
        size="md"
      >
        {selectedThongBao && (() => {
          const meta = LOAI_COLOR[selectedThongBao.loai] ?? LOAI_COLOR.HeThong;
          return (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-3.5">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl shadow-sm shrink-0 text-xl', meta.iconBg)}>
                  {getNotificationIcon(selectedThongBao.loai, 24)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {selectedThongBao.tieu_de}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border shrink-0', meta.bg, meta.text, meta.border)}>
                      {LOAI_LABEL[selectedThongBao.loai] ?? selectedThongBao.loai}
                    </span>
                    <span className="text-slate-300 text-xs">|</span>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock size={12} />
                      <span>{new Date(selectedThongBao.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {selectedThongBao.noi_dung}
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedThongBao(null)}
                >
                  Đóng
                </Button>
                {selectedThongBao.lien_ket && (
                  <Button
                    variant="primary"
                    size="sm"
                    rightIcon={<ArrowRight size={14} />}
                    onClick={() => {
                      window.location.href = selectedThongBao.lien_ket!;
                    }}
                  >
                    Đi đến liên kết
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
