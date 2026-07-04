'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Calendar, Printer, RefreshCw, Plus, Trash2, Pencil, ListChecks,
  AlertCircle, MoreVertical, CheckCircle2, XCircle, Clock, LayoutGrid, Table2
} from 'lucide-react';
import { PageHeader, Button, Spinner, EmptyState, toast, Badge } from '@/shared/components';
import { useTopbar } from '@/shared/hooks/useTopbar';
import { usePageFetch } from '@/shared/hooks/usePageFetch';
import type { PhongThiView, PhongThiStats } from '@/modules/phongthi/types';
import { PhongThiFormModal } from './_components/PhongThiFormModal';
import { ConfirmDeleteModal } from './_components/ConfirmDeleteModal';
import { PreviewSapXepModal } from './_components/PreviewSapXepModal';

// ─── Helpers ────────────────────────────────────────────────────────────────

const TRANG_THAI_CONFIG = {
  ChuaSapXep: { label: 'Trống',    bg: 'bg-slate-100',  text: 'text-slate-600',   border: 'border-slate-200' },
  DaSapXep:   { label: 'Còn chỗ', bg: 'bg-yellow-50',  text: 'text-yellow-800',  border: 'border-yellow-200' },
  DaKhoa:     { label: 'Đầy chỗ', bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
  DaThiXong:  { label: 'Xong',    bg: 'bg-slate-100',  text: 'text-slate-500',   border: 'border-slate-200' },
} as const;

function TrangThaiBadge({ trangThai, soXep, sucChua }: { trangThai: PhongThiView['trang_thai']; soXep: number; sucChua: number }) {
  // Determine effective status from fill level
  let effectiveKey: keyof typeof TRANG_THAI_CONFIG = trangThai;
  if (trangThai !== 'DaKhoa' && trangThai !== 'DaThiXong') {
    if (soXep === 0) effectiveKey = 'ChuaSapXep';
    else if (soXep >= sucChua) effectiveKey = 'DaKhoa';
    else effectiveKey = 'DaSapXep';
  }
  const cfg = TRANG_THAI_CONFIG[effectiveKey];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {effectiveKey === 'DaKhoa'    && <XCircle size={11} />}
      {effectiveKey === 'DaSapXep'  && <AlertCircle size={11} />}
      {effectiveKey === 'ChuaSapXep' && <Clock size={11} />}
      {effectiveKey === 'DaThiXong' && <CheckCircle2 size={11} />}
      {cfg.label}
    </span>
  );
}

function FillBar({ soXep, sucChua, tyLe }: { soXep: number; sucChua: number; tyLe: number }) {
  const pct = Math.min(100, Math.max(0, tyLe));
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-right text-xs text-slate-500">{pct}%</span>
    </div>
  );
}

