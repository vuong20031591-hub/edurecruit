/**
 * Validation helpers (zod schemas chung)
 * File: src/shared/lib/validation.ts
 */
import { z } from 'zod';
import { TrangThaiHoSo, Quyen, CapHoc, GioiTinh, HinhThucThi, KetQua, TrangThaiDiem, TrangThaiPhongThi } from '../constants/enums';

const emptyToNull = z.preprocess(v => (v === '' || v === undefined ? null : v), z.string().nullable());

export const cccdSchema = z
  .string()
  .regex(/^\d{9}$|^\d{12}$/, 'CCCD phải là 9 hoặc 12 chữ số')
  .nullable()
  .optional()
  .or(z.literal(''));

export const phoneSchema = z
  .string()
  .regex(/^(0|\+84)\d{9,10}$/, 'Số điện thoại không hợp lệ')
  .nullable()
  .optional()
  .or(z.literal(''));

export const emailSchema = z
  .string()
  .email('Email không hợp lệ')
  .nullable()
  .optional()
  .or(z.literal(''));

export const ngaySinhSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sinh phải có dạng yyyy-MM-dd')
  .refine(v => {
    const d = new Date(v);
    const now = new Date();
    const age = now.getFullYear() - d.getFullYear();
    return age >= 18 && age <= 65;
  }, 'Tuổi phải từ 18 đến 65');

export const diemSchema = z
  .number()
  .min(0, 'Điểm >= 0')
  .max(10, 'Điểm <= 10');

export const trangThaiHoSoSchema = z.enum([
  TrangThaiHoSo.ChoRaSoat,
  TrangThaiHoSo.HopLe,
  TrangThaiHoSo.CanBoSung,
  TrangThaiHoSo.KhongDuDieuKien,
  TrangThaiHoSo.DaChinhSua
]);

export const quyenSchema = z.enum([Quyen.ADMIN, Quyen.TO_NHAP_HOSO, Quyen.TO_NHAP_DIEM, Quyen.LANH_DAO]);
export const capHocSchema = z.enum([CapHoc.MN, CapHoc.TH, CapHoc.THCS, CapHoc.THPT, CapHoc.GDTX, CapHoc.DNTTHPT, CapHoc.THCS_THPT, CapHoc.TH_THCS]);
export const gioiTinhSchema = z.enum([GioiTinh.Nam, GioiTinh.Nu, GioiTinh.Khac]);
export const hinhThucThiSchema = z.enum([HinhThucThi.Viet, HinhThucThi.TracNghiem, HinhThucThi.ThucHanh]);
export const ketQuaSchema = z.enum([KetQua.ChoXuLy, KetQua.Dat, KetQua.KhongDat, KetQua.Vang, KetQua.BoThi, KetQua.KhongDuDieuKien]);
export const trangThaiDiemSchema = z.enum([TrangThaiDiem.ChuaNhap, TrangThaiDiem.DaNhap, TrangThaiDiem.DaKhoa]);
export const trangThaiPhongThiSchema = z.enum([TrangThaiPhongThi.ChuaSapXep, TrangThaiPhongThi.DaSapXep, TrangThaiPhongThi.DaKhoa, TrangThaiPhongThi.DaThiXong]);

// ============================================================================
// Common composite schemas
// ============================================================================

export const loginSchema = z.object({
  username: z.string().min(3, 'Tên đăng nhập >= 3 ký tự').max(50),
  password: z.string().min(6, 'Mật khẩu >= 6 ký tự').max(100)
});

export const thisinhCreateSchema = z.object({
  ky_tuyendung_id: z.number().int().positive(),
  vi_tri_dang_ky_id: z.number().int().positive(),
  don_vi_du_tuyen_id: z.number().int().positive(),
  ho: z.string().min(1).max(100),
  ten: z.string().min(1).max(50),
  ho_ten: z.string().min(2).max(150),
  ngay_sinh: ngaySinhSchema,
  gioi_tinh: gioiTinhSchema,
  dan_toc: emptyToNull,
  ho_khau_thuong_tru: emptyToNull,
  cccd: cccdSchema,
  ngay_cap_cccd: emptyToNull,
  noi_cap_cccd: emptyToNull,
  dien_thoai: phoneSchema,
  email: emailSchema,
  ten_truong_dao_tao: emptyToNull,
  trinh_do_chuyen_mon: emptyToNull,
  chuyen_nganh: emptyToNull,
  nam_tot_nghiep: z.number().int().min(1970).max(2100).nullable().optional(),
  co_chung_chi_nvsp: z.union([z.literal(0), z.literal(1)]).default(0),
  xep_loai_bang: emptyToNull,
  doi_tuong_uu_tien: emptyToNull
});
