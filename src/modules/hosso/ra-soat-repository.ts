/**
 * Rà soát tự động — Repository
 * File: src/modules/hosso/ra-soat-repository.ts
 */
import { getDb } from '@/db';
import type { RaSoatKetQua, ThiSinh, TrangThaiRaSoat } from '@/db/schema';

export interface RawThiSinhForCheck {
  id: number;
  ky_tuyendung_id: number;
  cccd: string | null;
  dien_thoai: string | null;
  email: string | null;
  ngay_sinh: string;
  gioi_tinh: string;
  vi_tri_dang_ky_id: number;
  chuyen_nganh: string | null;
  trinh_do_chuyen_mon: string | null;
  ten_truong_dao_tao: string | null;
  co_chung_chi_nvsp: number;
  loai_vi_tri: string | null;
  mon: string | null;
  /** PRD Bước 2: cần cho NĐ 179/2024 đối tượng ưu tiên */
  dan_toc: string | null;
  /** Ngày nộp hồ sơ (ISO date) */
  ngay_nop_ho_so: string | null;
}

export const raSoatRepository = {
  /**
   * Lấy tất cả thí sinh trong kỳ (kèm viTri.loai_vi_tri + mon) để chạy rules.
   * Trừ các hồ sơ đã khóa (is_profile_locked = 1) — theo nghiệp vụ Bước 2 chỉ rà soát
   * trước khi khóa.
   */
  listThiSinhForCheck(kyId: number): RawThiSinhForCheck[] {
    const db = getDb();
    return db.prepare(`
      SELECT
        t.id, t.ky_tuyendung_id, t.cccd, t.dien_thoai, t.email, t.ngay_sinh, t.gioi_tinh,
        t.vi_tri_dang_ky_id, t.chuyen_nganh, t.trinh_do_chuyen_mon,
        t.ten_truong_dao_tao, t.co_chung_chi_nvsp,
        t.dan_toc, t.ngay_nop_ho_so,
        v.loai_vi_tri, v.mon
      FROM thisinh t
      LEFT JOIN vitri_tuyendung v ON v.id = t.vi_tri_dang_ky_id
      WHERE t.ky_tuyendung_id = ? AND t.is_profile_locked = 0
    `).all(kyId) as RawThiSinhForCheck[];
  },

  /** Lấy 1 thí sinh theo id (kèm vị trí) — dùng cho chạy lại 1 hồ sơ */
  findThiSinhForCheck(id: number): RawThiSinhForCheck | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT
        t.id, t.ky_tuyendung_id, t.cccd, t.dien_thoai, t.email, t.ngay_sinh, t.gioi_tinh,
        t.vi_tri_dang_ky_id, t.chuyen_nganh, t.trinh_do_chuyen_mon,
        t.ten_truong_dao_tao, t.co_chung_chi_nvsp,
        t.dan_toc, t.ngay_nop_ho_so,
        v.loai_vi_tri, v.mon
      FROM thisinh t
      LEFT JOIN vitri_tuyendung v ON v.id = t.vi_tri_dang_ky_id
      WHERE t.id = ?
    `).get(id) as RawThiSinhForCheck | undefined;
    return row ?? null;
  },

  /**
   * Insert kết quả rà soát. Mỗi lần chạy sẽ tạo 1 bản ghi mới cho mỗi thí sinh.
   * Cần xem lịch sử → dùng getLatestForThiSinh().
   */
  insert(input: {
    thisinh_id: number;
    ky_tuyendung_id: number;
    trang_thai: TrangThaiRaSoat;
    diem_uu_tien: number;
    ly_do: string;
    nguoi_ra_soat: number | null;
  }): number {
    const db = getDb();
    const r = db.prepare(`
      INSERT INTO ra_soat_ket_qua
        (thisinh_id, ky_tuyendung_id, trang_thai, diem_uu_tien, ly_do, nguoi_ra_soat)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      input.thisinh_id,
      input.ky_tuyendung_id,
      input.trang_thai,
      input.diem_uu_tien,
      input.ly_do,
      input.nguoi_ra_soat
    );
    return Number(r.lastInsertRowid);
  },

  /**
   * Lấy kết quả rà soát mới nhất của 1 thí sinh (cho UI hiển thị cột "Kết quả RS" trong table).
   */
  getLatestForThiSinh(thisinhId: number): RaSoatKetQua | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT * FROM ra_soat_ket_qua
      WHERE thisinh_id = ?
      ORDER BY ngay_ra_soat DESC
      LIMIT 1
    `).get(thisinhId) as RaSoatKetQua | undefined;
    return row ?? null;
  },

  /**
   * Lấy kết quả mới nhất cho nhiều thí sinh (dùng khi list hồ sơ).
   * Trả về Map<thisinh_id, RaSoatKetQua>.
   */
  getLatestForMany(thisinhIds: number[]): Map<number, RaSoatKetQua> {
    if (thisinhIds.length === 0) return new Map();
    const db = getDb();
    const placeholders = thisinhIds.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT r.* FROM ra_soat_ket_qua r
      INNER JOIN (
        SELECT thisinh_id, MAX(ngay_ra_soat) AS max_ngay, MAX(id) AS max_id
        FROM ra_soat_ket_qua
        WHERE thisinh_id IN (${placeholders})
        GROUP BY thisinh_id
      ) latest ON latest.thisinh_id = r.thisinh_id
        AND latest.max_ngay = r.ngay_ra_soat
        AND latest.max_id = r.id
    `).all(...thisinhIds) as RaSoatKetQua[];
    const m = new Map<number, RaSoatKetQua>();
    for (const r of rows) m.set(r.thisinh_id, r);
    return m;
  },

  /**
   * Lấy kết quả mới nhất của tất cả thí sinh trong kỳ (mỗi thisinh 1 bản ghi).
   * Dùng cho Apply — lấy kết quả để map sang trang_thai_ho_so.
   * Trả về array kèm ly_do (text thô) để build thông tin cho user.
   */
  getLatestForKy(kyId: number): Array<RaSoatKetQua> {
    const db = getDb();
    return db.prepare(`
      SELECT r.* FROM ra_soat_ket_qua r
      INNER JOIN (
        SELECT thisinh_id, MAX(ngay_ra_soat) AS max_ngay, MAX(id) AS max_id
        FROM ra_soat_ket_qua
        WHERE ky_tuyendung_id = ?
        GROUP BY thisinh_id
      ) latest ON latest.thisinh_id = r.thisinh_id
        AND latest.max_ngay = r.ngay_ra_soat
        AND latest.max_id = r.id
      WHERE r.ky_tuyendung_id = ?
    `).all(kyId, kyId) as RaSoatKetQua[];
  },

  /**
   * Lấy trạng thái hiện tại của 1 thisinh (dùng cho Apply & Rollback để lưu history).
   */
  findTrangThaiHoSo(thisinhId: number): { trang_thai_ho_so: ThiSinh['trang_thai_ho_so']; ly_do_tu_choi: string | null } | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT trang_thai_ho_so, ly_do_tu_choi
      FROM thisinh
      WHERE id = ?
    `).get(thisinhId) as { trang_thai_ho_so: ThiSinh['trang_thai_ho_so']; ly_do_tu_choi: string | null } | undefined;
    return row ?? null;
  },

  /**
   * Lấy lịch sử rà soát của 1 thí sinh (sắp xếp mới nhất trước).
   * Dùng cho trang chi tiết hồ sơ.
   */
  getHistoryForThiSinh(thisinhId: number): RaSoatKetQua[] {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM ra_soat_ket_qua
      WHERE thisinh_id = ?
      ORDER BY ngay_ra_soat DESC
    `).all(thisinhId) as RaSoatKetQua[];
  },

  /**
   * Summary cho toàn kỳ — tổng hợp theo trạng thái.
   * Chỉ tính các kết quả mới nhất (mỗi thí sinh 1 bản ghi).
   */
  summaryByKy(kyId: number): { dat: number; canhBao: number; khongDat: number; tong: number } {
    const db = getDb();
    const row = db.prepare(`
      SELECT
        SUM(CASE WHEN r.trang_thai = 'Dat' THEN 1 ELSE 0 END) AS dat,
        SUM(CASE WHEN r.trang_thai = 'CanhBao' THEN 1 ELSE 0 END) AS canhBao,
        SUM(CASE WHEN r.trang_thai = 'KhongDat' THEN 1 ELSE 0 END) AS khongDat,
        COUNT(DISTINCT r.thisinh_id) AS tong
      FROM ra_soat_ket_qua r
      INNER JOIN (
        SELECT thisinh_id, MAX(ngay_ra_soat) AS max_ngay, MAX(id) AS max_id
        FROM ra_soat_ket_qua
        WHERE ky_tuyendung_id = ?
        GROUP BY thisinh_id
      ) latest ON latest.thisinh_id = r.thisinh_id
        AND latest.max_ngay = r.ngay_ra_soat
        AND latest.max_id = r.id
      WHERE r.ky_tuyendung_id = ?
    `).get(kyId, kyId) as { dat: number; canhBao: number; khongDat: number; tong: number } | undefined;
    return {
      dat: row?.dat ?? 0,
      canhBao: row?.canhBao ?? 0,
      khongDat: row?.khongDat ?? 0,
      tong: row?.tong ?? 0
    };
  },
};
