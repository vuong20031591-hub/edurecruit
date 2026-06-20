'use client';
import { Fragment, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Loader2, CheckCheck, ChevronDown, ChevronRight, Mail, Briefcase, GraduationCap, Users, Clock } from 'lucide-react';
import { PageHeader, Button, toast } from '@/shared/components';
import { useTopbar } from '@/shared/hooks/useTopbar';
import { formatDate } from '@/shared/lib/format';

// ============================================================================
// Types — match response từ /api/hosso/preview-import
// ============================================================================
type PreviewStatus = 'ok' | 'warning' | 'error';
interface PreviewRow {
  row: number;
  ho: string | null;
  ten: string | null;
  ho_ten: string | null;
  ngay_sinh: string | null;
  gioi_tinh: string | null;
  cccd: string | null;
  dien_thoai: string | null;
  email: string | null;
  vi_tri_ten: string | null;
  ten_don_vi: string | null;
  co_dang_ky_nv2: number;
  so_nguoi_than: number;
  so_van_bang: number;
  so_qtc: number;
  raw: Record<string, unknown>;
  status: PreviewStatus;
  message: string | null;
}
interface PreviewResponse {
  format: 'google-form' | 'ds-du-thi';
  totalRows: number;
  summary: { ok: number; warning: number; error: number };
  rows: PreviewRow[];
  totalSheetRows: number;
  skippedHeaderRows: number;
  parseWarnings: string[];
}

interface ImportResult {
  success: number;
  errors: Array<{ row: number; message: string }>;
}

const STATUS_BADGE: Record<PreviewStatus, { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
  ok: { label: 'OK', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle },
  warning: { label: 'Cảnh báo', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: AlertCircle },
  error: { label: 'Lỗi', bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: AlertCircle }
};

// ============================================================================
// FIELD_GROUPS — Mapping từ key parser → label tiếng Việt (đầy đủ 63 cột)
// Thứ tự nhóm khớp với thứ tự xuất hiện trong file mẫu Google Form
// ============================================================================
type FieldGroup = {
  title: string;
  icon: React.ReactNode;
  fields: Array<{ key: string; label: string }>;
};

