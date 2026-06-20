'use client';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Filter, X } from 'lucide-react';
import { PageHeader, Badge, Spinner, EmptyState, Button } from '@/shared/components';
import { Table, THead, TBody, TR, TH, TD } from '@/shared/components';
import { useTopbar } from '@/shared/hooks/useTopbar';
import { usePageFetch } from '@/shared/hooks/usePageFetch';
import type { LogHeThong } from '@/db/schema';

const PAGE_SIZE = 20;

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả thao tác' },
  { value: 'LOGIN_SUCCESS', label: 'Đăng nhập' },
  { value: 'LOGIN_FAIL', label: 'Đăng nhập thất bại' },
  { value: 'LOGOUT', label: 'Đăng xuất' },
  { value: 'CREATE_THISINH', label: 'Thêm hồ sơ' },
  { value: 'UPDATE_THISINH', label: 'Cập nhật hồ sơ' },
  { value: 'DELETE_THISINH', label: 'Xóa hồ sơ' },
  { value: 'RA_SOAT_HOSO', label: 'Rà soát hồ sơ' },
  { value: 'IMPORT_EXCEL', label: 'Import Excel' },
  { value: 'EXPORT_EXCEL', label: 'Xuất Excel' },
  { value: 'NHAP_DIEM', label: 'Nhập điểm' },
  { value: 'KHOA_DIEM', label: 'Khóa điểm' },
  { value: 'XEP_PHONG', label: 'Xếp phòng thi' },
  { value: 'XETTUYEN_CHAY', label: 'Chạy xét tuyển' },
  { value: 'BACKUP_CREATE', label: 'Tạo backup' },
  { value: 'BACKUP_RESTORE', label: 'Khôi phục backup' },
  { value: 'USER_CREATE', label: 'Tạo tài khoản' },
  { value: 'CONFIG_UPDATE', label: 'Cập nhật cài đặt' },
];

const ACTION_BADGE_COLOR: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'neutral' | 'primary'> = {
  NHAP_DIEM: 'info',
  KHOA_DIEM: 'warning',
  XEP_PHONG: 'info',
  LOGIN_SUCCESS: 'neutral',
  LOGIN_FAIL: 'danger',
  LOGOUT: 'neutral',
  IMPORT_EXCEL: 'success',
  EXPORT_EXCEL: 'success',
  EXPORT_WORD: 'success',
  EXPORT_PDF: 'success',
  CREATE_THISINH: 'success',
  UPDATE_THISINH: 'info',
  DELETE_THISINH: 'danger',
  RA_SOAT_HOSO: 'success',
  XETTUYEN_CHAY: 'primary',
  BACKUP_CREATE: 'info',
  BACKUP_RESTORE: 'warning',
  USER_CREATE: 'success',
  USER_UPDATE: 'info',
  USER_DELETE: 'danger',
  CONFIG_UPDATE: 'neutral',
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AuditPage() {
  useTopbar();

  const [page, setPage] = useState(1);

  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [appliedAction, setAppliedAction] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');

  const listUrl = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set('limit', String(PAGE_SIZE));
    sp.set('offset', String((page - 1) * PAGE_SIZE));
    if (appliedAction) sp.set('action', appliedAction);
    if (appliedFrom) sp.set('from', appliedFrom);
    if (appliedTo) sp.set('to', appliedTo);
    return `/api/audit?${sp.toString()}`;
  }, [page, appliedAction, appliedFrom, appliedTo]);

  const { data, loading } = usePageFetch<{ data: LogHeThong[]; total: number }>(listUrl, {
    fallback: { data: [], total: 0 }
  });
  const logs = data.data;
  const total = data.total;

  function handleApplyFilter() {
    setPage(1);
    setAppliedAction(actionFilter);
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
  }

  function handleClearFilter() {
    setActionFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
    setAppliedAction('');
    setAppliedFrom('');
    setAppliedTo('');
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilter = appliedAction || appliedFrom || appliedTo;

  return (
    <div>
      <PageHeader
        title="Nhật ký thao tác"
        description="Lịch sử tất cả thao tác trong hệ thống"
        breadcrumb="Nhật ký"
      />

      <div className="space-y-4 p-5">
        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Loại thao tác</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Từ ngày</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Đến ngày</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Filter size={14} />}
            onClick={handleApplyFilter}
          >
            Lọc
          </Button>

          {hasFilter && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<X size={14} />}
              onClick={handleClearFilter}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size={24} className="text-brand-500" />
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={<FileText size={48} className="text-slate-300" />}
              title="Không có dữ liệu"
              description={hasFilter ? 'Không tìm thấy log phù hợp với bộ lọc.' : 'Chưa có thao tác nào được ghi lại.'}
            />
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>Thời gian</TH>
                    <TH>Người dùng</TH>
                    <TH>Thao tác</TH>
                    <TH>Loại tài nguyên</TH>
                    <TH>Kết quả</TH>
                  </TR>
                </THead>
                <TBody>
                  {logs.map((log) => (
                    <TR key={log.id}>
                      <TD className="whitespace-nowrap text-xs text-slate-600">
                        {formatDateTime(log.ngay_thuc_hien)}
                      </TD>
                      <TD className="text-sm font-medium text-slate-800">
                        {log.username ?? '—'}
                      </TD>
                      <TD>
                        <Badge variant={ACTION_BADGE_COLOR[log.action] ?? 'neutral'}>
                          {log.action}
                        </Badge>
                      </TD>
                      <TD className="text-sm text-slate-600">
                        {log.resource_type ?? '—'}
                        {log.resource_id ? ` #${log.resource_id}` : ''}
                      </TD>
                      <TD>
                        <Badge variant={log.result === 'SUCCESS' ? 'success' : 'danger'}>
                          {log.result}
                        </Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total} bản ghi
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Trang trước"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="px-2 text-xs font-medium text-slate-700">
                      {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Trang sau"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
