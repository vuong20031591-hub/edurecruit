'use client';
import { useEffect, useState } from 'react';
import { Eye, Pencil, Trash2, CalendarDays, CreditCard, Building2, Hash, CheckSquare } from 'lucide-react';
import { Table, THead, TBody, TR, TH, TD } from '@/shared/components/Table';
import { Badge } from '@/shared/components/Badge';
import { formatDate, buildViTriLabel } from '@/shared/lib/format';
import { TrangThaiHoSo, TrangThaiHoSoLabel, CapHocLabel } from '@/shared/constants/enums';
import type { ThiSinhView } from '@/modules/hosso/types';
import type { TrangThaiHoSo as TrangThaiHoSoType } from '@/db/schema';
import { cn } from '@/shared/lib/cn';

export type ThiSinhAction = 'view' | 'edit' | 'delete' | 'lock';

interface ThiSinhTableProps {
  data: ThiSinhView[];
  page: number;
  pageSize: number;
  onRowClick: (id: number) => void;
  onAction: (action: ThiSinhAction, id: number) => void;
  onSelectionChange?: (ids: number[]) => void;
  selectedIds?: number[];
  canLock?: boolean;
}

const TRANG_THAI_BADGE: Record<TrangThaiHoSoType, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ChoRaSoat: 'neutral',
  HopLe: 'success',
  CanBoSung: 'warning',
  KhongDuDieuKien: 'danger',
  DaChinhSua: 'info'
};

