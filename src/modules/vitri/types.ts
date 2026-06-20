/**
 * vitri module - types
 * File: src/modules/vitri/types.ts
 */
import type {
  ViTriTuyenDung,
  ViTriCreate,
  ViTriUpdate,
  CapHoc,
  HinhThucThi,
  DonViTuyenDung
} from '@/db/schema';

export interface ViTriView extends ViTriTuyenDung {
  soThiSinh: number;
  donViCount: number;
  kyTen?: string;
}

export interface ViTriFilter {
  ky_tuyendung_id?: number;
  mon?: string;
  cap_hoc?: CapHoc;
  hinh_thuc_thi?: HinhThucThi;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedViTri {
  data: ViTriView[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ViTriDonViInput {
  don_vi_id: number;
  so_luong_phan_bo: number;
}

export interface ViTriMappingResult {
  vitri_tuyendung_id: number;
  don_vi_ids: number[];
  inserted: number;
}

export type { ViTriCreate, ViTriUpdate, DonViTuyenDung };
