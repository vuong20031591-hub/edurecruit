'use client';
import { Clock, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActivityLog } from '@/shared/hooks/useActivityLog';

// Map action → màu icon bg theo Figma palette
const ACTION_COLOR: Record<string, { bg: string; dot: string }> = {
  LOGIN_SUCCESS:    { bg: 'bg-blue-100',   dot: 'text-blue-600' },
  LOGIN_FAIL:       { bg: 'bg-red-100',    dot: 'text-red-600' },
  LOGOUT:           { bg: 'bg-slate-100',  dot: 'text-slate-500' },
  IMPORT_EXCEL:     { bg: 'bg-green-100',  dot: 'text-green-600' },
  EXPORT_EXCEL:     { bg: 'bg-green-100',  dot: 'text-green-600' },
  EXPORT_WORD:      { bg: 'bg-green-100',  dot: 'text-green-600' },
  EXPORT_PDF:       { bg: 'bg-green-100',  dot: 'text-green-600' },
  CREATE_THISINH:   { bg: 'bg-green-100',  dot: 'text-green-600' },
  UPDATE_THISINH:   { bg: 'bg-blue-100',   dot: 'text-blue-600' },
  DELETE_THISINH:   { bg: 'bg-red-100',    dot: 'text-red-600' },
  RA_SOAT_HOSO:     { bg: 'bg-green-100',  dot: 'text-green-600' },
  NHAP_DIEM:        { bg: 'bg-blue-100',   dot: 'text-blue-600' },
  KHOA_DIEM:        { bg: 'bg-amber-100',  dot: 'text-amber-600' },
  XEP_PHONG:        { bg: 'bg-blue-100',   dot: 'text-blue-600' },
  XETTUYEN_CHAY:    { bg: 'bg-purple-100', dot: 'text-purple-600' },
  BACKUP_CREATE:    { bg: 'bg-teal-100',   dot: 'text-teal-600' },
  BACKUP_RESTORE:   { bg: 'bg-amber-100',  dot: 'text-amber-600' },
  USER_CREATE:      { bg: 'bg-green-100',  dot: 'text-green-600' },
  CONFIG_UPDATE:    { bg: 'bg-slate-100',  dot: 'text-slate-600' },
};

const ACTION_LABEL: Record<string, string> = {
  LOGIN_SUCCESS:    'đã đăng nhập hệ thống',
  LOGIN_FAIL:       'đăng nhập thất bại',
  LOGOUT:           'đã đăng xuất',
  IMPORT_EXCEL:     'đã import hồ sơ từ Excel',
  EXPORT_EXCEL:     'đã xuất Excel',
  EXPORT_WORD:      'đã xuất Word',
  EXPORT_PDF:       'đã xuất PDF',
  CREATE_THISINH:   'đã thêm hồ sơ mới',
  UPDATE_THISINH:   'đã cập nhật hồ sơ',
  DELETE_THISINH:   'đã xóa hồ sơ',
  RA_SOAT_HOSO:     'đã rà soát hồ sơ',
  NHAP_DIEM:        'đã nhập điểm',
  KHOA_DIEM:        'đã khóa điểm',
  XEP_PHONG:        'đã xếp phòng thi',
  XETTUYEN_CHAY:    'đã chạy xét tuyển',
  XETTUYEN_TINH:    'đã tính điểm xét tuyển',
  BACKUP_CREATE:    'đã tạo bản sao lưu',
  BACKUP_RESTORE:   'đã khôi phục từ backup',
  USER_CREATE:      'đã tạo tài khoản mới',
  USER_UPDATE:      'đã cập nhật tài khoản',
  USER_DELETE:      'đã xóa tài khoản',
  CONFIG_UPDATE:    'đã cập nhật cài đặt',
  CREATE_VITRI:     'đã thêm vị trí tuyển dụng',
  UPDATE_VITRI:     'đã cập nhật vị trí',
  DELETE_VITRI:     'đã xóa vị trí',
  MAP_DONVI_VITRI:  'đã gán đơn vị cho vị trí',
  CREATE_DONVI:     'đã thêm đơn vị',
  UPDATE_DONVI:     'đã cập nhật đơn vị',
  DELETE_DONVI:     'đã xóa đơn vị',
};

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff} giây trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

function getColor(action: string) {
  return ACTION_COLOR[action] ?? { bg: 'bg-slate-100', dot: 'text-slate-500' };
}

function getInitials(username: string | null): string {
  if (!username) return '?';
  return username.slice(0, 2).toUpperCase();
}

export function ActivityCard() {
  const router = useRouter();
  const { data, loading } = useActivityLog(8);
  const logs = data?.data ?? [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="flex items-center gap-2 text-[18px] font-semibold text-navy-800">
          <Clock size={16} className="text-slate-500" />
          Lịch sử hoạt động gần đây
        </h2>
        <button
          type="button"
          onClick={() => router.push('/dashboard/audit')}
          className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
        >
          Xem tất cả
          <ExternalLink size={12} />
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="space-y-0 divide-y divide-slate-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
              <div className="h-7 w-7 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-slate-200" />
                <div className="h-2.5 w-1/4 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400">
          Chưa có hoạt động nào được ghi lại
        </div>
      ) : (
        <ul className="divide-y divide-slate-50">
          {logs.map((log) => {
            const color = getColor(log.action);
            const label = ACTION_LABEL[log.action] ?? log.action;
            return (
              <li key={log.id} className="flex items-center gap-3 px-5 py-3">
                {/* Avatar tròn với initials */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${color.bg} ${color.dot}`}
                  aria-hidden
                >
                  {getInitials(log.username)}
                </div>

                {/* Text */}
                <p className="flex-1 text-[13px] text-slate-700">
                  <span className="font-semibold">{log.username ?? 'Hệ thống'}</span>{' '}
                  <span>{label}</span>
                  {log.resource_id && (
                    <span className="ml-1 text-slate-400">#{log.resource_id}</span>
                  )}
                </p>

                {/* Thời gian */}
                <div className="flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
                  <Clock size={11} />
                  {timeAgo(log.ngay_thuc_hien)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