const FIELD_GROUPS: FieldGroup[] = [
  {
    title: '1. Thông tin cá nhân',
    icon: <Users size={12} />,
    fields: [
      { key: 'ngay_nop_phieu', label: 'Dấu thời gian' },
      { key: 'email', label: 'Địa chỉ email' },
      { key: 'ho_ten', label: 'Họ và tên' },
      { key: 'ngay_sinh', label: 'Ngày, tháng, năm sinh' },
      { key: 'gioi_tinh', label: 'Giới tính' },
      { key: 'dan_toc', label: 'Dân tộc' },
      { key: 'ton_giao', label: 'Tôn giáo' },
      { key: 'suc_khoe', label: 'Tình trạng sức khỏe' },
      { key: 'chieu_cao', label: 'Chiều cao' },
      { key: 'can_nang', label: 'Cân nặng' }
    ]
  },
  {
    title: '2. CCCD/CMND',
    icon: <Briefcase size={12} />,
    fields: [
      { key: 'cccd', label: 'Số CMND/CCCD' },
      { key: 'ngay_cap_cccd', label: 'Ngày cấp' },
      { key: 'noi_cap_cccd', label: 'Nơi cấp' }
    ]
  },
  {
    title: '3. Liên lạc',
    icon: <Mail size={12} />,
    fields: [
      { key: 'dien_thoai', label: 'Số điện thoại di động' },
      { key: 'ho_khau_thuong_tru', label: 'Quê quán' },
      { key: 'cho_o_hien_nay', label: 'Chỗ ở hiện nay (để báo tin)' },
      { key: 'trinh_do_van_hoa', label: 'Trình độ văn hóa' }
    ]
  },
  {
    title: '4. Trình độ chuyên môn',
    icon: <GraduationCap size={12} />,
    fields: [
      { key: 'trinh_do_chuyen_mon', label: 'Trình độ chuyên môn' },
      { key: 'ten_truong_dao_tao', label: 'Tên trường/cơ sở đào tạo (Mục 1)' },
      { key: 'ngay_cap_van_bang', label: 'Ngày cấp văn bằng (Mục 1)' },
      { key: 'so_hieu_van_bang', label: 'Số hiệu văn bằng (Mục 1)' },
      { key: 'chuyen_nganh', label: 'Chuyên ngành đào tạo (Mục 1)' },
      { key: 'hinh_thuc_dao_tao', label: 'Hình thức đào tạo (Mục 1)' },
      { key: 'nganh_dao_tao', label: 'Ngành đào tạo (Mục 1)' },
      { key: 'xep_loai_bang', label: 'Xếp loại bằng/chứng chỉ (Mục 1)' }
    ]
  },
  {
    title: '5. Văn bằng 2 (Mục 2)',
    icon: <GraduationCap size={12} />,
    fields: [
      { key: 'vb_2_ten_truong', label: 'Tên trường (Mục 2)' },
      { key: 'vb_2_ngay_cap', label: 'Ngày cấp (Mục 2)' },
      { key: 'vb_2_trinh_do', label: 'Trình độ VB (Mục 2)' },
      { key: 'vb_2_so_hieu', label: 'Số hiệu VB (Mục 2)' },
      { key: 'vb_2_chuyen_nganh', label: 'Chuyên ngành (Mục 2)' },
      { key: 'vb_2_hinh_thuc', label: 'Hình thức (Mục 2)' },
      { key: 'vb_2_nganh', label: 'Ngành (Mục 2)' },
      { key: 'vb_2_xep_loai', label: 'Xếp loại (Mục 2)' }
    ]
  },
  {
    title: '6. Quá trình công tác',
    icon: <Clock size={12} />,
    fields: [
      { key: 'qtc_1_tu_ngay', label: 'Từ ngày (QTC 1)' },
      { key: 'qtc_1_den_ngay', label: 'Đến ngày (QTC 1)' },
      { key: 'qtc_1_co_quan', label: 'Cơ quan (QTC 1)' },
      { key: 'qtc_2_tu_ngay', label: 'Từ ngày (QTC 2)' },
      { key: 'qtc_2_den_ngay', label: 'Đến ngày (QTC 2)' },
      { key: 'qtc_2_co_quan', label: 'Cơ quan (QTC 2)' }
    ]
  },
  {
    title: '7. Người thân',
    icon: <Users size={12} />,
    fields: [
      { key: 'nt_1_moi_quan_he', label: 'Mối quan hệ (NT 1)' },
      { key: 'nt_1_ho_ten', label: 'Họ tên (NT 1)' },
      { key: 'nt_1_ngay_sinh', label: 'Ngày sinh (NT 1)' },
      { key: 'nt_1_thong_tin', label: 'Thông tin khác (NT 1)' },
      { key: 'nt_2_moi_quan_he', label: 'Mối quan hệ (NT 2)' },
      { key: 'nt_2_ho_ten', label: 'Họ tên (NT 2)' },
      { key: 'nt_2_ngay_sinh', label: 'Ngày sinh (NT 2)' },
      { key: 'nt_2_thong_tin', label: 'Thông tin khác (NT 2)' },
      { key: 'nt_3_moi_quan_he', label: 'Mối quan hệ (NT 3)' },
      { key: 'nt_3_ho_ten', label: 'Họ tên (NT 3)' },
      { key: 'nt_3_ngay_sinh', label: 'Ngày sinh (NT 3)' },
      { key: 'nt_3_thong_tin', label: 'Thông tin khác (NT 3)' }
    ]
  },
  {
    title: '8. Đăng ký dự tuyển',
    icon: <Briefcase size={12} />,
    fields: [
      { key: 'vi_tri_ten', label: 'Vị trí việc làm dự tuyển (NV1)' },
      { key: 'ten_don_vi', label: 'Đơn vị dự tuyển (NV1)' },
      { key: 'co_dang_ky_nv2', label: 'Có đăng ký NV2?' },
      { key: 'vi_tri_ten_2', label: 'Vị trí việc làm dự tuyển 2' },
      { key: 'ten_don_vi_2', label: 'Đơn vị dự tuyển 2' }
    ]
  },
  {
    title: '9. Ngoại ngữ & Khác',
    icon: <Mail size={12} />,
    fields: [
      { key: 'ngoai_ngu', label: 'Đăng ký dự thi ngoại ngữ' },
      { key: 'ngoai_ngu_khac', label: 'Ngoại ngữ khác theo yêu cầu vị trí' },
      { key: 'mien_thi_nn', label: 'Miễn thi ngoại ngữ do' },
      { key: 'doi_tuong_uu_tien', label: 'Đối tượng ưu tiên' },
      { key: 'cam_doan_thong_tin', label: 'Cam đoan thông tin' }
    ]
  }
];

