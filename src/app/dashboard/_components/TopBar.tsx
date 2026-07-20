'use client';
import { 
  Bell, ChevronDown, Search, CheckCheck, FileText, Trophy, 
  Target, Settings, Clock 
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { initials } from '@/shared/lib/format';
import { QuyenLabel } from '@/shared/constants/enums';
import type { Quyen, ThongBao } from '@/db/schema';
import { useTopbar, refreshTopbar } from '@/shared/hooks/useTopbar';
import { GuideLauncher } from '@/shared/components/Guide';

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
    border: 'border-blue-200',
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

function getNotificationIcon(loai: string, size = 14) {
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

function BellDropdown({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<ThongBao[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/thong-bao?limit=10')
      .then(r => r.json())
      .then(d => setItems(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  async function markAll() {
    await fetch('/api/thong-bao/doc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) });
    setItems(prev => prev.map(i => ({ ...i, da_doc: 1 })));
    refreshTopbar();
  }

  async function markOne(id: number, lienKet?: string | null) {
    await fetch('/api/thong-bao/doc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) });
    setItems(prev => prev.map(i => i.id === id ? { ...i, da_doc: 1 } : i));
    refreshTopbar();
    if (lienKet) window.location.href = lienKet;
  }

  return (
    <div ref={ref} className="absolute right-0 top-12 z-20 w-[380px] rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-3 duration-200 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50">
        <span className="text-sm font-semibold text-slate-800">Thông báo mới</span>
        <button onClick={markAll} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
          <CheckCheck size={14} /> Đọc tất cả
        </button>
      </div>
      <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
        {loading && <div className="px-4 py-8 text-sm text-slate-400 text-center">Đang tải thông báo...</div>}
        {!loading && items.length === 0 && <div className="px-4 py-8 text-sm text-slate-400 text-center">Không có thông báo mới</div>}
        {items.map(item => {
          const meta = LOAI_COLOR[item.loai] ?? LOAI_COLOR.HeThong;
          return (
            <button
              key={item.id}
              onClick={() => markOne(item.id, item.lien_ket)}
              className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex gap-3 items-start ${!item.da_doc ? 'bg-blue-50/10' : ''}`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-sm shrink-0 mt-0.5 ${meta.iconBg}`}>
                {getNotificationIcon(item.loai, 15)}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className={`text-xs font-semibold text-slate-900 truncate ${!item.da_doc ? 'font-bold text-slate-950' : 'font-medium text-slate-600'}`}>
                  {item.tieu_de}
                </div>
                {item.noi_dung && <div className="text-xs text-slate-500 truncate">{item.noi_dung}</div>}
                <div className="flex items-center gap-2 mt-1">
                  <span className={`rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wider border ${meta.bg} ${meta.text} ${meta.border}`}>
                    {LOAI_LABEL[item.loai] ?? item.loai}
                  </span>
                  <span className="text-slate-300 text-[10px]">|</span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock size={10} />
                    <span>{new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              </div>
              {!item.da_doc && (
                <span className="h-2 w-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
      <div className="border-t border-slate-100 p-2 bg-slate-50/30">
        <a href="/dashboard/thong-bao" className="block text-center text-xs font-semibold text-brand-600 hover:text-brand-700 py-1.5 hover:bg-brand-50/50 rounded-lg transition-all" onClick={onClose}>
          Xem tất cả thông báo
        </a>
      </div>
    </div>
  );
}

interface TopBarProps {
  session: { ho_ten: string; quyen: Quyen; username: string };
}

export function TopBar({ session }: TopBarProps) {
  const { data } = useTopbar();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBell, setShowBell] = useState(false);

  return (
    <header className="no-print flex h-13 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 md:px-5 pl-14 md:pl-5">
      {/* Status pill: tên kỳ hiện tại */}
      <div className="flex items-center gap-2 min-w-0">
        <span className={`h-2 w-2 shrink-0 rounded-full ${data.ky?.trang_thai === 'DangTuyen' ? 'bg-status-success' : 'bg-slate-400'}`} />
        <span className="max-w-[140px] truncate text-sm font-medium text-slate-700 md:max-w-[180px]">
          {data.ky?.ten_ky ?? 'Chưa có kỳ'}
        </span>
      </div>

      {/* Divider — hidden on mobile */}
      <div className="hidden h-6 w-px bg-slate-200 md:block" />

      {/* Search — hidden on mobile */}
      <button
        type="button"
        className="hidden max-w-md flex-1 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 md:flex"
      >
        <Search size={14} />
        <span>Tìm kiếm toàn hệ thống</span>
      </button>

      <div className="flex-1" />

      {/* Stats — hidden on mobile */}
      <div className="hidden items-center gap-4 md:flex">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-status-success" />
          <span className="text-sm text-slate-600">
            {data.hoSoHopLe.toLocaleString('vi-VN')} hồ sơ hợp lệ
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-status-warning" />
          <span className="text-sm text-slate-600">
            {data.hoSoChoDuyet.toLocaleString('vi-VN')} chờ duyệt
          </span>
        </div>
      </div>

      {/* Bell with badge + dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowBell(b => !b)}
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Thông báo"
        >
          <Bell size={16} />
          {data.thongBao > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-status-danger px-1 text-2xs font-semibold text-white">
              {data.thongBao > 99 ? '99+' : data.thongBao}
            </span>
          )}
        </button>
        {showBell && <BellDropdown onClose={() => setShowBell(false)} />}
      </div>

      {/* Guide launcher */}
      <GuideLauncher />

      {/* User avatar + name */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-slate-50"
        >
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            <img
              src={`/avatars/${session.quyen.toLowerCase()}.png`}
              alt={session.ho_ten}
              className="h-full w-full object-cover"
            />
          </div>
          {/* Name hidden on small screens */}
          <div className="hidden text-left md:block">
            <div className="text-sm font-medium text-slate-900">{session.ho_ten}</div>
            <div className="text-2xs text-slate-500">{QuyenLabel[session.quyen]}</div>
          </div>
          <ChevronDown size={14} className="hidden text-slate-400 md:block" />
        </button>

        {showUserMenu && (
          <div className="absolute right-0 top-12 z-10 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
            <div className="border-b border-slate-100 px-3 py-2">
              <div className="text-sm font-medium text-slate-900">{session.ho_ten}</div>
              <div className="text-xs text-slate-500">@{session.username}</div>
            </div>
            <a href="/dashboard/cai-dat" className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Cài đặt tài khoản
            </a>
            <a href="/dashboard/audit" className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Lịch sử hoạt động
            </a>
            <div className="border-t border-slate-100">
              <button
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  window.location.href = '/login';
                }}
                className="block w-full px-3 py-2 text-left text-sm text-status-danger hover:bg-red-50"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
