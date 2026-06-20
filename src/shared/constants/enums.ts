/**
 * Enums & constants dùng chung
 * File: src/shared/constants/enums.ts
 */

export const TrangThaiHoSo = {
  ChoRaSoat: 'ChoRaSoat',
  HopLe: 'HopLe',
  CanBoSung: 'CanBoSung',
  KhongDuDieuKien: 'KhongDuDieuKien',
  DaChinhSua: 'DaChinhSua'
} as const;
export type TrangThaiHoSoValue = typeof TrangThaiHoSo[keyof typeof TrangThaiHoSo];

export const TrangThaiHoSoLabel: Record<TrangThaiHoSoValue, string> = {
  ChoRaSoat: 'Chờ rà soát',
  HopLe: 'Hợp lệ',
  CanBoSung: 'Cần bổ sung',
  KhongDuDieuKien: 'Không đủ điều kiện',
  DaChinhSua: 'Đã chỉnh sửa'
};

export const TrangThaiHoSoBadge: Record<TrangThaiHoSoValue, string> = {
  ChoRaSoat: 'bg-slate-100 text-slate-700',
  HopLe: 'bg-green-100 text-green-800',
  CanBoSung: 'bg-amber-100 text-amber-800',
  KhongDuDieuKien: 'bg-red-100 text-red-800',
  DaChinhSua: 'bg-blue-100 text-blue-800'
};

// ============================================================================

export const TrangThaiDiem = {
  ChuaNhap: 'ChuaNhap',
  DaNhap: 'DaNhap',
  DaKhoa: 'DaKhoa'
} as const;

export const TrangThaiDiemLabel: Record<string, string> = {
  ChuaNhap: 'Chưa nhập',
  DaNhap: 'Đã nhập',
  DaKhoa: 'Đã khóa'
};

// ============================================================================

export const TrangThaiPhongThi = {
  ChuaSapXep: 'ChuaSapXep',
  DaSapXep: 'DaSapXep',
  DaKhoa: 'DaKhoa',
  DaThiXong: 'DaThiXong'
} as const;

export const TrangThaiPhongThiLabel: Record<string, string> = {
  ChuaSapXep: 'Chưa sắp xếp',
  DaSapXep: 'Đã sắp xếp',
  DaKhoa: 'Đã khóa',
  DaThiXong: 'Đã thi xong'
};

// ============================================================================

export const Quyen = {
  ADMIN: 'ADMIN',
  TO_NHAP_HOSO: 'TO_NHAP_HOSO',
  TO_NHAP_DIEM: 'TO_NHAP_DIEM',
  LANH_DAO: 'LANH_DAO'
} as const;

export const QuyenLabel: Record<string, string> = {
  ADMIN: 'Quản trị',
  TO_NHAP_HOSO: 'Tổ Nhập Hồ Sơ',
  TO_NHAP_DIEM: 'Tổ Nhập Điểm',
  LANH_DAO: 'Lãnh đạo'
};

// ============================================================================

export const CapHoc = {
  MN: 'MN',
  TH: 'TH',
  THCS: 'THCS',
  THPT: 'THPT',
  GDTX: 'GDTX',
  DNTTHPT: 'DNTTHPT'
} as const;

export const CapHocLabel: Record<string, string> = {
  MN: 'Mầm non',
  TH: 'Tiểu học',
  THCS: 'THCS',
  THPT: 'THPT',
  GDTX: 'Giáo dục thường xuyên',
  DNTTHPT: 'Dân tộc nội trú THPT'
};

// ============================================================================

export const GioiTinh = {
  Nam: 'Nam',
  Nu: 'Nữ',
  Khac: 'Khác'
} as const;

export const GioiTinhLabel: Record<string, string> = {
  Nam: 'Nam',
  Nu: 'Nữ',
  Khac: 'Khác'
};

// ============================================================================

export const HinhThucThi = {
  Viet: 'Viet',
  TracNghiem: 'TracNghiem',
  ThucHanh: 'ThucHanh'
} as const;

export const HinhThucThiLabel: Record<string, string> = {
  Viet: 'Tự luận',
  TracNghiem: 'Trắc nghiệm',
  ThucHanh: 'Thực hành'
};

// ============================================================================

export const KetQua = {
  ChoXuLy: 'ChoXuLy',
  Dat: 'Dat',
  KhongDat: 'KhongDat',
  Vang: 'Vang',
  BoThi: 'BoThi',
  KhongDuDieuKien: 'KhongDuDieuKien'
} as const;

export const KetQuaLabel: Record<string, string> = {
  ChoXuLy: 'Chờ xử lý',
  Dat: 'Đạt',
  KhongDat: 'Không đạt',
  Vang: 'Vắng thi',
  BoThi: 'Bỏ thi',
  KhongDuDieuKien: 'Không đủ điều kiện'
};

export const KetQuaBadge: Record<string, string> = {
  ChoXuLy: 'bg-slate-100 text-slate-700',
  Dat: 'bg-green-100 text-green-800',
  KhongDat: 'bg-red-100 text-red-800',
  Vang: 'bg-amber-100 text-amber-800',
  BoThi: 'bg-red-100 text-red-800',
  KhongDuDieuKien: 'bg-slate-200 text-slate-800'
};

// ============================================================================

export const TrangThaiKy = {
  Mo: 'Mo',
  DangTuyen: 'DangTuyen',
  DaKhoa: 'DaKhoa',
  Huy: 'Huy'
} as const;

export const TrangThaiKyLabel: Record<string, string> = {
  Mo: 'Mở',
  DangTuyen: 'Đang tuyển',
  DaKhoa: 'Đã khóa',
  Huy: 'Huỷ'
};

// ============================================================================

export const DoiTuongUuTienList = [
  { value: 'con_thuong_binh',  label: 'Con thương binh' },
  { value: 'con_liet_si',      label: 'Con liệt sĩ' },
  { value: 'anh_hung_llvt',    label: 'Anh hùng LLLVT' },
  { value: 'dan_toc_thieu_so', label: 'Dân tộc thiểu số' },
  { value: 'ho_khau_tinh',     label: 'Hộ khẩu thường trú tại tỉnh' }
];
