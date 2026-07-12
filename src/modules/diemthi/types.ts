/**
 * diemthi module - types
 * File: src/modules/diemthi/types.ts
 */
import type { DiemThi } from '@/db/schema';

// ─── Filter ─────────────────────────────────────────────────────────────────

export interface DiemThiFilter {
  ky_tuyendung_id?: number;
  phongthi_id?: number;
}

// ─── View (join thisinh + phongthi) ─────────────────────────────────────────

export interface DiemThiView extends DiemThi {
  /** Số báo danh */
  sbd: string | null;
  /** Họ và tên thí sinh */
  ho_ten: string;
  /** ho + ten riêng (để ẩn danh) */
  ho: string;
  ten: string;
  /** Mã phòng thi */
  ma_phong: string | null;
  /** Dân tộc thí sinh (để xác định DTTS, không hiển thị ở nhập điểm) */
  dan_toc: string | null;
  /** Điểm ưu tiên từ bảng ketqua (nullable nếu chưa có ketqua record) */
  diem_uu_tien: number | null;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface DiemThiStats {
  tongThiSinh: number;
  daNhap: number;
  chuaNhap: number;
  daKhoa: number;
}

// ─── Upsert payload ──────────────────────────────────────────────────────────

export interface DiemThiUpsert {
  thisinh_id: number;
  phongthi_id?: number | null;
  diem_gk1?: number | null;
  diem_gk2?: number | null;
  diem_dan_toc?: number | null;
  vang_thi?: boolean | number;
  bo_thi?: boolean | number;
  ly_do_vang?: string | null;
}

// ─── Khóa điểm payload ───────────────────────────────────────────────────────

export interface KhoaDiemPayload {
  phongthi_id: number;
}

export interface KhoaDiemResult {
  locked: number;
  skipped: number;
}
