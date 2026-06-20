/**
 * Form state shape for HoSo detail/edit page
 * File: src/app/dashboard/ho-so/[id]/form-types.ts
 */
import type { GioiTinh, TrangThaiHoSo } from '@/db/schema';
import { toDateInput, fromDateInput } from '@/shared/lib/format';

// ----- Bảng phụ 1-N (read-only trong form, hiển thị qua component riêng) -----
export interface NguoiThanItem {
  thu_tu: 1 | 2 | 3;
  moi_quan_he: string;
  ho_ten: string;
  ngay_sinh: string;
  thong_tin_khac: string;
}
export interface VanBangItem {
  thu_tu: 1 | 2;
  ten_truong: string;
  ngay_cap: string;
  trinh_do: string;
  so_hieu: string;
  chuyen_nganh: string;
  hinh_thuc: string;
  nganh: string;
  xep_loai: string;
}
export interface QtcItem {
  thu_tu: 1 | 2;
  tu_ngay: string;
  den_ngay: string;
  co_quan: string;
}

export interface FormValues {
  ho: string;
  ten: string;
  ho_ten: string;
  ngay_sinh: string;
  gioi_tinh: GioiTinh | '';
  dan_toc: string;
  ton_giao: string;
  suc_khoe: string;
  chieu_cao: string;
  can_nang: string;
  trinh_do_van_hoa: string;
  ho_khau_thuong_tru: string;
  cho_o_hien_nay: string;

  cccd: string;
  ngay_cap_cccd: string;
  noi_cap_cccd: string;
  dien_thoai: string;
  email: string;

  ten_truong_dao_tao: string;
  trinh_do_chuyen_mon: string;
  chuyen_nganh: string;
  so_hieu_van_bang: string;
  ngay_cap_van_bang: string;
  hinh_thuc_dao_tao: string;
  nganh_dao_tao: string;
  nam_tot_nghiep: string;
  co_chung_chi_nvsp: boolean;
  xep_loai_bang: string;
  doi_tuong_uu_tien: string[];

  vi_tri_dang_ky_id: number | null;
  don_vi_du_tuyen_id: number | null;
  co_dang_ky_nv2: boolean;
  vi_tri_dang_ky_id_2: number | null;
  don_vi_du_tuyen_id_2: number | null;

  ngoai_ngu: string;
  ngoai_ngu_khac: string;
  mien_thi_nn: string;
  cam_doan_thong_tin: string;
}

export const EMPTY_FORM: FormValues = {
  ho: '',
  ten: '',
  ho_ten: '',
  ngay_sinh: '',
  gioi_tinh: '',
  dan_toc: '',
  ton_giao: '',
  suc_khoe: '',
  chieu_cao: '',
  can_nang: '',
  trinh_do_van_hoa: '',
  ho_khau_thuong_tru: '',
  cho_o_hien_nay: '',

  cccd: '',
  ngay_cap_cccd: '',
  noi_cap_cccd: '',
  dien_thoai: '',
  email: '',

  ten_truong_dao_tao: '',
  trinh_do_chuyen_mon: '',
  chuyen_nganh: '',
  so_hieu_van_bang: '',
  ngay_cap_van_bang: '',
  hinh_thuc_dao_tao: '',
  nganh_dao_tao: '',
  nam_tot_nghiep: '',
  co_chung_chi_nvsp: false,
  xep_loai_bang: '',
  doi_tuong_uu_tien: [],

  vi_tri_dang_ky_id: null,
  don_vi_du_tuyen_id: null,
  co_dang_ky_nv2: false,
  vi_tri_dang_ky_id_2: null,
  don_vi_du_tuyen_id_2: null,

  ngoai_ngu: '',
  ngoai_ngu_khac: '',
  mien_thi_nn: '',
  cam_doan_thong_tin: ''
};