const EMPTY_STATS: PhongThiStats = { tongPhong: 0, tongSucChua: 0, daXep: 0, conTrong: 0, phongDaycho: 0, phongConCho: 0 };

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PhongThiPage() {
  const { data: topbar } = useTopbar();
  const kyId = topbar.ky?.id ?? null;
  const kyName = topbar.ky?.ten_ky ?? null;

  const [rooms, setRooms] = useState<PhongThiView[]>([]);
  const [stats, setStats] = useState<PhongThiStats>(EMPTY_STATS);
  const [sapXeping, setSapXeping] = useState(false);
  const [lastSapXep, setLastSapXep] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<PhongThiView | null>(null);
  const [deleteItem, setDeleteItem] = useState<PhongThiView | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const roomsUrl = useMemo(
    () => (kyId ? `/api/phongthi?ky_tuyendung_id=${kyId}` : null),
    [kyId]
  );
  const statsUrl = useMemo(
    () => (kyId ? `/api/phongthi?ky_tuyendung_id=${kyId}&stats=true` : null),
    [kyId]
  );

  const roomsRes = usePageFetch<{ data: PhongThiView[] }>(roomsUrl, { fallback: { data: [] } });
  const statsRes = usePageFetch<PhongThiStats>(statsUrl, { fallback: EMPTY_STATS });
  const roomList = roomsRes.data.data;
  const loading = roomsRes.loading || statsRes.loading;
  const error = roomsRes.error || statsRes.error;

  // Sync rooms + derive lastSapXep
  useEffect(() => {
    setRooms(roomList);
    const assigned = roomList.filter(r => r.so_luong_da_xep > 0);
    if (assigned.length > 0) {
      const latest = assigned.reduce((max, r) =>
        r.updated_at > max ? r.updated_at : max,
        assigned[0].updated_at
      );
      const dt = new Date(latest);
      if (!isNaN(dt.getTime())) {
        setLastSapXep(dt.toLocaleString('vi-VN', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }));
      }
    } else {
      setLastSapXep(null);
    }
  }, [roomList]);

  useEffect(() => {
    if (statsRes.data) setStats(statsRes.data);
  }, [statsRes.data]);

  // Close menu on outside click
  useEffect(() => {
    if (openMenuId === null) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openMenuId]);

  async function runSapXep() {
    if (!kyId) return;
    setSapXeping(true);
    try {
      const res = await fetch('/api/phongthi/sapxep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ky_tuyendung_id: kyId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const { assigned, skipped, warnings } = json as { assigned: number; skipped: number; warnings: string[] };
      const tail = (warnings && warnings.length)
        ? ` · ${warnings.length} cảnh báo`
        : '';
      toast.success(`Đã xếp ${assigned} thí sinh${skipped > 0 ? ` · ${skipped} bỏ qua` : ''}${tail}`);
      setLastSapXep(new Date().toLocaleString('vi-VN'));
      roomsRes.refresh();
      statsRes.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi xếp phòng');
      throw err;
    } finally {
      setSapXeping(false);
    }
  }

  function openSapXepPreview() {
    if (!kyId) return;
    setPreviewOpen(true);
  }

  function handlePrint() {
    window.print();
  }

  function openCreate() {
    setEditItem(null);
    setFormOpen(true);
  }

  function openEdit(item: PhongThiView) {
    setEditItem(item);
    setFormOpen(true);
    setOpenMenuId(null);
  }

  function openDelete(item: PhongThiView) {
    setDeleteItem(item);
    setOpenMenuId(null);
  }

  async function handleDeleteConfirm() {
    if (!deleteItem) return;
    try {
      const res = await fetch(`/api/phongthi/${deleteItem.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      toast.success('Đã xóa phòng thi');
      setDeleteItem(null);
      roomsRes.refresh();
      statsRes.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi xóa phòng');
    }
  }

  const hasData = rooms.length > 0;

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Xếp phòng thi"
          description="Phân bổ thí sinh vào phòng thi"
        />
      </div>

      <div className="space-y-4 p-5">
        {/* No kỳ warning */}
        {!kyId && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>Chưa có kỳ tuyển dụng. Vui lòng cấu hình kỳ trong Cài đặt.</span>
          </div>
        )}

        {/* ─── Stat cards (Figma: 4 cards) ─── */}
        <div className="no-print grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Tổng phòng thi" value={stats.tongPhong} sub={`${stats.phongDaycho} phòng đầy chỗ`} valueColor="text-brand-600" />
          <StatCard label="Tổng sức chứa" value={stats.tongSucChua} sub={`${stats.tongPhong} phòng × ${stats.tongPhong ? Math.round(stats.tongSucChua / stats.tongPhong) : 0} chỗ`} valueColor="text-slate-800" />
          <StatCard label="Đã xếp" value={stats.daXep} sub={`${stats.tongSucChua > 0 ? Math.round(stats.daXep / stats.tongSucChua * 100) : 0}% tổng chỗ ngồi`} valueColor="text-emerald-700" />
          <StatCard label="Còn trống" value={stats.conTrong} sub={`${stats.phongConCho} phòng còn chỗ`} valueColor="text-amber-700" />
        </div>

        {/* Hướng dẫn quy trình xếp phòng */}
        <div className="no-print rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-900 shadow-sm">
          <h4 className="font-semibold text-blue-950 mb-2 flex items-center gap-1.5">
            <AlertCircle size={16} className="text-blue-600 shrink-0" />
            Hướng dẫn quy trình xếp phòng thi:
          </h4>
          <ol className="list-decimal pl-5 space-y-1.5 text-xs text-blue-800">
            <li><strong>Bước 1 - Rà soát hồ sơ:</strong> Đảm bảo toàn bộ hồ sơ thí sinh đủ điều kiện đã được duyệt trạng thái là <strong>Hợp lệ</strong>.</li>
            <li><strong>Bước 2 - Khóa hồ sơ:</strong> Khóa danh sách hồ sơ thí sinh (chốt danh sách) để sẵn sàng xếp phòng.</li>
            <li><strong>Bước 3 - Xếp phòng tự động:</strong> Bấm nút <strong>Xếp phòng tự động</strong> ở thanh công cụ dưới đây để hệ thống tự động gán SBD và phân chia thí sinh vào phòng thi giảng. <em>(Nếu có thí sinh chưa khóa hồ sơ, bấm nút "Khóa hồ sơ ngay" trong cửa sổ xác nhận)</em>.</li>
            <li><strong>Bước 4 - Xuất/In danh sách:</strong> Xuất Excel danh sách phòng thi giảng (in từng phòng thi cụ thể) hoặc danh sách phòng chờ (xáo trộn ngẫu nhiên thí sinh cùng cấp học).</li>
          </ol>
        </div>

        {/* ─── Toolbar (Figma: sapxep button + in + status + toggle) ─── */}
        <div data-guide="phong-thi-sap-xep" className="no-print flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          {/* Xếp phòng tự động */}
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Calendar size={14} />}
            onClick={openSapXepPreview}
            loading={sapXeping}
            disabled={!kyId || sapXeping}
          >
            Xếp phòng tự động
          </Button>

          {/* Thêm phòng thủ công */}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={openCreate}
            disabled={!kyId}
          >
            Thêm phòng
          </Button>

          {/* In danh sách */}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Printer size={14} />}
            onClick={handlePrint}
          >
            In danh sách
          </Button>

          {/* Xuất phòng chờ (Excel) */}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Printer size={14} />}
            onClick={() => {
              if (kyId) {
                window.location.href = `/api/bao-cao/xuat?loai=ds-phong-cho&ky_tuyendung_id=${kyId}`;
              }
            }}
            disabled={!kyId}
          >
            Xuất phòng chờ (Excel)
          </Button>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={() => { roomsRes.refresh(); statsRes.refresh(); }}
            disabled={loading}
          >
            Làm mới
          </Button>

          {/* Status badge (Figma: green pill "Đã xếp phòng tự động") */}
          {lastSapXep && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700">
              <CheckCircle2 size={13} />
              Đã xếp phòng tự động — {lastSapXep}
            </span>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Toggle Bảng / Lưới */}
          <div className="flex overflow-hidden rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-1.5"><Table2 size={13} />Bảng</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-1.5"><LayoutGrid size={13} />Lưới</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Không tải được dữ liệu</div>
              <div className="text-xs">{error?.message ?? String(error)}</div>
            </div>
          </div>
        )}

        {/* ─── Table/Grid content ─── */}
        <div data-guide="phong-thi-list" className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {loading && !hasData ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size={24} className="text-brand-500" />
            </div>
          ) : !hasData ? (
            <EmptyState
              icon={<Calendar size={48} className="text-slate-300" />}
              title="Chưa có phòng thi nào"
              description="Thêm phòng thi thủ công hoặc nhấn 'Xếp phòng tự động' sau khi đã rà soát hồ sơ."
              action={
                <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openCreate} disabled={!kyId}>
                  Thêm phòng thi
                </Button>
              }
            />
          ) : viewMode === 'table' ? (
            <TableView rooms={rooms} onEdit={openEdit} onDelete={openDelete} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} />
          ) : (
            <>
              <div className="no-print">
                <GridView rooms={rooms} onEdit={openEdit} onDelete={openDelete} />
              </div>
              <div className="print-only">
                <TableView rooms={rooms} onEdit={() => {}} onDelete={() => {}} openMenuId={null} setOpenMenuId={() => {}} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {formOpen && kyId && (
        <PhongThiFormModal
          kyId={kyId}
          item={editItem}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); roomsRes.refresh(); statsRes.refresh(); }}
        />
      )}
      {deleteItem && (
        <ConfirmDeleteModal
          item={deleteItem}
          onClose={() => setDeleteItem(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
      {kyId && (
        <PreviewSapXepModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          kyId={kyId}
          onConfirm={runSapXep}
        />
      )}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, valueColor }: { label: string; value: number; sub: string; valueColor: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueColor}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

// ─── Table View ──────────────────────────────────────────────────────────────
function TableView({
  rooms,
  onEdit,
  onDelete,
  openMenuId,
  setOpenMenuId,
}: {
  rooms: PhongThiView[];
  onEdit: (r: PhongThiView) => void;
  onDelete: (r: PhongThiView) => void;
  openMenuId: number | null;
  setOpenMenuId: (id: number | null) => void;
}) {
  return (
    <>
      {/* ── Mobile card layout (< lg) ─────────────────────────────────── */}
      <div className="lg:hidden divide-y divide-slate-100 no-print">
        {rooms.map((r) => {
          const pct = Math.min(100, r.ty_le_lap_day);
          return (
            <div key={r.id} className="px-4 py-3 space-y-1.5">
              {/* Line 1: mã phòng + tên + badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-800">{r.ma_phong}</span>
                {r.ten_phong && <span className="text-sm text-slate-500">— {r.ten_phong}</span>}
                <TrangThaiBadge trangThai={r.trang_thai} soXep={r.so_luong_da_xep} sucChua={r.suc_chua} />
              </div>

              {/* Line 2: vị trí + ngày/giờ */}
              <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                {r.ten_vi_tri && (
                  <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                    {r.ten_vi_tri}
                  </span>
                )}
                <span>{r.ngay_thi} · {r.gio_thi}</span>
                {r.dia_diem && <span>· {r.dia_diem}</span>}
              </div>

              {/* Line 3: progress bar + tỷ lệ */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 shrink-0">
                  {r.so_luong_da_xep}/{r.suc_chua} chỗ ({pct}%)
                </span>
              </div>

              {/* Action bar */}
              <div className="no-print flex items-center gap-0 border-t border-slate-100 pt-2 mt-1"
                   onClick={e => e.stopPropagation()}>
                <button type="button" onClick={() => onEdit(r)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 active:bg-slate-200">
                  <Pencil size={14} /> Sửa
                </button>
                <div className="h-5 w-px bg-slate-200" />
                <button type="button" onClick={() => onDelete(r)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-red-500 hover:bg-red-50 active:bg-red-100">
                  <Trash2 size={14} /> Xóa
                </button>
              </div>
            </div>
          );
        })}
        <div className="px-4 py-2 text-xs text-slate-400">{rooms.length} phòng thi</div>
      </div>

      {/* ── Desktop table (≥ lg) ──────────────────────────────────────── */}
      <div className="hidden lg:block print-table overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Phòng thi</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Vị trí</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày thi</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Sức chứa</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Đã xếp</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tỷ lệ lấp đầy</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</th>
              <th className="w-12 px-4 py-3 no-print" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rooms.map((r, idx) => (
              <tr key={r.id} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={15} className="shrink-0 text-slate-400" />
                    <div>
                      <span className="font-semibold text-slate-800">{r.ma_phong}</span>
                      {r.ten_phong && <span className="ml-1 text-slate-500">— {r.ten_phong}</span>}
                      {r.dia_diem && <div className="text-xs text-slate-400">{r.dia_diem}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.ten_vi_tri ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {r.ngay_thi} <span className="text-slate-400">{r.gio_thi}</span>
                </td>
                <td className="px-4 py-3 text-center text-slate-600">{r.suc_chua}</td>
                <td className="px-4 py-3 text-center font-semibold text-slate-800">{r.so_luong_da_xep}</td>
                <td className="px-4 py-3">
                  <FillBar soXep={r.so_luong_da_xep} sucChua={r.suc_chua} tyLe={r.ty_le_lap_day} />
                </td>
                <td className="px-4 py-3">
                  <TrangThaiBadge trangThai={r.trang_thai} soXep={r.so_luong_da_xep} sucChua={r.suc_chua} />
                </td>
                <td className="px-4 py-3 text-right no-print">
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === r.id ? null : r.id); }}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Thao tác"
                    >
                      <MoreVertical size={15} />
                    </button>
                    {openMenuId === r.id && (
                      <div
                        className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a href={`/dashboard/nhap-diem?phongthi_id=${r.id}`}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          <ListChecks size={13} />DS thí sinh / Nhập điểm
                        </a>
                        <a href={`/api/bao-cao/xuat?loai=ds-phong-thi&phongthi_id=${r.id}`}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          <Printer size={13} />In danh sách phòng
                        </a>
                        <button type="button" onClick={() => onEdit(r)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          <Pencil size={13} />Sửa phòng
                        </button>
                        <button type="button" onClick={() => onDelete(r)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                          <Trash2 size={13} />Xóa
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
          {rooms.length} phòng thi
        </div>
      </div>
    </>
  );
}

// ─── Grid View ───────────────────────────────────────────────────────────────
function GridView({ rooms, onEdit, onDelete }: { rooms: PhongThiView[]; onEdit: (r: PhongThiView) => void; onDelete: (r: PhongThiView) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {rooms.map((r) => {
        const pct = Math.min(100, r.ty_le_lap_day);
        const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
        return (
          <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800">{r.ma_phong}</p>
                {r.ten_phong && <p className="text-xs text-slate-500">{r.ten_phong}</p>}
              </div>
              <TrangThaiBadge trangThai={r.trang_thai} soXep={r.so_luong_da_xep} sucChua={r.suc_chua} />
            </div>
            <div className="mt-2 text-xs text-slate-500">{r.ten_vi_tri ?? '—'}</div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>{r.so_luong_da_xep}/{r.suc_chua} chỗ</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-400">{r.ngay_thi} · {r.gio_thi}</div>
            <div className="no-print mt-3 flex gap-1.5">
              <button
                type="button"
                onClick={() => onEdit(r)}
                className="flex-1 rounded border border-slate-200 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                <Pencil size={11} className="mx-auto" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(r)}
                className="flex-1 rounded border border-red-100 py-1 text-xs text-red-500 hover:bg-red-50"
              >
                <Trash2 size={11} className="mx-auto" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
