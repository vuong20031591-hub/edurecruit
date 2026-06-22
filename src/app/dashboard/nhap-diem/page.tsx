'use client';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Download, Lock, Search, RefreshCw, AlertTriangle } from 'lucide-react';
import { PageHeader, Button, Spinner, SelectDropdown, toast } from '@/shared/components';
import { useTopbar } from '@/shared/hooks/useTopbar';
import { usePageFetch } from '@/shared/hooks/usePageFetch';
import type { DiemThiView, DiemThiStats } from '@/modules/diemthi/types';
import { cn } from '@/shared/lib/cn';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhongOption { id: number; ma_phong: string; ten_phong: string | null; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskName(row: DiemThiView): string {
  // Ẩn danh: giữ chữ đầu tên + ***
  const first = row.ten?.charAt(0) ?? '';
  const ho = row.ho ?? '';
  return `${ho} ${first}***`;
}

function calcDTB(gk1: number | null, gk2: number | null): number | null {
  // Đồng nhất với DB trigger: chỉ tính khi cả 2 NOT NULL
  if (gk1 == null || gk2 == null) return null;
  return Math.round((gk1 + gk2) / 2 * 100) / 100;
}

function statusBadge(row: DiemThiView) {
  if (row.trang_thai_nhap === 'DaKhoa') return { label: 'Đã khóa', cls: 'bg-slate-100 text-slate-600 border-slate-300' };
  if (row.vang_thi) return { label: 'Vắng', cls: 'bg-orange-50 text-orange-600 border-orange-200' };
  if (row.bo_thi) return { label: 'Bỏ thi', cls: 'bg-red-50 text-red-600 border-red-200' };
  const dtb = calcDTB(row.diem_gk1, row.diem_gk2);
  if (dtb == null) return { label: 'Chưa nhập', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
  if (dtb >= 5) return { label: 'Đạt', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  return { label: 'Không đạt', cls: 'bg-red-50 text-red-700 border-red-200' };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NhapDiemPage() {
  const { data: topbar } = useTopbar();
  const kyId = topbar.ky?.id ?? null;

  // Phòng thi
  const [phongList, setPhongList] = useState<PhongOption[]>([]);
  const [selectedPhongId, setSelectedPhongId] = useState<number | null>(null);

  // Data
  const [rows, setRows] = useState<DiemThiView[]>([]);
  const [stats, setStats] = useState<DiemThiStats>({ tongThiSinh: 0, daNhap: 0, chuaNhap: 0, daKhoa: 0 });
  const [loading, setLoading] = useState(false);

  // Fast Focus
  const [sbdSearch, setSbdSearch] = useState('');
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Khóa điểm modal confirm
  const [khoaConfirm, setKhoaConfirm] = useState(false);
  const [khoaBusy, setKhoaBusy] = useState(false);

  // Inline edit debounce refs
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Phân quyền: chỉ ADMIN và LANH_DAO mới được khóa điểm (PRD §Architecture §2.3)
  const [canKhoa, setCanKhoa] = useState(false);
  // LANH_DAO xem nhưng không nhập — chỉ ADMIN và TO_NHAP_DIEM nhập điểm
  const [canNhap, setCanNhap] = useState(true);
  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(me => {
        if (!me?.quyen) return;
        setCanKhoa(me.quyen === 'ADMIN' || me.quyen === 'LANH_DAO');
        setCanNhap(me.quyen === 'ADMIN' || me.quyen === 'TO_NHAP_DIEM');
      })
      .catch(() => {});
  }, []);

  // ─── Load phòng list ────────────────────────────────────────────────────

  useEffect(() => {
    if (!kyId) return;
    let alive = true;
    fetch(`/api/phongthi?ky_tuyendung_id=${kyId}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => {
        if (!alive) return;
        const list: PhongOption[] = (j.data ?? []).map((p: { id: number; ma_phong: string; ten_phong: string | null }) => ({
          id: p.id,
          ma_phong: p.ma_phong,
          ten_phong: p.ten_phong,
        }));
        setPhongList(list);
        if (list.length > 0 && !selectedPhongId) setSelectedPhongId(list[0].id);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [kyId]);

  // ─── Load điểm list ─────────────────────────────────────────────────────

  const diemUrl = useMemo(
    () => (selectedPhongId ? `/api/diemthi?phongthi_id=${selectedPhongId}` : null),
    [selectedPhongId]
  );
  const diemStatsUrl = useMemo(
    () => (selectedPhongId ? `/api/diemthi?phongthi_id=${selectedPhongId}&stats=true` : null),
    [selectedPhongId]
  );

  const diemRes = usePageFetch<{ data: DiemThiView[] }>(diemUrl, { fallback: { data: [] } });
  const diemStatsRes = usePageFetch<DiemThiStats>(diemStatsUrl, { fallback: { tongThiSinh: 0, daNhap: 0, chuaNhap: 0, daKhoa: 0 } });

  useEffect(() => {
    setLoading(diemRes.loading || diemStatsRes.loading);
  }, [diemRes.loading, diemStatsRes.loading]);

  useEffect(() => {
    if (diemRes.data) setRows(diemRes.data.data);
  }, [diemRes.data]);

  useEffect(() => {
    if (diemStatsRes.data) setStats(diemStatsRes.data);
  }, [diemStatsRes.data]);

  useEffect(() => {
    if (diemRes.error || diemStatsRes.error) toast.error('Kh�ng t?i du?c d? li?u di?m');
  }, [diemRes.error, diemStatsRes.error]);

  // ─── Fast Focus (SBD → Enter → highlight) ──────────────────────────────

  function handleSbdSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    const val = sbdSearch.trim().toUpperCase();
    if (!val) { setHighlightId(null); return; }
    const found = rows.find(r => r.sbd?.toUpperCase().includes(val));
    if (found) {
      setHighlightId(found.thisinh_id);
      setTimeout(() => {
        const el = document.getElementById(`row-${found.thisinh_id}`)
          ?? document.getElementById(`row-mobile-${found.thisinh_id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchRef.current?.focus();
      }, 50);
    } else {
      toast.error(`Không tìm thấy SBD "${sbdSearch.trim()}"`);
    }
  }

  // ─── Inline save (debounced 800ms) ──────────────────────────────────────

  function handleDiemChange(thiSinhId: number, field: 'diem_gk1' | 'diem_gk2', raw: string) {
    const val = raw === '' ? null : parseFloat(raw);

    // Optimistic update local
    setRows(prev => prev.map(r =>
      r.thisinh_id === thiSinhId ? { ...r, [field]: val } : r
    ));

    // Kiểm tra cảnh báo chênh lệch GK1-GK2 > 1.5 (PRD §V.1)
    setRows(prev => {
      const row = prev.find(r => r.thisinh_id === thiSinhId);
      if (row) {
        const gk1 = field === 'diem_gk1' ? val : row.diem_gk1;
        const gk2 = field === 'diem_gk2' ? val : row.diem_gk2;
        if (gk1 != null && gk2 != null && Math.abs(gk1 - gk2) > 1.5) {
          // Hiển thị toast cảnh báo nhưng không chặn
          toast.error(`SBD ${row.sbd ?? row.thisinh_id}: Chênh lệch GK1-GK2 = ${Math.abs(gk1 - gk2).toFixed(1)} > 1.5`);
        }
      }
      return prev;
    });

    const key = `${thiSinhId}-${field}`;
    clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(async () => {
      try {
        const res = await fetch('/api/diemthi', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thisinh_id: thiSinhId, [field]: val }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Lỗi lưu điểm' }));
          toast.error(err.error ?? 'Lỗi lưu điểm');
          // Revert — reload
          diemRes.refresh(); diemStatsRes.refresh();
        } else {
          // Update row với data từ server (để diem_thi_giang được tính trigger)
          const saved = await res.json();
          setRows(prev => prev.map(r => r.thisinh_id === saved.thisinh_id ? { ...r, ...saved } : r));
          // Cập nhật stats
          if (selectedPhongId) {
            const sr = await fetch(`/api/diemthi?phongthi_id=${selectedPhongId}&stats=true`, { cache: 'no-store' });
            if (sr.ok) setStats(await sr.json());
          }
        }
      } catch {
        toast.error('Lỗi kết nối khi lưu điểm');
      }
    }, 800);
  }

  // ─── Vắng/Bỏ thi toggle ─────────────────────────────────────────────────

  async function handleVangBoChange(thiSinhId: number, field: 'vang_thi' | 'bo_thi', checked: boolean) {
    // Nếu check vắng thì clear bỏ thi và ngược lại (DB CHECK constraint)
    const patch: Record<string, unknown> = { thisinh_id: thiSinhId, [field]: checked };
    if (field === 'vang_thi' && checked) patch.bo_thi = false;
    if (field === 'bo_thi' && checked) patch.vang_thi = false;

    // Optimistic update
    setRows(prev => prev.map(r => {
      if (r.thisinh_id !== thiSinhId) return r;
      const updated = { ...r, [field]: checked ? 1 : 0 };
      if (field === 'vang_thi' && checked) updated.bo_thi = 0;
      if (field === 'bo_thi' && checked) updated.vang_thi = 0;
      return updated;
    }));

    try {
      const res = await fetch('/api/diemthi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Lỗi lưu' }));
        toast.error(err.error ?? 'Lỗi lưu trạng thái');
        diemRes.refresh(); diemStatsRes.refresh();
      } else {
        const saved = await res.json();
        setRows(prev => prev.map(r => r.thisinh_id === saved.thisinh_id ? { ...r, ...saved } : r));
      }
    } catch {
      toast.error('Lỗi kết nối');
    }
  }

  // ─── Điểm ưu tiên (onBlur → PUT /api/diemthi/uu-tien) ─────────────────

  async function handleUuTienChange(thiSinhId: number, raw: string) {
    const val = parseFloat(raw);
    if (isNaN(val) || val < 0) return;

    // Optimistic update
    setRows(prev => prev.map(r =>
      r.thisinh_id === thiSinhId ? { ...r, diem_uu_tien: val } : r
    ));

    try {
      const res = await fetch('/api/diemthi/uu-tien', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thisinh_id: thiSinhId, diem_uu_tien: val }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Lỗi lưu điểm ưu tiên' }));
        toast.error(err.error ?? 'Lỗi lưu điểm ưu tiên');
        diemRes.refresh(); diemStatsRes.refresh();
      }
    } catch {
      toast.error('Lỗi kết nối khi lưu điểm ưu tiên');
    }
  }

  // ─── Khóa điểm ──────────────────────────────────────────────────────────

  async function handleKhoaDiem() {
    if (!selectedPhongId) return;
    setKhoaBusy(true);
    try {
      const res = await fetch('/api/diemthi/khoa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phongthi_id: selectedPhongId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Đã khóa ${data.locked} điểm${data.skipped > 0 ? `, bỏ qua ${data.skipped} chưa nhập` : ''}`);
        diemRes.refresh();
        diemStatsRes.refresh();
      } else {
        toast.error(data.error ?? 'Lỗi khóa điểm');
      }
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setKhoaBusy(false);
      setKhoaConfirm(false);
    }
  }

  // ─── Xuất danh sách ─────────────────────────────────────────────────────

  async function handleExport() {
    if (!selectedPhongId || rows.length === 0) return;
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Điểm thi');
      const selectedPhong = phongList.find(p => p.id === selectedPhongId);

      ws.columns = [
        { header: 'SBD', key: 'sbd', width: 12 },
        { header: 'Họ tên', key: 'ho_ten', width: 30 },
        { header: 'GK1', key: 'diem_gk1', width: 8 },
        { header: 'GK2', key: 'diem_gk2', width: 8 },
        { header: 'ĐTB', key: 'dtb', width: 8 },
        { header: 'Trạng thái', key: 'trang_thai', width: 14 },
      ];

      rows.forEach(r => {
        const dtb = calcDTB(r.diem_gk1, r.diem_gk2);
        ws.addRow({
          sbd: r.sbd ?? '',
          ho_ten: r.ho_ten,
          diem_gk1: r.diem_gk1 ?? '',
          diem_gk2: r.diem_gk2 ?? '',
          dtb: dtb ?? '',
          trang_thai: r.trang_thai_nhap,
        });
      });

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diem-thi-${selectedPhong?.ma_phong ?? selectedPhongId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Không thể xuất Excel');
    }
  }

  // ─── Derived ────────────────────────────────────────────────────────────

  const progressPct = stats.tongThiSinh > 0
    ? Math.round((stats.daNhap + stats.daKhoa) / stats.tongThiSinh * 100)
    : 0;
  const selectedPhong = phongList.find(p => p.id === selectedPhongId);
  const isAllLocked = stats.tongThiSinh > 0 && stats.daKhoa === stats.tongThiSinh;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 p-5">
      <PageHeader
        title="Nhập điểm & Xét duyệt"
        description="Chấm điểm thi — Quy trình ráp phách bảo mật"
      />

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        {/* Phòng thi dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">Phòng thi:</span>
          <SelectDropdown
            value={selectedPhongId ? String(selectedPhongId) : ''}
            onChange={v => setSelectedPhongId(v ? Number(v) : null)}
            options={phongList.map(p => ({
              value: String(p.id),
              label: p.ten_phong ? `${p.ma_phong} — ${p.ten_phong}` : p.ma_phong,
            }))}
            placeholder="Chọn phòng..."
            className="w-52"
          />
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200" />

        {/* Progress */}
        {selectedPhongId && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-slate-600 whitespace-nowrap">
              Đã nhập: <span className="font-semibold text-brand-600">{stats.daNhap + stats.daKhoa}</span>/{stats.tongThiSinh}
            </span>
            <div className="w-24 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Xuất danh sách */}
        <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={handleExport} disabled={rows.length === 0}>
          Xuất danh sách
        </Button>

        {/* Khóa điểm — chỉ ADMIN và LANH_DAO */}
        {canKhoa && (!khoaConfirm ? (
          <span data-guide="nhap-diem-khoa">
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Lock size={14} />}
              onClick={() => setKhoaConfirm(true)}
              disabled={!selectedPhongId || isAllLocked || stats.tongThiSinh === 0}
            >
              {isAllLocked ? 'Đã khóa' : 'Khóa điểm'}
            </Button>
          </span>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
            <AlertTriangle size={14} className="text-red-600" />
            <span className="text-xs text-red-700 font-medium">Xác nhận khóa điểm?</span>
            <Button variant="danger" size="sm" loading={khoaBusy} onClick={handleKhoaDiem}>Khóa</Button>
            <Button variant="outline" size="sm" onClick={() => setKhoaConfirm(false)}>Hủy</Button>
          </div>
        ))}

        {/* Làm mới */}
        <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />} onClick={() => { diemRes.refresh(); diemStatsRes.refresh(); }}>
          Làm mới
        </Button>
      </div>

      {/* ── Fast Focus Banner ───────────────────────────────────────────── */}
      <div data-guide="nhap-diem-search" className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Search size={18} className="text-blue-500 shrink-0" />
        <input
          ref={searchRef}
          type="text"
          value={sbdSearch}
          onChange={e => setSbdSearch(e.target.value)}
          onKeyDown={handleSbdSearch}
          placeholder="Nhập Số báo danh và nhấn Enter để bôi sáng dòng thí sinh..."
          className="flex-1 bg-transparent text-base text-blue-400 placeholder:text-blue-300 outline-none"
        />
        {sbdSearch && (
          <button
            type="button"
            onClick={() => { setSbdSearch(''); setHighlightId(null); }}
            className="text-blue-400 hover:text-blue-600 text-xs"
          >
            Xóa
          </button>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div data-guide="nhap-diem-grid" className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : !selectedPhongId ? (
          <div className="py-16 text-center text-slate-400 text-sm">Chọn phòng thi để xem danh sách</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">Phòng thi chưa có thí sinh nào được xếp</div>
        ) : (
          <>
            {/* ── Mobile Cards ── */}
            <div className="lg:hidden divide-y divide-slate-100">
              {rows.map((row) => {
                const isHighlighted = highlightId === row.thisinh_id;
                const isLocked = row.trang_thai_nhap === 'DaKhoa' || !canNhap;
                const dtb = calcDTB(row.diem_gk1, row.diem_gk2);
                const badge = statusBadge(row);

                return (
                  <div
                    key={row.id}
                    id={`row-mobile-${row.thisinh_id}`}
                    className={cn(
                      'px-4 py-3 space-y-3 transition-colors',
                      isHighlighted && 'bg-blue-50 ring-2 ring-inset ring-blue-400',
                      (row.vang_thi || row.bo_thi) && !isHighlighted && 'bg-orange-50/40',
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded px-2 py-0.5 bg-[#1d293d] text-slate-200 text-xs font-bold font-mono">
                        {row.sbd ?? row.thisinh_id}
                      </span>
                      <span className="text-sm text-slate-600 truncate">{maskName(row)}</span>
                      <span className={cn('ml-auto inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap', badge.cls)}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Inputs row */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">GK 1</label>
                        <input
                          type="number"
                          min={0} max={10} step={0.5}
                          disabled={isLocked}
                          value={row.diem_gk1 ?? ''}
                          placeholder="0–10"
                          className={cn(
                            'w-full rounded-lg border text-center outline-none transition-colors',
                            'px-2 py-2.5 text-base',
                            isLocked
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-white border-slate-200 text-slate-800 focus:border-brand-400 focus:ring-1 focus:ring-brand-200'
                          )}
                          onChange={e => handleDiemChange(row.thisinh_id, 'diem_gk1', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">GK 2</label>
                        <input
                          type="number"
                          min={0} max={10} step={0.5}
                          disabled={isLocked}
                          value={row.diem_gk2 ?? ''}
                          placeholder="0–10"
                          className={cn(
                            'w-full rounded-lg border text-center outline-none transition-colors',
                            'px-2 py-2.5 text-base',
                            isLocked
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-white border-slate-200 text-slate-800 focus:border-brand-400 focus:ring-1 focus:ring-brand-200'
                          )}
                          onChange={e => handleDiemChange(row.thisinh_id, 'diem_gk2', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">ĐTB</label>
                        <div className={cn(
                          'w-full rounded-lg border text-center font-bold px-2 py-2.5 text-base',
                          dtb != null
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                        )}>
                          {dtb != null ? dtb.toFixed(2) : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Ưu tiên + Vắng/Bỏ row */}
                    <div className="flex items-center">
                      <label className="text-sm text-slate-500 mr-1.5">Ưu tiên:</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        disabled={isLocked}
                        defaultValue={row.diem_uu_tien != null ? String(row.diem_uu_tien) : ''}
                        placeholder="—"
                        className={cn(
                          'w-16 rounded-lg border text-center text-sm outline-none transition-colors px-2 py-1.5',
                          isLocked
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-amber-50 border-amber-200 text-amber-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-100'
                        )}
                        onBlur={e => {
                          const raw = e.target.value.trim();
                          if (raw === '' || raw === String(row.diem_uu_tien ?? '')) return;
                          const num = parseFloat(raw);
                          if (!isNaN(num) && num >= 0) handleUuTienChange(row.thisinh_id, raw);
                          else e.target.value = row.diem_uu_tien != null ? String(row.diem_uu_tien) : '';
                        }}
                      />
                      <div className="ml-auto flex items-center gap-3">
                        <label className={cn(
                          'flex items-center gap-1.5 cursor-pointer text-sm select-none',
                          isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:text-orange-600'
                        )}>
                          <input
                            type="checkbox"
                            disabled={isLocked}
                            checked={!!row.vang_thi}
                            onChange={e => handleVangBoChange(row.thisinh_id, 'vang_thi', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 accent-orange-500"
                          />
                          <span className="text-slate-500">Vắng</span>
                        </label>
                        <label className={cn(
                          'flex items-center gap-1.5 cursor-pointer text-sm select-none',
                          isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:text-red-600'
                        )}>
                          <input
                            type="checkbox"
                            disabled={isLocked}
                            checked={!!row.bo_thi}
                            onChange={e => handleVangBoChange(row.thisinh_id, 'bo_thi', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 accent-red-500"
                          />
                          <span className="text-slate-500">Bỏ thi</span>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop Grid ── */}
            <div className="hidden lg:block overflow-x-auto">
            {/* Table header */}
            <div className="grid bg-[#1d293d]" style={{ gridTemplateColumns: '110px 1fr 90px 90px 90px 90px 110px 120px' }}>
              <div className="px-4 py-3">
                <span className="text-xs font-semibold tracking-wide text-slate-300 uppercase">SBD</span>
              </div>
              <div className="px-4 py-3">
                <div className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Họ và Tên</div>
                <div className="text-[10px] text-slate-500 mt-0.5">(Ẩn danh)</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Điểm GK 1</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Giám khảo 1</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Điểm GK 2</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Giám khảo 2</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Điểm TB</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Tự động tính</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Ưu tiên</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Điểm cộng</div>
              </div>
              <div className="px-3 py-3">
                <div className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Vắng / Bỏ</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Đánh dấu</div>
              </div>
              <div className="px-4 py-3">
                <span className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Kết quả</span>
              </div>
            </div>

            {/* Table rows */}
            {rows.map((row, idx) => {
              const isHighlighted = highlightId === row.thisinh_id;
              const isLocked = row.trang_thai_nhap === 'DaKhoa' || !canNhap;
              const dtb = calcDTB(row.diem_gk1, row.diem_gk2);
              const badge = statusBadge(row);

              return (
                <div
                  key={row.id}
                  id={`row-${row.thisinh_id}`}
                  className={cn(
                    'grid border-b border-slate-100 transition-colors',
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60',
                    isHighlighted && 'bg-blue-50 ring-2 ring-inset ring-blue-400',
                    (row.vang_thi || row.bo_thi) && !isHighlighted && 'bg-orange-50/40',
                  )}
                  style={{ gridTemplateColumns: '110px 1fr 90px 90px 90px 90px 110px 120px' }}
                >
                  {/* SBD */}
                  <div className="px-4 py-3 flex items-center">
                    <span className="inline-flex items-center rounded px-2 py-0.5 bg-[#1d293d] text-slate-200 text-xs font-bold font-mono">
                      {row.sbd ?? row.thisinh_id}
                    </span>
                  </div>

                  {/* Tên ẩn danh */}
                  <div className="px-4 py-3 flex items-center">
                    <span className="text-sm text-slate-600">{maskName(row)}</span>
                  </div>

                  {/* GK1 */}
                  <div className="px-3 py-2.5 flex items-center">
                    <input
                      type="number"
                      min={0} max={10} step={0.5}
                      disabled={isLocked}
                      value={row.diem_gk1 ?? ''}
                      placeholder="0–10"
                      className={cn(
                        'w-full rounded-lg border text-center text-sm outline-none transition-colors',
                        'px-2 py-1.5',
                        isLocked
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-white border-slate-200 text-slate-800 focus:border-brand-400 focus:ring-1 focus:ring-brand-200'
                      )}
                      onChange={e => handleDiemChange(row.thisinh_id, 'diem_gk1', e.target.value)}
                    />
                  </div>

                  {/* GK2 */}
                  <div className="px-3 py-2.5 flex items-center">
                    <input
                      type="number"
                      min={0} max={10} step={0.5}
                      disabled={isLocked}
                      value={row.diem_gk2 ?? ''}
                      placeholder="0–10"
                      className={cn(
                        'w-full rounded-lg border text-center text-sm outline-none transition-colors',
                        'px-2 py-1.5',
                        isLocked
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-white border-slate-200 text-slate-800 focus:border-brand-400 focus:ring-1 focus:ring-brand-200'
                      )}
                      onChange={e => handleDiemChange(row.thisinh_id, 'diem_gk2', e.target.value)}
                    />
                  </div>

                  {/* DTB — readonly, auto */}
                  <div className="px-3 py-2.5 flex items-center">
                    <div className={cn(
                      'w-full rounded-lg border text-center text-sm font-bold px-2 py-1.5',
                      dtb != null
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-slate-100 border-slate-200 text-slate-400'
                    )}>
                      {dtb != null ? dtb.toFixed(2) : '—'}
                    </div>
                  </div>

                  {/* Điểm ưu tiên */}
                  <div className="px-3 py-2.5 flex items-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={isLocked}
                      defaultValue={row.diem_uu_tien != null ? String(row.diem_uu_tien) : ''}
                      placeholder="—"
                      className={cn(
                        'w-full rounded-lg border text-center text-sm outline-none transition-colors px-2 py-1.5',
                        isLocked
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-amber-50 border-amber-200 text-amber-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-100'
                      )}
                      onBlur={e => {
                        const raw = e.target.value.trim();
                        if (raw === '' || raw === String(row.diem_uu_tien ?? '')) return;
                        const num = parseFloat(raw);
                        if (!isNaN(num) && num >= 0) handleUuTienChange(row.thisinh_id, raw);
                        else e.target.value = row.diem_uu_tien != null ? String(row.diem_uu_tien) : '';
                      }}
                    />
                  </div>

                  {/* Vắng / Bỏ thi */}
                  <div className="px-3 py-2.5 flex items-center gap-2">
                    <label className={cn(
                      'flex items-center gap-1 cursor-pointer text-xs select-none',
                      isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:text-orange-600'
                    )}>
                      <input
                        type="checkbox"
                        disabled={isLocked}
                        checked={!!row.vang_thi}
                        onChange={e => handleVangBoChange(row.thisinh_id, 'vang_thi', e.target.checked)}
                        className="rounded border-slate-300 accent-orange-500"
                      />
                      <span className="text-slate-500">Vắng</span>
                    </label>
                    <label className={cn(
                      'flex items-center gap-1 cursor-pointer text-xs select-none',
                      isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:text-red-600'
                    )}>
                      <input
                        type="checkbox"
                        disabled={isLocked}
                        checked={!!row.bo_thi}
                        onChange={e => handleVangBoChange(row.thisinh_id, 'bo_thi', e.target.checked)}
                        className="rounded border-slate-300 accent-red-500"
                      />
                      <span className="text-slate-500">Bỏ</span>
                    </label>
                  </div>

                  {/* Status badge */}
                  <div className="px-4 py-3 flex items-center">
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs', badge.cls)}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Footer stats row */}
            <div className="flex items-center justify-between bg-slate-50 border-t border-slate-200 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Tổng: <b className="text-slate-700">{stats.tongThiSinh}</b> thí sinh</span>
                <span className="text-slate-300">|</span>
                <span>Đã nhập đủ: <b className="text-emerald-600">{stats.daNhap + stats.daKhoa}</b></span>
                <span className="text-slate-300">|</span>
                <span>Chưa nhập: <b className="text-amber-600">{stats.chuaNhap}</b></span>
                {stats.daKhoa > 0 && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span>Đã khóa: <b className="text-slate-600">{stats.daKhoa}</b></span>
                  </>
                )}
              </div>
              <span className="text-xs text-slate-400">Tab / Enter → chuyển ô nhanh</span>
            </div>
            </div>
          </>
        )}
      </div>

      {/* ── Phòng info ──────────────────────────────────────────────────── */}
      {selectedPhong && (
        <p className="text-xs text-slate-400">
          Phòng: <span className="font-medium text-slate-600">{selectedPhong.ma_phong}</span>
          {selectedPhong.ten_phong && ` — ${selectedPhong.ten_phong}`}
        </p>
      )}
    </div>
  );
}
