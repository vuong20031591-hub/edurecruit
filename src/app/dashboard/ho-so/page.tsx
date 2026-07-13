'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Upload, Download, RefreshCw, FileText, AlertCircle, Trash2 } from 'lucide-react';
import { PageHeader, Button, Spinner, EmptyState, Modal, toast } from '@/shared/components';
import { useTopbar } from '@/shared/hooks/useTopbar';
import { usePageFetch } from '@/shared/hooks/usePageFetch';
import { FilterBar, type ViTriOption, type DonViOption, type KyOption } from './_components/FilterBar';
import { ThiSinhTable, type ThiSinhAction } from './_components/ThiSinhTable';
import { Pagination } from './_components/Pagination';
import type { PaginatedThiSinh, ThiSinhFilter, ThiSinhView } from '@/modules/hosso/types';
import { TrangThaiHoSoLabel, KetQuaLabel, type TrangThaiHoSoValue } from '@/shared/constants/enums';

const DEFAULT_FILTER: ThiSinhFilter = {
  page: 1,
  pageSize: 50,
  sortBy: 'ho_ten',
  sortDir: 'asc'
};

const EMPTY_DATA: PaginatedThiSinh = { data: [], total: 0, page: 1, pageSize: 50 };

function isViTriList(value: unknown): value is ViTriOption[] {
  return Array.isArray(value) && value.every((v) => v && typeof v === 'object' && 'id' in v && 'mon' in v);
}
function isDonViList(value: unknown): value is DonViOption[] {
  return Array.isArray(value) && value.every((v) => v && typeof v === 'object' && 'id' in v && 'ten_don_vi' in v);
}

function buildQuery(filter: ThiSinhFilter, kyId: number | null): string {
  const sp = new URLSearchParams();
  if (kyId != null) sp.set('ky_tuyendung_id', String(kyId));
  if (filter.search) sp.set('search', filter.search);
  if (filter.trang_thai) {
    const tt = filter.trang_thai;
    sp.set('trang_thai', Array.isArray(tt) ? tt.join(',') : tt);
  }
  if (filter.vi_tri_id != null) sp.set('vi_tri_id', String(filter.vi_tri_id));
  if (filter.don_vi_id != null) sp.set('don_vi_id', String(filter.don_vi_id));
  if (filter.ngay_nop_from) sp.set('ngay_nop_from', filter.ngay_nop_from);
  if (filter.ngay_nop_to) sp.set('ngay_nop_to', filter.ngay_nop_to);
  sp.set('page', String(filter.page ?? 1));
  sp.set('pageSize', String(filter.pageSize ?? 50));
  sp.set('sortBy', filter.sortBy ?? 'ho_ten');
  sp.set('sortDir', filter.sortDir ?? 'asc');
  return sp.toString();
}

