'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import {
  LayoutDashboard, FileText, Calendar, ClipboardCheck,
  BarChart3, Settings, GraduationCap, ChevronLeft, ChevronRight, Menu, X, Building2, Target, Trophy
} from 'lucide-react';
import { useTopbar } from '@/shared/hooks/useTopbar';
import type { Quyen } from '@/db/schema';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badgeKey?: 'hoSoChoDuyet';
  exact?: boolean;
  /** Nếu định nghĩa: chỉ hiển thị với role có trong danh sách */
  visibleFor?: Quyen[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',           label: 'Tổng quan',              icon: LayoutDashboard, exact: true },
  { href: '/dashboard/ho-so',     label: 'Quản lý Hồ sơ',         icon: FileText,        badgeKey: 'hoSoChoDuyet' },
  { href: '/dashboard/vi-tri',    label: 'Vị trí tuyển dụng',      icon: GraduationCap,   visibleFor: ['ADMIN', 'TO_NHAP_HOSO'] },
  { href: '/dashboard/don-vi',    label: 'Đơn vị tuyển dụng',      icon: Building2,       visibleFor: ['ADMIN', 'TO_NHAP_HOSO'] },
  { href: '/dashboard/chi-tieu/import', label: 'Import chỉ tiêu', icon: Target,           visibleFor: ['ADMIN'] },
  // Xếp phòng thi: chỉ TO_NHAP_HOSO + ADMIN (phongthi.xepphong)
  { href: '/dashboard/phong-thi', label: 'Xếp phòng thi',          icon: Calendar,        visibleFor: ['ADMIN', 'TO_NHAP_HOSO'] },
  // Nhập điểm: TO_NHAP_DIEM + ADMIN (diemthi.nhap); LANH_DAO chỉ khóa điểm nên vẫn cần xem
  { href: '/dashboard/nhap-diem', label: 'Nhập điểm & Xét duyệt',  icon: ClipboardCheck,  visibleFor: ['ADMIN', 'TO_NHAP_DIEM', 'LANH_DAO'] },
  { href: '/dashboard/xet-tuyen', label: 'Xét tuyển',              icon: Trophy,          visibleFor: ['ADMIN', 'LANH_DAO'] },
  { href: '/dashboard/bao-cao',   label: 'Báo cáo',                icon: BarChart3 },
  // Cài đặt: chỉ ADMIN
  { href: '/dashboard/cai-dat',   label: 'Cài đặt',                icon: Settings,        visibleFor: ['ADMIN'] }
];

interface SidebarProps {
  quyen?: Quyen;
}

export function Sidebar({ quyen }: SidebarProps) {
  const pathname = usePathname();
  const { data } = useTopbar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const getBadge = (key?: NavItem['badgeKey']): number | null => {
    if (!key) return null;
    if (key === 'hoSoChoDuyet') return data.badgeHoSoChoDuyet;
    return null;
  };

  // Lọc menu theo role
  const visibleItems = NAV_ITEMS.filter(item =>
    !item.visibleFor || !quyen || item.visibleFor.includes(quyen)
  );

  const navContent = (
    <>
      {/* Logo */}
      <div className={cn("flex h-16 items-center gap-3 border-b border-white/5", collapsed ? "px-3 justify-center" : "px-5")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/5 overflow-hidden">
          <img src="/logo.png" alt="Logo" className="h-full w-full object-cover" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-semibold leading-tight text-white">Tuyển Dụng</div>
            <div className="text-xs leading-tight text-slate-400">Giáo Dục</div>
          </div>
        )}
        {/* Close button — mobile only */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 md:hidden"
          aria-label="Đóng menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
        <ul className="space-y-0.5">
          {visibleItems.map(item => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/');
            const badge = getBadge(item.badgeKey);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center rounded-md text-sm transition-all duration-200',
                    collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2.5',
                    active
                      ? 'bg-brand-500 font-semibold text-white shadow-sm'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <item.icon size={16} className={active ? 'text-white' : 'text-slate-400'} />
                  {!collapsed && <span className="flex-1">{item.label}</span>}
                  {badge !== null && badge > 0 && (
                    <span className={cn(
                      'flex items-center justify-center rounded-full bg-amber-500 font-semibold text-white',
                      collapsed ? 'absolute top-1 right-1 h-2 w-2 min-w-0 p-0 text-[0px]' : 'h-5 min-w-[20px] px-1.5 text-2xs'
                    )}>
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom card: Kỳ thi sắp diễn ra */}
      {!collapsed && <UpcomingExamCard ky={data.ky} />}

      {/* Thu gọn toggle — desktop only */}
      <div className="hidden border-t border-white/5 p-3 md:block">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex w-full items-center rounded-md px-2 py-1.5 text-xs text-slate-400 transition-colors hover:bg-white/5 hover:text-white",
            collapsed ? "justify-center" : "gap-1.5"
          )}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          {!collapsed && <span>Thu gọn</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside data-guide="sidebar" className={cn(
        "no-print hidden shrink-0 flex-col border-r border-white/5 bg-slate-900 text-slate-200 md:flex transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}>
        {navContent}
      </aside>

      {/* Mobile: hamburger button (shown in TopBar via portal — handled here via fixed btn) */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Mở menu"
        className="no-print fixed left-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-white shadow-md md:hidden"
      >
        <Menu size={18} />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="no-print fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-slate-200 md:hidden">
            {navContent}
          </aside>
        </>
      )}
    </>
  );
}

function UpcomingExamCard({ ky }: { ky: { ngay_bat_dau: string; ngay_ket_thuc: string } | null }) {
  if (!ky) {
    return (
      <div className="border-t border-white/5 p-3">
        <div className="rounded-md bg-white/5 p-3 text-center text-xs text-slate-400">
          Chưa có kỳ tuyển dụng
        </div>
      </div>
    );
  }

  // Tính % chuẩn bị dựa trên (now - start) / (end - start)
  const start = new Date(ky.ngay_bat_dau).getTime();
  const end = new Date(ky.ngay_ket_thuc).getTime();
  const now = Date.now();
  const pct = end > start ? Math.min(100, Math.max(0, Math.round((now - start) / (end - start) * 100))) : 0;
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));

  return (
    <div className="border-t border-white/5 p-3">
      <div className="rounded-md bg-white/5 p-3">
        <div className="text-xs font-medium text-slate-300">Kỳ thi sắp diễn ra</div>
        <div className="mt-1 text-base font-semibold text-white">
          {formatDateShort(ky.ngay_bat_dau)} – {formatDateShort(ky.ngay_ket_thuc)}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1.5 text-2xs text-slate-400">
          Còn {daysLeft} ngày · {pct}% chuẩn bị
        </div>
      </div>
    </div>
  );
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