export function ThiSinhTable({ data, page, pageSize, onRowClick, onAction, onSelectionChange, selectedIds, canLock }: ThiSinhTableProps) {
  const year = new Date().getFullYear();
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Sync với controlled state từ parent (vd clear khi đổi page, hoặc bấm ✕).
  // Chỉ set khi prop thực sự khác reference để tránh loop vô hạn.
  useEffect(() => {
    const incoming = new Set(selectedIds ?? []);
    if (incoming.size !== selected.size || [...incoming].some(id => !selected.has(id))) {
      setSelected(incoming);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  const allIds = data.map(ts => ts.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = !allSelected && allIds.some(id => selected.has(id));

  function toggleAll() {
    const next = allSelected ? new Set<number>() : new Set(allIds);
    setSelected(next);
    onSelectionChange?.([...next]);
  }
  function toggleOne(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
    onSelectionChange?.([...next]);
  }

  // ─── Card layout (< lg) ──────────────────────────────────────────────────────
  const cards = (
    <div className="lg:hidden">
      {/* Select-all bar */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <input
          type="checkbox"
          checked={allSelected}
          ref={el => { if (el) el.indeterminate = someSelected; }}
          onChange={toggleAll}
          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand-600"
          onClick={e => e.stopPropagation()}
        />
        <span className="text-xs text-slate-500">Chọn tất cả ({allIds.length})</span>
      </div>

      {data.map((ts, idx) => {
        const stt = (page - 1) * pageSize + idx + 1;
        const trangThai = ts.trang_thai_ho_so ?? TrangThaiHoSo.ChoRaSoat;
        const isLocked = (ts as ThiSinhView & { is_profile_locked?: number }).is_profile_locked === 1;
        const maHoSo = (ts as ThiSinhView & { ma_ho_so?: string }).ma_ho_so
          ?? `TDVC-${year}-${String(ts.id).padStart(5, '0')}`;
        const isChecked = selected.has(ts.id);
        const viTriLabel = ts.viTri
          ? buildViTriLabel({
              loai_vi_tri: ts.viTri.loai_vi_tri ?? 'GiaoVien',
              mon: ts.viTri.mon,
              cap_hoc: ts.viTri.cap_hoc
            })
          : null;

        return (
          <div
            key={ts.id}
            onClick={() => onRowClick(ts.id)}
            className={cn(
              'flex items-start gap-3 border-b border-slate-100 px-3 py-3 cursor-pointer transition-colors active:bg-slate-100',
              isChecked ? 'bg-brand-50' : 'hover:bg-slate-50'
            )}
          >
            {/* Checkbox */}
            <div className="pt-0.5 shrink-0" onClick={e => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleOne(ts.id)}
                className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand-600"
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Line 1: STT · Tên · Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-medium text-slate-400">#{stt}</span>
                <span className="font-semibold text-slate-900 text-sm">
                  {ts.ho_ten || `${ts.ho} ${ts.ten}`.trim()}
                </span>
                <Badge variant={TRANG_THAI_BADGE[trangThai]}>
                  {isLocked && '🔒 '}{TrangThaiHoSoLabel[trangThai]}
                </Badge>
              </div>

              {/* Line 2: Mã hồ sơ + Vị trí */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                  <Hash size={10} />
                  {maHoSo}
                </span>
                {viTriLabel && (
                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                    <Building2 size={10} />
                    {viTriLabel}
                  </span>
                )}
              </div>

              {/* Line 3: Ngày sinh · CCCD · Ngày nộp */}
              <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={10} />
                  {formatDate(ts.ngay_sinh)}
                </span>
                {ts.cccd && (
                  <span className="inline-flex items-center gap-1">
                    <CreditCard size={10} />
                    {ts.cccd}
                  </span>
                )}
                <span>Nộp: {formatDate(ts.ngay_nop_ho_so)}</span>
              </div>

              {/* Actions — full-width row, touch-friendly (44px height) */}
              <div
                className="flex items-center gap-0 border-t border-slate-100 pt-2 mt-1 -mx-0"
                onClick={e => e.stopPropagation()}
              >
                {trangThai === TrangThaiHoSo.HopLe && !isLocked && canLock && (
                  <>
                    <button
                      type="button"
                      onClick={() => onAction('lock', ts.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50 active:bg-emerald-100"
                    >
                      <CheckSquare size={14} />
                      Duyệt
                    </button>
                    <div className="h-5 w-px bg-slate-200" />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => onAction('view', ts.id)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 active:bg-brand-100"
                >
                  <Eye size={14} />
                  Xem
                </button>
                {!isLocked && (
                  <>
                    <div className="h-5 w-px bg-slate-200" />
                    <button
                      type="button"
                      onClick={() => onAction('edit', ts.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 active:bg-slate-200"
                    >
                      <Pencil size={14} />
                      Sửa
                    </button>
                    <div className="h-5 w-px bg-slate-200" />
                    <button
                      type="button"
                      onClick={() => onAction('delete', ts.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 active:bg-red-100"
                    >
                      <Trash2 size={14} />
                      Xóa
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ─── Table layout (≥ lg) ─────────────────────────────────────────────────────
  const table = (
    <div className="hidden lg:block">
      <Table>
        <THead>
          <TR>
            <TH className="w-10 text-center">
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected; }}
                onChange={toggleAll}
                className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand-600"
                onClick={e => e.stopPropagation()}
              />
            </TH>
            <TH className="w-12 text-center">STT</TH>
            <TH className="w-32">Mã hồ sơ</TH>
            <TH>Họ và tên</TH>
            <TH className="w-28">Ngày sinh</TH>
            <TH className="w-32">CCCD</TH>
            <TH className="w-40">Vị trí ứng tuyển</TH>
            <TH className="w-28">Ngày nộp</TH>
            <TH className="w-36">Trạng thái</TH>
            <TH className="w-24 text-center">Thao tác</TH>
          </TR>
        </THead>
        <TBody>
          {data.map((ts, idx) => {
            const stt = (page - 1) * pageSize + idx + 1;
            const trangThai = ts.trang_thai_ho_so ?? TrangThaiHoSo.ChoRaSoat;
            const isLocked = (ts as ThiSinhView & { is_profile_locked?: number }).is_profile_locked === 1;
            const maHoSo = (ts as ThiSinhView & { ma_ho_so?: string }).ma_ho_so
              ?? `TDVC-${year}-${String(ts.id).padStart(5, '0')}`;
            const isChecked = selected.has(ts.id);

            return (
              <TR key={ts.id} onClick={() => onRowClick(ts.id)}
                className={`cursor-pointer ${isChecked ? 'bg-brand-50' : ''}`}>
                <TD className="text-center" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={isChecked} onChange={() => toggleOne(ts.id)}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand-600" />
                </TD>
                <TD className="text-center text-xs font-medium text-slate-500">{stt}</TD>
                <TD>
                  <span className="inline-block rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-navy-700">
                    {maHoSo}
                  </span>
                </TD>
                <TD>
                  <span className="font-medium text-slate-900">{ts.ho_ten || `${ts.ho} ${ts.ten}`.trim()}</span>
                </TD>
                <TD className="text-xs text-slate-500">{formatDate(ts.ngay_sinh)}</TD>
                <TD>
                  <span className="font-mono text-xs text-slate-600">
                    {ts.cccd || <span className="text-slate-300">—</span>}
                  </span>
                </TD>
                <TD>
                  {ts.viTri ? (
                    <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {buildViTriLabel({
                        loai_vi_tri: ts.viTri.loai_vi_tri ?? 'GiaoVien',
                        mon: ts.viTri.mon,
                        cap_hoc: ts.viTri.cap_hoc
                      })}
                    </span>
                  ) : <span className="text-xs text-slate-300">—</span>}
                </TD>
                <TD className="text-xs text-slate-500">{formatDate(ts.ngay_nop_ho_so)}</TD>
                <TD>
                  <Badge variant={TRANG_THAI_BADGE[trangThai]}>
                    {isLocked && <span aria-hidden>🔒</span>}
                    {TrangThaiHoSoLabel[trangThai]}
                  </Badge>
                </TD>
                <TD className="text-center">
                  <div className="flex items-center justify-center gap-0.5" onClick={e => e.stopPropagation()}>
                    {trangThai === TrangThaiHoSo.HopLe && !isLocked && canLock && (
                      <button type="button" onClick={() => onAction('lock', ts.id)}
                        className="rounded p-1.5 text-emerald-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                        aria-label="Duyệt hồ sơ" title="Duyệt hồ sơ">
                        <CheckSquare size={15} />
                      </button>
                    )}
                    <button type="button" onClick={() => onAction('view', ts.id)}
                      className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600"
                      aria-label="Xem" title="Xem">
                      <Eye size={15} />
                    </button>
                    {!isLocked && (
                      <>
                        <button type="button" onClick={() => onAction('edit', ts.id)}
                          className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Sửa" title="Sửa">
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => onAction('delete', ts.id)}
                          className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label="Xóa" title="Xóa">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );

  return <>{cards}{table}</>;
}
