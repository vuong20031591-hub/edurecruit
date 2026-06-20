import type { KetQua } from '@/db/schema';

export interface XetTuyenInput {
  ky_tuyendung_id: number;
}

export interface XetTuyenResult {
  vitri_count: number;
  trung_tuyen_count: number;
  du_phong_count: number;
  khong_dat_count: number;
  ngay_chay: string;
}

export interface KetQuaView {
  id: number;
  thisinh_id: number;
  sbd: string | null;
  ho_ten: string;
  vi_tri_id: number;
  ma_vi_tri: string;
  mon: string;
  diem_thi_giang: number | null;
  diem_uu_tien: number;
  diem_tong: number;
  xep_hang: number | null;
  ket_qua: KetQua;
  ghi_chu: string | null;
  ngay_chay: string;
  vang_thi: number;
  bo_thi: number;
}

export interface PreCheckResult {
  ready: boolean;
  total_thisinh: number;
  diem_da_khoa: number;
  diem_chua_khoa: number;
  message: string;
}
