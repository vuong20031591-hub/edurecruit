'use client';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Download, Lock, Search, RefreshCw, AlertTriangle, CheckCircle2, BarChart3 } from 'lucide-react';
import { PageHeader, Button, Spinner, SelectDropdown, Modal, toast } from '@/shared/components';
import { useTopbar } from '@/shared/hooks/useTopbar';
import { usePageFetch } from '@/shared/hooks/usePageFetch';
import type { DiemThiView, DiemThiStats, DiemThiCompletionSummary } from '@/modules/diemthi/types';
import { cn } from '@/shared/lib/cn';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhongOption { id: number; ma_phong: string; ten_phong: string | null; ten_vi_tri?: string | null; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcDTB(gk1: number | null, gk2: number | null): number | null {
  if (gk1 == null || gk2 == null) return null;
  return Math.round((gk1 + gk2) / 2 * 100) / 100;
}

function statusBadge(row: DiemThiView) {
  if (row.trang_thai_nhap === 'DaKhoa') return { label: 'Đã khóa', cls: 'bg-slate-100 text-slate-600 border-slate-300' };
  if (row.vang_thi) return { label: 'Vắng', cls: 'bg-orange-50 text-orange-600 border-orange-200' };
  if (row.bo_thi) return { label: 'Bỏ thi', cls: 'bg-red-50 text-red-600 border-red-200' };
  const dtb = calcDTB(row.diem_gk1, row.diem_gk2);
  if (dtb == null) return { label: 'Chưa nhập', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
  return { label: 'Đã nhập', cls: 'bg-green-50 text-green-700 border-green-200' };
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

  // Prefill state
  const [prefilling, setPrefilling] = useState(false);

  // Completion summary
  const [completion, setCompletion] = useState<DiemThiCompletionSummary | null>(null);
  const [completionOpen, setCompletionOpen] = useState(false);

  // Inline edit debounce refs
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  // Phân quyền
  const [canKhoa, setCanKhoa] = useState(false);
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

  // ─── Load phòng list theo kỳ ──────────────────────────────────────────────

  useEffect(() => {
    if (!kyId) {
      setPhongList([]);
      setSelectedPhongId(null);
      return;
    }
    let alive = true;
    fetch(`/api/phongthi?ky_tuyendung_id=${kyId}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => {
        if (!alive) return;
        const list: PhongOption[] = (j.data ?? []).map((p: { id: number; ma_phong: string; ten_phong: string | null; ten_vi_tri?: string | null }) => ({
          id: p.id,
          ma_phong: p.ma_phong,
          ten_phong: p.ten_phong,
          ten_vi_tri: p.ten_vi_tri,
        }));
        setPhongList(list);
        setSelectedPhongId(prev => (list.some(p => p.id === prev) ? prev : (list[0]?.id ?? null)));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [kyId]);

  // ─── Load điểm list + prefill ─────────────────────────────────────────────

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
    if (diemRes.error || diemStatsRes.error) toast.error('Không tải được dữ liệu điểm');
  }, [diemRes.error, diemStatsRes.error]);

  // ─── Prefill điểm ưu tiên khi chọn phòng ──────────────────────────────────

  useEffect(() => {
    if (!selectedPhongId) return;
    let alive = true;
    setPrefilling(true);
    fetch('/api/diemthi/uu-tien/prefill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phongthi_id: selectedPhongId }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (!alive) return;
        if (j && typeof j.updated === 'number' && j.updated > 0) {
          toast.success(`Đã tự điền điểm ưu tiên cho ${j.updated} thí sinh`);
          diemRes.refresh();
          diemStatsRes.refresh();
        }
      })
      .catch(() => {})
      .finally(() => { if (alive) setPrefilling(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhongId]);

  // ─── Fast Focus (SBD → Enter → highlight) ─────────────────────────────────

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

  // ─── Inline save (debounced 800ms) ─────────────────────────────────────────

  function handleDiemChange(thiSinhId: number, field: 'diem_gk1' | 'diem_gk2', raw: string) {
    const val = raw === '' ? null : parseFloat(raw);
    const currentRow = rows.find(r => r.thisinh_id === thiSinhId);
    if (currentRow?.trang_thai_nhap === 'DaKhoa' || !canNhap) return;

    setRows(prev => prev.map(r =>
      r.thisinh_id === thiSinhId ? { ...r, [field]: val } : r
    ));

    // Chỉ cảnh báo khi vừa nhập val mới (không null) và cả 2 ô đã có giá trị
    if (val !== null) {
      const checkRow = rows.find(r => r.thisinh_id === thiSinhId);
      if (checkRow) {
        const gk1 = field === 'diem_gk1' ? val : checkRow.diem_gk1;
        const gk2 = field === 'diem_gk2' ? val : checkRow.diem_gk2;
        if (gk1 != null && gk2 != null && Math.abs(gk1 - gk2) > 15) {
          toast.error(`SBD ${checkRow.sbd ?? checkRow.thisinh_id}: Chênh lệch GK1-GK2 = ${Math.abs(gk1 - gk2).toFixed(1)} > 15`);
        }
      }
    }

    const key = `${thiSinhId}-${field}`;
    clearTimeout(saveTimers.current[key]);
    setSavingIds(prev => new Set(prev).add(thiSinhId));
    setSavedIds(prev => { const s = new Set(prev); s.delete(thiSinhId); return s; });
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
          diemRes.refresh(); diemStatsRes.refresh();
        } else {
          const saved = await res.json();
          setRows(prev => prev.map(r => r.thisinh_id === saved.thisinh_id ? { ...r, ...saved } : r));
          setSavedIds(prev => new Set(prev).add(thiSinhId));
          setTimeout(() => setSavedIds(prev => { const s = new Set(prev); s.delete(thiSinhId); return s; }), 1500);
          if (selectedPhongId) {
            const sr = await fetch(`/api/diemthi?phongthi_id=${selectedPhongId}&stats=true`, { cache: 'no-store' });
            if (sr.ok) setStats(await sr.json());
          }
        }
      } catch {
        toast.error('Lỗi kết nối khi lưu điểm');
      } finally {
        setSavingIds(prev => { const s = new Set(prev); s.delete(thiSinhId); return s; });
      }
    }, 800);
  }

  // ─── Vắng/Bỏ thi toggle ───────────────────────────────────────────────────

  async function handleVangBoChange(thiSinhId: number, field: 'vang_thi' | 'bo_thi', checked: boolean) {
    const patch: Record<string, unknown> = { thisinh_id: thiSinhId, [field]: checked };
    if (field === 'vang_thi' && checked) patch.bo_thi = false;
    if (field === 'bo_thi' && checked) patch.vang_thi = false;

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
        if (selectedPhongId) {
          const sr = await fetch(`/api/diemthi?phongthi_id=${selectedPhongId}&stats=true`, { cache: 'no-store' });
          if (sr.ok) setStats(await sr.json());
        }
      }
    } catch {
      toast.error('Lỗi kết nối');
    }
  }

  // ─── Điểm ưu tiên (onBlur → PUT /api/diemthi/uu-tien) ───────────────────

  async function handleUuTienChange(thiSinhId: number, raw: string) {
    const val = parseFloat(raw);
    if (isNaN(val) || val < 0) return;

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

  // ─── Khóa điểm ────────────────────────────────────────────────────────────

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
        // Cập nhật completion summary nếu đang mở
        if (completion) loadCompletion();
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

  // ─── Tổng hợp hoàn tất ───────────────────────────────────────────────────

  const loadCompletion = useCallback(async () => {
    if (!kyId) return;
    try {
      const r = await fetch(`/api/diemthi?ky_tuyendung_id=${kyId}&completion=true`, { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json();
        setCompletion(data);
      }
    } catch {
      // ignore
    }
  }, [kyId]);

  async function handleXetDuyet() {
    if (!kyId) return;
    try {
      const r = await fetch('/api/xettuyen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ky_tuyendung_id: kyId }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        toast.success(`Đã xét duyệt: ${data.trung_tuyen_count ?? 0} trúng tuyển, ${data.du_phong_count ?? 0} dự phòng, ${data.khong_dat_count ?? 0} không đạt`);
        setCompletionOpen(false);
      } else {
        toast.error(data.error ?? 'Lỗi xét duyệt');
      }
    } catch {
      toast.error('Lỗi kết nối khi xét duyệt');
    }
  }

  // ─── Xuất danh sách ───────────────────────────────────────────────────────

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
          trang_thai: statusBadge(r).label,
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

  // ─── Derived ──────────────────────────────────────────────────────────────

  const progressPct = stats.tongThiSinh > 0
    ? Math.round((stats.daNhap + stats.daKhoa) / stats.tongThiSinh * 100)
    : 0;
  const selectedPhong = phongList.find(p => p.id === selectedPhongId);
  const isAllLocked = stats.tongThiSinh > 0 && stats.daKhoa === stats.tongThiSinh;

  const allRoomsReady = completion
    ? completion.phongs.length > 0 && completion.phongs.every(p => p.tong > 0 && p.tong === p.daKhoa)
    : false;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 p-5">
      <PageHeader
        title="Nhập điểm & Xét duyệt"
        description="Chấm điểm thi theo phòng thi — Quy trình ráp phách bảo mật"
      />

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        {/* Phòng thi */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">Phòng thi:</span>
          <SelectDropdown
            value={selectedPhongId ? String(selectedPhongId) : ''}
            onChange={v => setSelectedPhongId(v ? Number(v) : null)}
            options={phongList.map(p => ({
              value: String(p.id),
              label: [p.ma_phong, p.ten_vi_tri, p.ten_phong].filter(Boolean).join(' — '),
            }))}
            placeholder="Chọn phòng..."
            className="w-72"
            disabled={phongList.length === 0}
            aria-label="Phòng thi"
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
            {prefilling && (
              <span className="text-xs text-amber-600 italic">đang prefill ưu tiên…</span>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Tổng hợp hoàn tất */}
        <Button
          variant="outline"
          size="sm"
          leftIcon={<BarChart3 size={14} />}
          onClick={() => { setCompletionOpen(true); loadCompletion(); }}
          disabled={!kyId}
        >
          Tổng hợp hoàn tất
        </Button>

        {/* Xuất danh sách */}
        <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={handleExport} disabled={rows.length === 0}>
          Xuất danh sách
        </Button>

        {/* Khóa điểm */}
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

        <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />} onClick={() => { diemRes.refresh(); diemStatsRes.refresh(); }}>
          Làm mới
        </Button>
      </div>

      {/* ── Fast Focus Banner ─────────────────────────────────────────────── */}
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
          <div className="flex items-center justify-center py-16"><Spinner /></div>
        ) : !selectedPhongId ? (
          <div className="py-16 text-center text-slate-400 text-sm">Vui lòng chọn phòng thi</div>
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
                const isSaving = savingIds.has(row.thisinh_id);
                const isSaved = savedIds.has(row.thisinh_id);

                return (
                  <div
                    key={row.id}
                    id={`row-mobile-${row.thisinh_id}`}
                    className={cn(
                      'px-4 py-3 space-y-3 transition-colors duration-300',
                      isHighlighted && 'bg-blue-50 ring-2 ring-inset ring-blue-400',
                      isSaved && !isHighlighted && 'bg-emerald-50/60',
                      (row.vang_thi || row.bo_thi) && !isHighlighted && !isSaved && 'bg-orange-50/40',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded px-2 py-0.5 bg-[#1d293d] text-slate-200 text-xs font-bold font-mono">
                        {row.sbd ?? row.thisinh_id}
                      </span>
                      <span className="text-sm text-slate-600 truncate">{row.ho_ten}</span>
                      <span className={cn('ml-auto inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap',
                        isSaving ? 'bg-amber-50 text-amber-600 border-amber-200' : isSaved ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : badge.cls
                      )}>
                        {isSaving ? 'Đang lưu...' : isSaved ? '✓ Đã lưu' : badge.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">GK 1</label>
                        <input
                          type="number"
                          min={0} max={100} step={0.5}
                          disabled={isLocked}
                          value={row.diem_gk1 ?? ''}
                          placeholder="0–100"
                          className={cn(
                            'w-full rounded-lg border text-center outline-none transition-colors px-2 py-2.5 text-base',
                            isLocked ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              : isSaving ? 'bg-white border-amber-400 text-slate-800 ring-1 ring-amber-200'
                              : 'bg-white border-slate-200 text-slate-800 focus:border-brand-400 focus:ring-1 focus:ring-brand-200'
                          )}
                          onChange={e => handleDiemChange(row.thisinh_id, 'diem_gk1', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">GK 2</label>
                        <input
                          type="number"
                          min={0} max={100} step={0.5}
                          disabled={isLocked}
                          value={row.diem_gk2 ?? ''}
                          placeholder="0–100"
                          className={cn(
                            'w-full rounded-lg border text-center outline-none transition-colors px-2 py-2.5 text-base',
                            isLocked ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              : isSaving ? 'bg-amber-50 border-amber-300 text-slate-800'
                              : 'bg-white border-slate-200 text-slate-800 focus:border-brand-400 focus:ring-1 focus:ring-brand-200'
                          )}
                          onChange={e => handleDiemChange(row.thisinh_id, 'diem_gk2', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1 uppercase">ĐTB</label>
                        <div className={cn(
                          'w-full rounded-lg border text-center font-bold px-2 py-2.5 text-base',
                          dtb != null ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                        )}>
                          {dtb != null ? dtb.toFixed(2) : '—'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-sm text-slate-500">Điểm ưu tiên:</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        disabled={isLocked}
                        value={row.diem_uu_tien != null ? String(row.diem_uu_tien) : ''}
                        placeholder="—"
                        className={cn(
                          'w-16 rounded-lg border text-center text-sm outline-none transition-colors px-2 py-1.5',
                          isLocked ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-amber-50 border-amber-200 text-amber-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-100'
                        )}
                        onChange={() => {}}
                        onBlur={e => {
                          const raw = e.target.value.trim();
                          if (raw === '' || raw === String(row.diem_uu_tien ?? '')) return;
                          const num = parseFloat(raw);
                          if (!isNaN(num) && num >= 0) handleUuTienChange(row.thisinh_id, raw);
                          else e.target.value = row.diem_uu_tien != null ? String(row.diem_uu_tien) : '';
                        }}
                      />
                      <div className="ml-auto flex items-center">
                        <label className={cn('flex items-center gap-1.5 cursor-pointer text-sm select-none',
                          isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:text-orange-600')}>
                          <input type="checkbox" disabled={isLocked} checked={!!row.vang_thi}
                            onChange={e => handleVangBoChange(row.thisinh_id, 'vang_thi', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 accent-orange-500" />
                          <span className="text-slate-500">Vắng</span>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop Grid ── */}
            <div className="hidden lg:block overflow-x-auto">
              <div className="grid bg-[#1d293d]" style={{ gridTemplateColumns: '110px 1fr 90px 90px 90px 90px 100px 130px' }}>
                <div className="px-4 py-3"><span className="text-xs font-semibold tracking-wide text-slate-300 uppercase">SBD</span></div>
                <div className="px-4 py-3">
                  <div className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Họ và Tên</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Theo danh sách phòng thi</div>
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
                  <div className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Điểm ưu tiên</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Điểm cộng</div>
                </div>
                <div className="px-3 py-3">
                  <div className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Vắng</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Đánh dấu</div>
                </div>
                <div className="px-4 py-3"><span className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Kết quả</span></div>
              </div>

              {rows.map((row, idx) => {
                const isHighlighted = highlightId === row.thisinh_id;
                const isLocked = row.trang_thai_nhap === 'DaKhoa' || !canNhap;
                const isSaving = savingIds.has(row.thisinh_id);
                const isSaved = savedIds.has(row.thisinh_id);
                const dtb = calcDTB(row.diem_gk1, row.diem_gk2);
                const badge = isSaving
                  ? { label: 'Đang lưu...', cls: 'bg-amber-50 text-amber-600 border-amber-200' }
                  : isSaved
                    ? { label: 'Đã lưu ✓', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                    : statusBadge(row);

                return (
                  <div
                    key={row.id}
                    id={`row-${row.thisinh_id}`}
                    className={cn(
                      'grid border-b border-slate-100 transition-colors duration-300',
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60',
                      isHighlighted && 'bg-blue-50 ring-2 ring-inset ring-blue-400',
                      isSaved && !isHighlighted && 'bg-emerald-50/40',
                      (row.vang_thi || row.bo_thi) && !isHighlighted && !isSaved && 'bg-orange-50/40',
                    )}
                    style={{ gridTemplateColumns: '110px 1fr 90px 90px 90px 90px 100px 130px' }}
                  >
                    <div className="px-4 py-3 flex items-center">
                      <span className="inline-flex items-center rounded px-2 py-0.5 bg-[#1d293d] text-slate-200 text-xs font-bold font-mono">
                        {row.sbd ?? row.thisinh_id}
                      </span>
                    </div>
                    <div className="px-4 py-3 flex items-center">
                      <span className="text-sm text-slate-600">{row.ho_ten}</span>
                    </div>
                    <div className="px-3 py-2.5 flex items-center">
                      <input type="number" min={0} max={100} step={0.5} disabled={isLocked}
                        value={row.diem_gk1 ?? ''} placeholder="0–100"
                        className={cn('w-full rounded-lg border text-center text-sm outline-none transition-colors px-2 py-1.5',
                          isLocked ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : isSaving ? 'bg-amber-50 border-amber-300 text-slate-800'
                            : 'bg-white border-slate-200 text-slate-800 focus:border-brand-400 focus:ring-1 focus:ring-brand-200')}
                        onChange={e => handleDiemChange(row.thisinh_id, 'diem_gk1', e.target.value)}
                      />
                    </div>
                    <div className="px-3 py-2.5 flex items-center">
                      <input type="number" min={0} max={100} step={0.5} disabled={isLocked}
                        value={row.diem_gk2 ?? ''} placeholder="0–100"
                        className={cn('w-full rounded-lg border text-center text-sm outline-none transition-colors px-2 py-1.5',
                          isLocked ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : isSaving ? 'bg-amber-50 border-amber-300 text-slate-800'
                            : 'bg-white border-slate-200 text-slate-800 focus:border-brand-400 focus:ring-1 focus:ring-brand-200')}
                        onChange={e => handleDiemChange(row.thisinh_id, 'diem_gk2', e.target.value)}
                      />
                    </div>
                    <div className="px-3 py-2.5 flex items-center">
                      <div className={cn('w-full rounded-lg border text-center text-sm font-bold px-2 py-1.5',
                        dtb != null ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : 'bg-slate-100 border-slate-200 text-slate-400')}>
                        {dtb != null ? dtb.toFixed(2) : '—'}
                      </div>
                    </div>
                    <div className="px-3 py-2.5 flex items-center">
                      <input type="text" inputMode="decimal" disabled={isLocked}
                        value={row.diem_uu_tien != null ? String(row.diem_uu_tien) : ''}
                        placeholder="—"
                        onChange={() => {}}
                        className={cn('w-full rounded-lg border text-center text-sm outline-none transition-colors px-2 py-1.5',
                          isLocked ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-amber-50 border-amber-200 text-amber-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-100')}
                        onBlur={e => {
                          const raw = e.target.value.trim();
                          if (raw === '' || raw === String(row.diem_uu_tien ?? '')) return;
                          const num = parseFloat(raw);
                          if (!isNaN(num) && num >= 0) handleUuTienChange(row.thisinh_id, raw);
                          else e.target.value = row.diem_uu_tien != null ? String(row.diem_uu_tien) : '';
                        }}
                      />
                    </div>
                    <div className="px-3 py-2.5 flex items-center">
                      <label className={cn('flex items-center gap-1 cursor-pointer text-xs select-none',
                        isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:text-orange-600')}>
                        <input type="checkbox" disabled={isLocked} checked={!!row.vang_thi}
                          onChange={e => handleVangBoChange(row.thisinh_id, 'vang_thi', e.target.checked)}
                          className="rounded border-slate-300 accent-orange-500" />
                        <span className="text-slate-500">Vắng</span>
                      </label>
                    </div>
                    <div className="px-4 py-3 flex items-center">
                      {isSaving ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs bg-amber-50 text-amber-600 border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Đang lưu
                        </span>
                      ) : (
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                          isSaved && badge.label === 'Đã nhập'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                            : badge.cls)}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

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

      {selectedPhong && (
        <p className="text-xs text-slate-400">
          Phòng: <span className="font-medium text-slate-600">{selectedPhong.ma_phong}</span>
          {selectedPhong.ten_phong && ` — ${selectedPhong.ten_phong}`}
        </p>
      )}

      {/* ── Modal tổng hợp hoàn tất ────────────────────────────────────────── */}
      <Modal
        open={completionOpen}
        onClose={() => setCompletionOpen(false)}
        title="Tổng hợp hoàn tất nhập điểm"
        size="xl"
      >
        {!completion ? (
          <div className="flex items-center justify-center py-10"><Spinner /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs text-slate-500">Tổng TS</div>
                <div className="text-xl font-bold">{completion.overall.tongThiSinh}</div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-xs text-emerald-700">Đã nhập</div>
                <div className="text-xl font-bold text-emerald-700">{completion.overall.daNhap}</div>
              </div>
              <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
                <div className="text-xs text-slate-600">Đã khóa</div>
                <div className="text-xl font-bold text-slate-700">{completion.overall.daKhoa}</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="text-xs text-amber-700">Chưa nhập</div>
                <div className="text-xl font-bold text-amber-700">{completion.overall.chuaNhap}</div>
              </div>
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                <div className="text-xs text-orange-700">Vắng thi</div>
                <div className="text-xl font-bold text-orange-700">{completion.overall.vang}</div>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="text-xs text-red-700">Bỏ thi</div>
                <div className="text-xl font-bold text-red-700">{completion.overall.bo}</div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Phòng</th>
                    <th className="px-3 py-2 text-right">Tổng</th>
                    <th className="px-3 py-2 text-right">Đã nhập</th>
                    <th className="px-3 py-2 text-right">Đã khóa</th>
                    <th className="px-3 py-2 text-right">Chưa nhập</th>
                    <th className="px-3 py-2 text-right">Vắng</th>
                    <th className="px-3 py-2 text-right">Bỏ</th>
                    <th className="px-3 py-2 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {completion.phongs.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400">Chưa có phòng thi nào trong kỳ</td></tr>
                  )}
                  {completion.phongs.map(p => {
                    const done = p.tong > 0 && p.tong === p.daKhoa;
                    return (
                      <tr key={p.phongthi_id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-700">
                          {p.ma_phong}{p.ten_phong ? ` — ${p.ten_phong}` : ''}
                        </td>
                        <td className="px-3 py-2 text-right">{p.tong}</td>
                        <td className="px-3 py-2 text-right text-emerald-700">{p.daNhap}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{p.daKhoa}</td>
                        <td className={cn('px-3 py-2 text-right', p.chuaNhap > 0 ? 'text-amber-700 font-semibold' : 'text-slate-400')}>
                          {p.chuaNhap}
                        </td>
                        <td className="px-3 py-2 text-right text-orange-700">{p.vang}</td>
                        <td className="px-3 py-2 text-right text-red-700">{p.bo}</td>
                        <td className="px-3 py-2 text-center">
                          {done ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <CheckCircle2 size={14} /> Hoàn tất
                            </span>
                          ) : p.tong === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <span className="text-amber-700">Còn {p.chuaNhap} chưa nhập</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <div className="text-sm">
                {allRoomsReady ? (
                  <span className="text-emerald-700 font-medium">
                    Tất cả phòng đã hoàn tất — có thể chạy xét duyệt kết quả.
                  </span>
                ) : (
                  <span className="text-amber-700">
                    Còn phòng chưa hoàn tất — vui lòng khóa điểm hết các phòng trước khi xét duyệt.
                  </span>
                )}
              </div>
              <Button
                variant="primary"
                disabled={!allRoomsReady}
                onClick={handleXetDuyet}
              >
                Xét duyệt kết quả
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