function RowDetail({ r }: { r: PreviewRow }) {
  // Đếm field có giá trị
  // Các field date — format dd/MM/yyyy khi hiển thị
  const DATE_KEYS = new Set([
    'ngay_nop_phieu', 'ngay_cap_cccd', 'ngay_cap_van_bang', 'vb_2_ngay_cap',
    'qtc_1_tu_ngay', 'qtc_1_den_ngay', 'qtc_2_tu_ngay', 'qtc_2_den_ngay',
    'nt_1_ngay_sinh', 'nt_2_ngay_sinh', 'nt_3_ngay_sinh'
  ]);

  const renderGroup = (g: FieldGroup) => {
    const items = g.fields.map((f) => {
      const v = r.raw[f.key];
      const text = v === null || v === undefined || v === '' ? null : String(v);
      const display = text && DATE_KEYS.has(f.key) ? formatDate(text, 'dd/MM/yyyy') : text;
      return { ...f, text: display };
    });
    // Ẩn nhóm nếu tất cả field đều rỗng (trừ nhóm đăng ký + cá nhân chính)
    const allEmpty = items.every((i) => i.text === null);
    if (allEmpty && !['1. Thông tin cá nhân', '2. CCCD/CMND', '8. Đăng ký dự tuyển'].includes(g.title)) {
      return null;
    }
    return (
      <div key={g.title} className="rounded-md border border-slate-200 bg-slate-50/30 p-2.5">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          {g.icon} {g.title}
        </div>
        <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <div key={i.key} className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">{i.label}</span>
              <span className="break-words text-xs text-slate-800">
                {i.text ?? <span className="text-slate-400">—</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2.5">
      {FIELD_GROUPS.map(renderGroup)}

      {r.message && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          <strong>Lưu ý:</strong> {r.message}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Page
// ============================================================================
export default function ImportExcelPage() {
  const router = useRouter();
  const { data: topbar } = useTopbar();
  const kyId = topbar.ky?.id ?? null;
  const kyName = topbar.ky?.ten_ky ?? null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (row: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(row)) {
        // Đã expand → thu gọn
        next.delete(row);
      } else {
        // Accordion: chỉ giữ 1 row expand tại 1 thời điểm
        next.clear();
        next.add(row);
      }
      return next;
    });
  };
  const collapseAll = () => setExpandedRows(new Set());

  // ---- File handling ----
  function handleFileSelect(f: File) {
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      toast.error('Chỉ hỗ trợ file Excel (.xlsx, .xls)');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File quá lớn (tối đa 10MB)');
      return;
    }
    setFile(f);
    setPreview(null);
    setImportResult(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }
  function handleDragLeave() {
    setDragging(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  }

  function resetAll() {
    setFile(null);
    setPreview(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ---- Preview (dry-run) ----
  const runPreview = useCallback(async (f: File) => {
    if (!kyId) {
      toast.warning('Chưa xác định được kỳ tuyển dụng');
      return;
    }
    setPreviewing(true);
    setPreview(null);
    try {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('ky_tuyendung_id', String(kyId));
      const res = await fetch('/api/hosso/preview-import', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.message || `HTTP ${res.status}`);
      }
      const data = json as PreviewResponse;
      setPreview(data);
      const s = data.summary;
      toast.info(`Đọc xong ${data.totalRows} dòng: ${s.ok} OK · ${s.warning} cảnh báo · ${s.error} lỗi`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi preview');
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  }, [kyId]);

  // Auto-preview khi file + kyId sẵn sàng
  useEffect(() => {
    if (file && kyId && !previewing && !preview && !importResult) {
      runPreview(file);
    }
  }, [file, kyId, preview, previewing, importResult, runPreview]);

  // ---- Confirm import (chỉ insert OK + warning) ----
  async function handleConfirmImport() {
    if (!file || !kyId) return;
    if (!preview) return;
    const importable = preview.summary.ok + preview.summary.warning;
    if (importable === 0) {
      toast.error('Không có hồ sơ hợp lệ để import');
      return;
    }
    if (preview.summary.error > 0) {
      const ok = window.confirm(
        `Có ${preview.summary.error} dòng lỗi sẽ bị bỏ qua.\n` +
        `Chỉ ${importable} dòng hợp lệ sẽ được import. Tiếp tục?`
      );
      if (!ok) return;
    }

    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('ky_tuyendung_id', String(kyId));
      const res = await fetch('/api/hosso/import', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`);
      const result = json as ImportResult;
      setImportResult(result);
      if (result.success > 0) {
        toast.success(`Import thành công ${result.success} hồ sơ`);
      } else {
        toast.error('Không import được hồ sơ nào');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi import');
    } finally {
      setImporting(false);
    }
  }

  // ---- Helpers ----
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  function formatFormatLabel(fmt: string | undefined) {
    if (fmt === 'google-form') return 'Phiếu đăng ký (Google Form)';
    if (fmt === 'ds-du-thi') return 'DS DU THI (Sở GDĐT)';
    return '';
  }

  // ---- Render ----
  const importableCount = preview ? preview.summary.ok + preview.summary.warning : 0;

  return (
    <div>
      <PageHeader
        title="Import hồ sơ từ Excel"
        description="Tải lên file Excel danh sách thí sinh đăng ký dự tuyển"
      />

      <div className="mx-auto max-w-4xl space-y-6 p-5">
        {/* Kỳ tuyển dụng */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-700">Kỳ tuyển dụng:</span>
            {kyName ? (
              <span className="rounded-md bg-brand-50 px-2 py-0.5 text-sm font-medium text-brand-700">
                {kyName}
              </span>
            ) : (
              <span className="text-slate-400">Đang tải...</span>
            )}
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={[
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors',
            dragging
              ? 'border-brand-400 bg-brand-50'
              : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50',
          ].join(' ')}
        >
          <FileSpreadsheet size={40} className={dragging ? 'text-brand-500' : 'text-slate-400'} />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">
              Kéo thả file vào đây hoặc <span className="text-brand-600">click để chọn</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">Hỗ trợ .xlsx · Tối đa 10MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>

        {/* File đã chọn + parse info */}
        {file && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={18} className="shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
              </div>
              {previewing && (
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Loader2 size={14} className="animate-spin" />
                  Đang đọc &amp; kiểm tra...
                </span>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); resetAll(); }}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Xóa file"
              >
                <X size={15} />
              </button>
            </div>
            {preview && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                  Format: {formatFormatLabel(preview.format)}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
                  Tổng sheet: {preview.totalSheetRows} dòng
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
                  Bỏ header: {preview.skippedHeaderRows}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Preview table */}
        {preview && (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                Xem trước dữ liệu
                <span className="ml-2 text-xs font-normal text-slate-500">
                  (click vào dòng để xem chi tiết)
                </span>
              </h3>
              <div className="flex items-center gap-3 text-xs">
                {expandedRows.size > 0 && (
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="text-brand-600 hover:underline"
                  >
                    Thu gọn
                  </button>
                )}
                <span className="text-slate-500">Hiển thị tối đa 50 dòng đầu tiên</span>
              </div>
            </div>

            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <CheckCircle size={13} /> {preview.summary.ok} OK
              </span>
              {preview.summary.warning > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                  <AlertCircle size={13} /> {preview.summary.warning} Cảnh báo
                </span>
              )}
              {preview.summary.error > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                  <AlertCircle size={13} /> {preview.summary.error} Lỗi
                </span>
              )}
            </div>

            {/* Parse warnings */}
            {preview.parseWarnings && preview.parseWarnings.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                {preview.parseWarnings.map((w, i) => (
                  <p key={i}>• {w}</p>
                ))}
              </div>
            )}

            {/* Table */}
            <div className="max-h-[40rem] overflow-auto rounded-md border border-slate-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                  <tr className="text-left text-slate-600">
                    <th className="w-8 px-1 py-2"></th>
                    <th className="w-10 px-2 py-2 text-center">#</th>
                    <th className="min-w-[140px] px-2 py-2">Họ tên</th>
                    <th className="px-2 py-2">Ngày sinh</th>
                    <th className="px-2 py-2">GT</th>
                    <th className="px-2 py-2">CCCD</th>
                    <th className="px-2 py-2">SĐT</th>
                    <th className="px-2 py-2">Email</th>
                    <th className="min-w-[180px] px-2 py-2">Vị trí</th>
                    <th className="min-w-[160px] px-2 py-2">Đơn vị</th>
                    <th className="w-40 px-2 py-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 50).map((r) => {
                    const badge = STATUS_BADGE[r.status];
                    const Icon = badge.icon;
                    const isExpanded = expandedRows.has(r.row);
                    return (
                      <Fragment key={r.row}>
                        <tr
                          onClick={() => toggleRow(r.row)}
                          className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-1 py-1.5 text-center text-slate-400">
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </td>
                          <td className="px-2 py-1.5 text-center text-slate-500">{r.row}</td>
                          <td className="px-2 py-1.5 font-medium text-slate-800">
                            {r.ho_ten ?? <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-2 py-1.5 text-slate-600">
                            {r.ngay_sinh ? formatDate(r.ngay_sinh, 'dd/MM/yyyy') : '—'}
                          </td>
                          <td className="px-2 py-1.5 text-slate-600">{r.gioi_tinh ?? '—'}</td>
                          <td className="px-2 py-1.5 text-slate-600" title={r.cccd ?? ''}>
                            {r.cccd ?? <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-2 py-1.5 text-slate-600">{r.dien_thoai ?? <span className="text-slate-400">—</span>}</td>
                          <td className="px-2 py-1.5 text-slate-600" title={r.email ?? ''}>
                            {r.email ? (
                              <a href={`mailto:${r.email}`} className="text-brand-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                                {r.email}
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-slate-600">
                            {r.vi_tri_ten ?? <span className="text-slate-400">—</span>}
                            {r.co_dang_ky_nv2 === 1 && (
                              <span className="ml-1 rounded bg-blue-50 px-1 text-[10px] font-medium text-blue-600">NV2</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-slate-600" title={r.ten_don_vi ?? ''}>
                            {r.ten_don_vi ?? <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-2 py-1.5">
                            <div className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                              <Icon size={10} />
                              {badge.label}
                            </div>
                            {r.message && (
                              <p className="mt-0.5 text-[10px] leading-tight text-slate-500" title={r.message}>
                                {r.message.length > 60 ? r.message.slice(0, 60) + '…' : r.message}
                              </p>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-t border-slate-200 bg-white">
                            <td colSpan={11} className="px-4 py-3">
                              <RowDetail r={r} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              {preview.rows.length > 50 && (
                <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
                  + {preview.rows.length - 50} dòng còn lại không hiển thị
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hướng dẫn */}
        {!file && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="mb-2 font-medium text-amber-800">Định dạng file Excel được hỗ trợ:</p>
            <ol className="list-inside list-decimal space-y-1 text-amber-700">
              <li>
                <strong>Phiếu đăng ký từ Google Form</strong> — sheet "Câu trả lời biểu mẫu 1":
                mỗi dòng là 1 thí sinh, có sẵn vị trí + đơn vị.
              </li>
              <li>
                <strong>DS DU THI (Sở GDĐT)</strong> — sheet "DS DU THI":
                nhóm thí sinh phân theo vị trí (dòng tiêu đề nhóm) sẽ tự nhận diện.
              </li>
              <li>
                Đã tạo đầy đủ <strong>Vị trí tuyển dụng</strong> và <strong>Đơn vị dự tuyển</strong> trong kỳ này.
              </li>
            </ol>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft size={14} />}
            onClick={() => router.push('/dashboard/ho-so')}
          >
            Quay lại
          </Button>
          <div className="flex items-center gap-2">
            {preview && !importResult && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CheckCheck size={14} />}
                onClick={handleConfirmImport}
                loading={importing}
                disabled={importableCount === 0 || importing}
              >
                {importing
                  ? 'Đang import...'
                  : importableCount > 0
                    ? `Xác nhận import ${importableCount} hồ sơ`
                    : 'Không có hồ sơ hợp lệ'}
              </Button>
            )}
            {importResult && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push('/dashboard/ho-so')}
              >
                Xem danh sách hồ sơ →
              </Button>
            )}
          </div>
        </div>

        {/* Import result (chỉ errors) */}
        {importResult && importResult.errors.length > 0 && (
          <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-red-800">
              Import thành công {importResult.success} hồ sơ, {importResult.errors.length} lỗi
            </h3>
            <div className="max-h-48 overflow-y-auto rounded-md border border-red-200 bg-white">
              {importResult.errors.map((e, i) => (
                <div
                  key={i}
                  className="flex gap-2 border-b border-red-100 px-3 py-2 text-xs last:border-b-0"
                >
                  <span className="shrink-0 font-medium text-red-500">Dòng {e.row}:</span>
                  <span className="text-red-700">{e.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
