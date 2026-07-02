/**
 * mon-chuyen-nganh module - types
 * File: src/modules/mon-chuyen-nganh/types.ts
 */
export interface MonChuyenNganhRow {
  id: number;
  mon: string;
  chuyen_nganh: string;
  ghi_chu: string | null;
  created_at: string;
  updated_at: string;
}

/** Dạng group theo môn — dùng cho UI hiển thị danh sách */
export interface MonChuyenNganhGrouped {
  mon: string;
  items: MonChuyenNganhRow[];
}

export interface CreateMonChuyenNganhInput {
  mon: string;
  chuyen_nganh: string;
  ghi_chu?: string | null;
}

export interface UpdateMonChuyenNganhInput {
  mon?: string;
  chuyen_nganh?: string;
  ghi_chu?: string | null;
}