export function formFromView(view: Record<string, unknown>): FormValues {
  const v = view as Record<string, unknown>;
  const doi_tuong_uu_tien_csv = (v.doi_tuong_uu_tien as string | null) ?? '';
  return {
    ho: (v.ho as string) ?? '',
    ten: (v.ten as string) ?? '',
    ho_ten: (v.ho_ten as string) ?? '',
    ngay_sinh: toDateInput((v.ngay_sinh as string) ?? ''),
    gioi_tinh: (v.gioi_tinh as GioiTinh | null) ?? '',
    dan_toc: (v.dan_toc as string) ?? '',
    ton_giao: (v.ton_giao as string) ?? '',
    suc_khoe: (v.suc_khoe as string) ?? '',
    chieu_cao: (v.chieu_cao as string) ?? '',
    can_nang: (v.can_nang as string) ?? '',
    trinh_do_van_hoa: (v.trinh_do_van_hoa as string) ?? '',
    ho_khau_thuong_tru: (v.ho_khau_thuong_tru as string) ?? '',
    cho_o_hien_nay: (v.cho_o_hien_nay as string) ?? '',

    cccd: (v.cccd as string) ?? '',
    ngay_cap_cccd: toDateInput((v.ngay_cap_cccd as string) ?? ''),
    noi_cap_cccd: (v.noi_cap_cccd as string) ?? '',
    dien_thoai: (v.dien_thoai as string) ?? '',
    email: (v.email as string) ?? '',

    ten_truong_dao_tao: (v.ten_truong_dao_tao as string) ?? '',
    trinh_do_chuyen_mon: (v.trinh_do_chuyen_mon as string) ?? '',
    chuyen_nganh: (v.chuyen_nganh as string) ?? '',
    so_hieu_van_bang: (v.so_hieu_van_bang as string) ?? '',
    ngay_cap_van_bang: toDateInput((v.ngay_cap_van_bang as string) ?? ''),
    hinh_thuc_dao_tao: (v.hinh_thuc_dao_tao as string) ?? '',
    nganh_dao_tao: (v.nganh_dao_tao as string) ?? '',
    nam_tot_nghiep: v.nam_tot_nghiep != null ? String(v.nam_tot_nghiep) : '',
    co_chung_chi_nvsp: Number(v.co_chung_chi_nvsp ?? 0) === 1,
    xep_loai_bang: (v.xep_loai_bang as string) ?? '',
    doi_tuong_uu_tien: doi_tuong_uu_tien_csv ? doi_tuong_uu_tien_csv.split(',').map(s => s.trim()).filter(Boolean) : [],

    vi_tri_dang_ky_id: (v.vi_tri_dang_ky_id as number) ?? null,
    don_vi_du_tuyen_id: (v.don_vi_du_tuyen_id as number) ?? null,
    co_dang_ky_nv2: Number(v.co_dang_ky_nv2 ?? 0) === 1,
    vi_tri_dang_ky_id_2: (v.vi_tri_dang_ky_id_2 as number) ?? null,
    don_vi_du_tuyen_id_2: (v.don_vi_du_tuyen_id_2 as number) ?? null,

    ngoai_ngu: (v.ngoai_ngu as string) ?? '',
    ngoai_ngu_khac: (v.ngoai_ngu_khac as string) ?? '',
    mien_thi_nn: (v.mien_thi_nn as string) ?? '',
    cam_doan_thong_tin: (v.cam_doan_thong_tin as string) ?? ''
  };
}

function toDateInputLocal(value: string): string {
  return toDateInput(value);
}

export function buildSubmitPayload(form: FormValues): Record<string, unknown> {
  return {
    ho: form.ho.trim(),
    ten: form.ten.trim(),
    ho_ten: `${form.ho} ${form.ten}`.trim(),
    ngay_sinh: fromDateInput(form.ngay_sinh),
    gioi_tinh: form.gioi_tinh || null,
    dan_toc: form.dan_toc.trim() || null,
    ton_giao: form.ton_giao.trim() || null,
    suc_khoe: form.suc_khoe.trim() || null,
    chieu_cao: form.chieu_cao.trim() || null,
    can_nang: form.can_nang.trim() || null,
    trinh_do_van_hoa: form.trinh_do_van_hoa.trim() || null,
    ho_khau_thuong_tru: form.ho_khau_thuong_tru.trim() || null,
    cho_o_hien_nay: form.cho_o_hien_nay.trim() || null,

    cccd: form.cccd.trim() || null,
    ngay_cap_cccd: fromDateInput(form.ngay_cap_cccd),
    noi_cap_cccd: form.noi_cap_cccd.trim() || null,
    dien_thoai: form.dien_thoai.trim() || null,
    email: form.email.trim() || null,

    ten_truong_dao_tao: form.ten_truong_dao_tao.trim() || null,
    trinh_do_chuyen_mon: form.trinh_do_chuyen_mon || null,
    chuyen_nganh: form.chuyen_nganh.trim() || null,
    so_hieu_van_bang: form.so_hieu_van_bang.trim() || null,
    ngay_cap_van_bang: fromDateInput(form.ngay_cap_van_bang),
    hinh_thuc_dao_tao: form.hinh_thuc_dao_tao.trim() || null,
    nganh_dao_tao: form.nganh_dao_tao.trim() || null,
    nam_tot_nghiep: form.nam_tot_nghiep ? Number(form.nam_tot_nghiep) : null,
    co_chung_chi_nvsp: form.co_chung_chi_nvsp ? 1 : 0,
    xep_loai_bang: form.xep_loai_bang || null,
    doi_tuong_uu_tien: form.doi_tuong_uu_tien.length > 0 ? form.doi_tuong_uu_tien.join(',') : null,

    vi_tri_dang_ky_id: form.vi_tri_dang_ky_id,
    don_vi_du_tuyen_id: form.don_vi_du_tuyen_id,
    co_dang_ky_nv2: form.co_dang_ky_nv2 ? 1 : 0,
    vi_tri_dang_ky_id_2: form.co_dang_ky_nv2 ? form.vi_tri_dang_ky_id_2 : null,
    don_vi_du_tuyen_id_2: form.co_dang_ky_nv2 ? form.don_vi_du_tuyen_id_2 : null,

    ngoai_ngu: form.ngoai_ngu.trim() || null,
    ngoai_ngu_khac: form.ngoai_ngu_khac.trim() || null,
    mien_thi_nn: form.mien_thi_nn.trim() || null,
    cam_doan_thong_tin: form.cam_doan_thong_tin.trim() || null
  };
}

export function statusVariant(status: TrangThaiHoSo): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'HopLe':           return 'success';
    case 'ChoRaSoat':       return 'neutral';
    case 'CanBoSung':       return 'warning';
    case 'KhongDuDieuKien': return 'danger';
    case 'DaChinhSua':      return 'info';
  }
}
