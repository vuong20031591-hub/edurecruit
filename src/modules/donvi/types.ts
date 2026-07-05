/**
 * donvi module - types
 * File: src/modules/donvi/types.ts
 */
import type { DonViTuyenDung, DonViCreate, CapHoc } from '@/db/schema';

export interface DonViView extends DonViTuyenDung {
  soThiSinh: number;
  kyTen?: string;
  mappings?: Array<{ vitri_tuyendung_id: number; so_luong_phan_bo: number }>;
}

export interface DonViFilter {
  ky_tuyendung_id?: number;
  cap_hoc?: CapHoc;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedDonVi {
  data: DonViView[];
  total: number;
  page: number;
  pageSize: number;
}

export type DonViUpdate = Partial<Omit<DonViCreate, 'ky_tuyendung_id'>>;

export interface DonViCreateInput extends DonViCreate {
  mappings?: Array<{ vitri_tuyendung_id: number; so_luong_phan_bo: number }>;
}

export interface DonViUpdateInput extends DonViUpdate {
  mappings?: Array<{ vitri_tuyendung_id: number; so_luong_phan_bo: number }>;
}
