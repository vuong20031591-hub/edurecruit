import type { PhongThi } from '@/db/schema';

export interface PhongThiFilter {
  ky_tuyendung_id?: number;
  vi_tri_dang_ky_id?: number;
}

export interface PhongThiStats {
  tongPhong: number;
  tongSucChua: number;
  daXep: number;
  conTrong: number;
  phongDaycho: number;
  phongConCho: number;
}

export interface PhongThiView extends PhongThi {
  ty_le_lap_day: number;
  ten_vi_tri: string | null;
}

export interface PhongThiCreate {
  ky_tuyendung_id: number;
  vi_tri_dang_ky_id: number;
  ma_phong: string;
  ten_phong?: string | null;
  dia_diem?: string | null;
  suc_chua: number;
  ngay_thi: string;
  gio_thi: string;
  ghi_chu?: string | null;
}

export interface PhongThiUpdate {
  ma_phong?: string;
  ten_phong?: string | null;
  dia_diem?: string | null;
  suc_chua?: number;
  ngay_thi?: string;
  gio_thi?: string;
  ghi_chu?: string | null;
  trang_thai?: PhongThi['trang_thai'];
}

export interface SapXepResult {
  assigned: number;
  skipped: number;
  warnings: string[];
  assignments: Array<{ thisinh_id: number; phongthi_id: number; sbd: string }>;
}