export default function HoSoListPage() {
  const router = useRouter();
  const { data: topbar } = useTopbar();
  const kyId = topbar.ky?.id ?? null;

  const [kyList, setKyList] = useState<KyOption[]>([]);
  const [selectedKyId, setSelectedKyId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/ky-tuyendung')
      .then(r => r.json())
      .then(j => setKyList(j.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (kyId && selectedKyId === null) {
      setSelectedKyId(kyId);
    }
  }, [kyId, selectedKyId]);

  const [filter, setFilter] = useState<ThiSinhFilter>(DEFAULT_FILTER);
  const [data, setData] = useState<PaginatedThiSinh>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viTriList, setViTriList] = useState<ViTriOption[]>([]);
  const [donViList, setDonViList] = useState<DonViOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  // Phân quyền UI
  const [quyen, setQuyen] = useState<string>('');
  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(me => { if (me?.quyen) setQuyen(me.quyen); })
      .catch(() => {});
  }, []);
  const canCreate = quyen === 'ADMIN' || quyen === 'TO_NHAP_HOSO';
  const canDelete = quyen === 'ADMIN';
  const canExport = quyen === 'ADMIN' || quyen === 'LANH_DAO';

  // vitri/donvi options
  const vitriOptionsUrl = useMemo(
    () => (selectedKyId ? `/api/vitri?all=true&ky_tuyendung_id=${selectedKyId}` : null),
    [selectedKyId]
  );
  const donviOptionsUrl = useMemo(
    () => (selectedKyId ? `/api/donvi?all=true&ky_tuyendung_id=${selectedKyId}` : null),
    [selectedKyId]
  );
  const vitriOptsRes = usePageFetch<unknown>(vitriOptionsUrl, { fallback: null as unknown });
  const donviOptsRes = usePageFetch<unknown>(donviOptionsUrl, { fallback: null as unknown });

  useEffect(() => {
    const arr = Array.isArray(vitriOptsRes.data) ? vitriOptsRes.data : ((vitriOptsRes.data as { data?: unknown })?.data ?? []);
    if (isViTriList(arr)) setViTriList(arr);
  }, [vitriOptsRes.data]);

  useEffect(() => {
    const arr = Array.isArray(donviOptsRes.data) ? donviOptsRes.data : ((donviOptsRes.data as { data?: unknown })?.data ?? []);
    if (isDonViList(arr)) setDonViList(arr);
  }, [donviOptsRes.data]);

  // List
  const listUrl = useMemo(
    () => (selectedKyId == null ? null : `/api/hosso?${buildQuery(filter, selectedKyId)}`),
    [filter, selectedKyId]
  );
  const listRes = usePageFetch<PaginatedThiSinh>(listUrl, { fallback: EMPTY_DATA });

  useEffect(() => { setLoading(listRes.loading); }, [listRes.loading]);
  useEffect(() => { if (listRes.data) setData(listRes.data); }, [listRes.data]);
  useEffect(() => {
    if (listRes.error) setError(listRes.error.message);
  }, [listRes.error]);

  // Tự động làm mới danh sách khi quay lại trang (back button) hoặc focus lại tab
  useEffect(() => {
    const handleRefreshEvents = () => {
      listRes.refresh();
    };
    window.addEventListener('pageshow', handleRefreshEvents);
    window.addEventListener('popstate', handleRefreshEvents);
    window.addEventListener('focus', handleRefreshEvents);
    return () => {
      window.removeEventListener('pageshow', handleRefreshEvents);
      window.removeEventListener('popstate', handleRefreshEvents);
      window.removeEventListener('focus', handleRefreshEvents);
    };
  }, [listRes]);

  function handleFilterChange(next: ThiSinhFilter) {
    setFilter(next);
    setSelectedIds([]);
  }

  function handleReset() {
    setFilter(DEFAULT_FILTER);
    setSelectedIds([]);
  }

  function handlePageChange(page: number) {
    setFilter((f) => ({ ...f, page }));
    setSelectedIds([]);
  }

  function handlePageSizeChange(pageSize: number) {
    setFilter((f) => ({ ...f, page: 1, pageSize }));
    setSelectedIds([]);
  }

  function handleRefresh() {
    listRes.refresh();
  }

  function handleSelectionChange(ids: number[]) {
    setSelectedIds(ids);
  }

  async function handleDeleteAll() {
    if (!selectedKyId) { toast.warning('Chưa có kỳ tuyển dụng'); return; }
    setDeleting(true);
    setDeleteConfirm(false);
    try {
      const body: Record<string, unknown> = { ky_tuyendung_id: selectedKyId };
      if (selectedIds.length > 0) {
        body.ids = selectedIds;
      } else {
        body.deleteAll = true;
      }
      const res = await fetch('/api/hosso/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
      toast.success(`Đã xóa ${result.deleted ?? 0} hồ sơ`);
      setSelectedIds([]);
      listRes.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi xóa hồ sơ');
    } finally {
      setDeleting(false);
    }
  }

  function handleConfirmDelete() {
    const count = selectedIds.length > 0 ? selectedIds.length : data.total;
    if (deleteConfirm) return; // already showing
    setDeleteConfirm(true);
  }

  function handleRowClick(id: number) {
    router.push(`/dashboard/ho-so/${id}`);
  }

  async function handleExportExcel() {
    if (!selectedKyId) { toast.warning('Chưa có kỳ tuyển dụng'); return; }
    setExporting(true);
    try {
      const qs = buildQuery({ ...filter, page: 1, pageSize: 5000 }, selectedKyId);
      const res = await fetch(`/api/hosso?${qs}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Lỗi tải dữ liệu');
      const json = (await res.json()) as PaginatedThiSinh;

      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('DS DU THI');

      // ====================================================================
      // Header theo đúng format file mẫu
      // ====================================================================

      // Row 1: Tên đơn vị (merge A1:Q1)
      ws.mergeCells('A1:Q1');
      const r1 = ws.getRow(1);
      r1.getCell(1).value = 'SỞ GDĐT LẠNG SƠN';
      r1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r1.getCell(1).font = { bold: true, size: 11 };
      r1.height = 18;

      // Row 2: Hội đồng
      ws.mergeCells('A2:Q2');
      const r2 = ws.getRow(2);
      r2.getCell(1).value = 'HỘI ĐỒNG TDVC NĂM ' + new Date().getFullYear();
      r2.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r2.getCell(1).font = { bold: true, size: 11 };
      r2.height = 18;

      // Row 3: trống
      ws.getRow(3).height = 8;

      // Row 4: trống
      ws.getRow(4).height = 8;

      // Row 5: Tiêu đề chính
      ws.mergeCells('A5:Q5');
      const r5 = ws.getRow(5);
      r5.getCell(1).value = 'DANH SÁCH THÍ SINH DỰ THI TUYỂN VIÊN CHỨC CƠ SỞ GIÁO DỤC MẦM NON, PHỔ THÔNG';
      r5.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r5.getCell(1).font = { bold: true, size: 13 };
      r5.height = 24;

      // Row 6: Năm
      ws.mergeCells('A6:Q6');
      const r6 = ws.getRow(6);
      r6.getCell(1).value = '(Xuất ngày ' + new Date().toLocaleDateString('vi-VN') + ')';
      r6.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r6.getCell(1).font = { italic: true, size: 10 };
      r6.height = 16;

      // Row 7: trống
      ws.getRow(7).height = 8;

      // ====================================================================
      // Header rows 8-9 — đúng theo file mẫu gốc
      // Merges từ file mẫu:
      //   A8:A9, B8:B9, C8:D9, E8:E9, F8:F9, G8:G9, H8:H9
      //   I8:M8 (span ngang cho "Trình độ chuyên môn")
      //   N8:N9, O8:O9, P8:P9, Q8:Q9
      // Row 9: I9-M9 là sub-headers riêng lẻ (không merge)
      // ====================================================================
      const HEADER_ROW = 8;

      const hdrFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } } as const;
      const hdrFont = { bold: true, size: 10 } as const;
      const hdrAlign = { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true };
      const hdrBorder = {
        top: { style: 'thin' as const }, bottom: { style: 'thin' as const },
        left: { style: 'thin' as const }, right: { style: 'thin' as const }
      };

      // Apply merges theo đúng thứ tự — không overlap
      // Nhóm 1: merge dọc A-H (rows 8-9), từng cột riêng
      ws.mergeCells('A8:A9');
      ws.mergeCells('B8:B9');
      // C8:D9 — merge cả 2 hàng 2 cột (Họ và tên)
      ws.mergeCells('C8:D9');
      ws.mergeCells('E8:E9');
      ws.mergeCells('F8:F9');
      ws.mergeCells('G8:G9');
      ws.mergeCells('H8:H9');
      // I8:M8 — merge ngang row 8 cho "Trình độ chuyên môn" (I9-M9 là sub-headers riêng)
      ws.mergeCells('I8:M8');
      // Nhóm 2: merge dọc N-Q (rows 8-9)
      ws.mergeCells('N8:N9');
      ws.mergeCells('O8:O9');
      ws.mergeCells('P8:P9');
      ws.mergeCells('Q8:Q9');

      // Áp dụng style + value cho header row 8
      const applyHdr = (col: number, value: string) => {
        const cell = ws.getRow(HEADER_ROW).getCell(col);
        cell.value = value;
        cell.font = hdrFont;
        cell.alignment = hdrAlign;
        cell.fill = hdrFill;
        cell.border = hdrBorder;
      };
      applyHdr(1,  'STT');
      applyHdr(2,  'TT');
      applyHdr(3,  'Họ và tên');
      applyHdr(5,  'Ngày tháng\n năm sinh');
      applyHdr(6,  'Giới\n tính');
      applyHdr(7,  'Dân\n tộc');
      applyHdr(8,  'Hộ khẩu\n thường trú\n(huyện - tỉnh)');
      applyHdr(9,  'Trình độ chuyên môn');
      applyHdr(14, 'Đủ đk theo\nNĐ 179/2024');
      applyHdr(15, 'Đối tượng\n ưu tiên');
      applyHdr(16, 'Số điện thoại');
      applyHdr(17, 'Đơn vị dự tuyển');
      applyHdr(18, 'Trạng thái\n hồ sơ');
      applyHdr(19, 'Trạng thái\n xét tuyển');
      applyHdr(20, 'Đỗ/\nTrượt');

      // Sub-headers row 9 (chỉ cho cột I-M)
      const applyHdr9 = (col: number, value: string) => {
        const cell = ws.getRow(HEADER_ROW + 1).getCell(col);
        cell.value = value;
        cell.font = hdrFont;
        cell.alignment = hdrAlign;
        cell.fill = hdrFill;
        cell.border = hdrBorder;
      };
      applyHdr9(9,  'Tên trường đào tạo');
      applyHdr9(10, 'Trình độ đào tạo');
      applyHdr9(11, 'Chuyên ngành đào tạo');
      applyHdr9(12, 'Chứng chỉ NVSP');
      applyHdr9(13, 'Xếp loại bằng');

      ws.getRow(HEADER_ROW).height = 36;
      ws.getRow(HEADER_ROW + 1).height = 36;

      // Row 10: số thứ tự cột (C10:D10 merge theo file mẫu)
      ws.mergeCells('C10:D10');
      const r10 = ws.getRow(HEADER_ROW + 2);
      const sttMap: Record<number, number> = {1:1,2:2,3:3,5:4,6:5,7:6,8:7,9:8,10:9,11:10,12:11,13:12,15:13,16:14,17:15,18:16,19:17,20:18};
      Object.entries(sttMap).forEach(([col, val]) => {
        const cell = r10.getCell(Number(col));
        cell.value = val;
        cell.alignment = { horizontal: 'center' };
        cell.fill = hdrFill;
        cell.border = hdrBorder;
      });
      r10.height = 16;

      // Column widths
      const COL_WIDTHS: Record<number, number> = {
        1: 5, 2: 5, 3: 14, 4: 8, 5: 13, 6: 8, 7: 8,
        8: 22, 9: 20, 10: 11, 11: 22, 12: 10, 13: 12,
        14: 12, 15: 15, 16: 13, 17: 30,
        18: 18, 19: 18, 20: 16,
      };
      Object.entries(COL_WIDTHS).forEach(([col, w]) => {
        ws.getColumn(Number(col)).width = w;
      });

      // ====================================================================
      // Data rows: nhóm theo vị trí dự tuyển
      // ====================================================================

      // Group data by vi_tri — dùng tên đầy đủ theo format file mẫu
      const { buildViTriLabel } = await import('@/shared/lib/format');
      const grouped = new Map<string, typeof json.data>();
      for (const ts of json.data) {
        const key = ts.viTri
          ? buildViTriLabel({
              loai_vi_tri: ts.viTri.loai_vi_tri ?? 'GiaoVien',
              mon: ts.viTri.mon,
              cap_hoc: ts.viTri.cap_hoc
            })
          : 'Chưa phân loại';
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(ts);
      }

      const dataBorder = {
        top: { style: 'thin' as const }, bottom: { style: 'thin' as const },
        left: { style: 'thin' as const }, right: { style: 'thin' as const }
      };
      const groupFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFF2CC' } };

      let globalStt = 0;
      let currentDataRow = HEADER_ROW + 3; // sau row 10

      for (const [groupName, items] of grouped.entries()) {
        globalStt++;

        // Group header row
        ws.mergeCells(`B${currentDataRow}:T${currentDataRow}`);
        const groupRow = ws.getRow(currentDataRow);
        groupRow.getCell(1).value = globalStt;
        groupRow.getCell(2).value = groupName;
        for (let c = 1; c <= 20; c++) {
          const cell = groupRow.getCell(c);
          cell.fill = groupFill;
          cell.font = { bold: true, size: 10 };
          cell.border = dataBorder;
        }
        groupRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
        groupRow.height = 18;
        currentDataRow++;

        // Data rows
        items.forEach((ts, idx) => {
          const row = ws.getRow(currentDataRow);
          const trangThaiHoSo = (ts.trang_thai_ho_so && typeof ts.trang_thai_ho_so === 'string')
            ? (TrangThaiHoSoLabel[ts.trang_thai_ho_so as TrangThaiHoSoValue] ?? ts.trang_thai_ho_so)
            : '';
          const trangThaiXetTuyen = ts.ketQua?.ket_qua
            ? (KetQuaLabel[ts.ketQua.ket_qua] ?? ts.ketQua.ket_qua)
            : '';
          const diemChuan = ts.viTri?.diem_chuan ?? null;
          const diemTong = ts.ketQua?.diem_tong ?? null;
          const datKhongDat = (diemChuan !== null && diemTong !== null)
            ? (diemTong >= diemChuan ? 'Đỗ' : 'Trượt')
            : '';

          const vals = [
            null,                                  // col1: dành cho STT nhóm
            idx + 1,                               // col2: TT trong nhóm
            ts.ho,                                 // col3: Họ
            ts.ten,                                // col4: Tên
            ts.ngay_sinh,                          // col5: Ngày sinh
            ts.gioi_tinh === 'Nu' ? 'Nữ' : ts.gioi_tinh, // col6
            ts.dan_toc ?? '',                      // col7: Dân tộc
            ts.ho_khau_thuong_tru ?? '',            // col8: Hộ khẩu
            ts.ten_truong_dao_tao ?? '',            // col9: Trường
            ts.trinh_do_chuyen_mon ?? '',           // col10: Trình độ chuyên môn
            ts.chuyen_nganh ?? '',                  // col11: Chuyên ngành
            ts.co_chung_chi_nvsp ? 'NVSP' : '',    // col12: Chứng chỉ NVSP
            ts.xep_loai_bang ?? '',                // col13: Xếp loại
            '',                                    // col14: Đủ ĐK (để trống)
            ts.doi_tuong_uu_tien ?? '',            // col15: Ưu tiên
            ts.dien_thoai ?? '',                   // col16: ĐT
            ts.donVi?.ten_don_vi ?? '',            // col17: Đơn vị
            trangThaiHoSo,                         // col18: Trạng thái hồ sơ
            trangThaiXetTuyen,                     // col19: Trạng thái xét tuyển
            datKhongDat,                           // col20: Đỗ/Trượt
          ];
          vals.forEach((v, i) => {
            const cell = row.getCell(i + 1);
            // eslint-disable-next-line
            cell.value = v as any;
            cell.border = dataBorder;
            cell.font = { size: 10 };
            if (i + 1 === 2) cell.alignment = { horizontal: 'center' };
            if (i + 1 === 4) cell.alignment = { horizontal: 'left' }; // Tên
            if (i + 1 === 18 || i + 1 === 19 || i + 1 === 20) {
              cell.alignment = { horizontal: 'center' };
            }
          });
          row.height = 16;
          currentDataRow++;
        });
      }

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DS_DU_THI_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Đã xuất ${json.data.length} hồ sơ`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi xuất Excel');
    } finally {
      setExporting(false);
    }
  }

  async function handleAction(action: ThiSinhAction, id: number) {
    if (action === 'view') {
      router.push(`/dashboard/ho-so/${id}`);
      return;
    }
    if (action === 'edit') {
      router.push(`/dashboard/ho-so/${id}?edit=1`);
      return;
    }
    if (action === 'delete') {
      toast.warning(`TODO: xác nhận xóa hồ sơ #${id}`);
      return;
    }
    if (action === 'lock') {
      if (!window.confirm('Bạn có chắc chắn muốn duyệt và khóa hồ sơ này? Sau khi duyệt không thể chỉnh sửa thông tin.')) {
        return;
      }
      try {
        const res = await fetch(`/api/hosso/${id}/khoa`, { method: 'POST' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        toast.success('Đã duyệt và khóa hồ sơ thành công');
        handleRefresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Lỗi duyệt hồ sơ');
      }
    }
  }

  const hasData = data.data.length > 0;
  const showEmpty = !loading && !error && !hasData;

  return (
    <div>
      <PageHeader
        title="Quản lý Hồ sơ"
        description="Danh sách thí sinh đăng ký dự tuyển"
      />

      <div className="space-y-4 p-5">
        {/* Toolbar card — theo Figma: buttons trái, filter phải */}
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          {/* Hàng 1: Action buttons + Search inline */}
          {selectedKyId && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {canCreate && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={() => router.push('/dashboard/ho-so/new')}
                >
                  Thêm hồ sơ
                </Button>
              )}
              {canCreate && (
                <span data-guide="ho-so-import">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Upload size={14} />}
                    onClick={() => router.push('/dashboard/ho-so/import')}
                  >
                    Import Excel
                  </Button>
                </span>
              )}
              {canExport && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download size={14} />}
                  onClick={handleExportExcel}
                  loading={exporting}
                >
                  Xuất Excel
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw size={14} className={loading || exporting ? 'animate-spin' : ''} />}
                onClick={handleRefresh}
                disabled={loading || exporting}
              >
                Làm mới
              </Button>
              {canDelete && selectedIds.length > 0 && (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                    Đã chọn {selectedIds.length}/{data.data.length} trang này
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      className="ml-1 text-brand-500 hover:text-brand-700"
                      aria-label="Bỏ chọn"
                      title="Bỏ chọn tất cả"
                    >
                      ✕
                    </button>
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash2 size={14} />}
                    onClick={handleConfirmDelete}
                    disabled={deleting || loading}
                    loading={deleting}
                  >
                    {`Xóa (${selectedIds.length})`}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Hàng 2: FilterBar (search + dropdowns) */}
          <div data-guide="ho-so-filter">
            <FilterBar
              filter={filter}
              onChange={handleFilterChange}
              onReset={handleReset}
              viTriList={viTriList}
              donViList={donViList}
              kyList={kyList}
              selectedKyId={selectedKyId}
              onKyChange={setSelectedKyId}
            />
          </div>
        </div>

        {selectedKyId && error && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Không tải được dữ liệu</div>
              <div className="text-xs">{error}</div>
            </div>
          </div>
        )}

        {selectedKyId && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {loading && !hasData ? (
              <div className="flex h-48 items-center justify-center">
                <Spinner size={24} className="text-brand-500" />
              </div>
            ) : showEmpty ? (
              <EmptyState
                icon={<FileText size={48} className="text-slate-300" />}
                title="Chưa có hồ sơ nào"
                description="Import từ Excel hoặc thêm thủ công để bắt đầu quản lý hồ sơ thí sinh."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Upload size={14} />}
                    onClick={() => router.push('/dashboard/ho-so/import')}
                  >
                    Import Excel
                  </Button>
                }
              />
            ) : (
              <div data-guide="ho-so-list">
                <ThiSinhTable
                  data={data.data as ThiSinhView[]}
                  page={data.page}
                  pageSize={data.pageSize}
                  onRowClick={handleRowClick}
                  onAction={handleAction}
                  onSelectionChange={handleSelectionChange}
                  selectedIds={selectedIds}
                  canLock={quyen === 'ADMIN'}
                />
                <Pagination
                  page={data.page}
                  pageSize={data.pageSize}
                  total={data.total}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm delete modal */}
      <Modal
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Xác nhận xóa hồ sơ"
        description={
          selectedIds.length > 0
            ? `Bạn có chắc chắn muốn xóa ${selectedIds.length} hồ sơ đã chọn? Hành động này không thể hoàn tác.`
            : `Bạn có chắc chắn muốn xóa toàn bộ ${data.total} hồ sơ trong kỳ tuyển dụng? Hành động này không thể hoàn tác.`
        }
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(false)}>
              Hủy
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteAll} loading={deleting}>
              Xác nhận xóa
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <strong>Cảnh báo:</strong> Việc xóa hồ sơ sẽ xóa vĩnh viễn toàn bộ dữ liệu liên quan
            (điểm thi, lịch sử chỉnh sửa). Không thể khôi phục sau khi xóa.
          </div>
          {selectedIds.length > 0 && (
            <p className="text-xs text-slate-500">
              ID các hồ sơ sẽ xóa: {selectedIds.slice(0, 20).join(', ')}
              {selectedIds.length > 20 && ` ... và ${selectedIds.length - 20} hồ sơ khác`}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
