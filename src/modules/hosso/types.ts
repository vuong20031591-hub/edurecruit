/**
 * hosso module - types
 * File: src/modules/hosso/types.ts
 */
import type { ThiSinh, ThiSinhCreate, ThiSinhUpdate, TrangThaiHoSo } from '@/db/schema';

export interface ThiSinhView extends ThiSinh {
  viTri?: { id: number; ma_vi_tri: string; mon: string; cap_hoc: string; loai_vi_tri: string } | null;
  donVi?: { id: number; ma_don_vi: string; ten_don_vi: string; cap_hoc: string } | null;
  diemThi?: { diem_thi_giang: number | null; trang_thai_nhap: string } | null;
  phongThi?: { id: number; ma_phong: string; ngay_thi: string; gio_thi: string } | null;
  /**
   * Cờ báo TS đã được xếp phòng (có bản ghi diemthi với phongthi_id).
   * Không lưu trong DB, được join khi cần cho UI.
   */
  da_xep_phong?: boolean;
}

export interface LockAllResult {
  locked: number;
}

export interface ThiSinhFilter {
  ky_tuyendung_id?: number;
  search?: string;
  trang_thai?: TrangThaiHoSo | TrangThaiHoSo[];
  vi_tri_id?: number;
  don_vi_id?: number;
  ngay_nop_from?: string;
  ngay_nop_to?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'id' | 'ho_ten' | 'ngay_nop_ho_so' | 'trang_thai_ho_so';
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedThiSinh {
  data: ThiSinhView[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ThiSinhStats {
  tongSoHoSo: number;
  byTrangThai: Record<TrangThaiHoSo, number>;
}

export interface ImportExcelResult {
  success: number;
  errors: Array<{ row: number; message: string }>;
}

export type PreviewRowStatus = 'ok' | 'warning' | 'error';

export interface PreviewImportRow {
  row: number;
  // Field thường dùng cho table compact
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
  // Bảng phụ count
  so_nguoi_than: number;
  so_van_bang: number;
  so_qtc: number;
  // Tất cả field raw từ parser — dùng cho RowDetail khi expand
  raw: Record<string, unknown>;
  // Status
  status: PreviewRowStatus;
  message: string | null;
}

export interface PreviewImportResult {
  format: 'google-form' | 'ds-du-thi';
  totalRows: number;
  summary: { ok: number; warning: number; error: number };
  rows: PreviewImportRow[];
}

export type { ThiSinh, ThiSinhCreate, ThiSinhUpdate };
