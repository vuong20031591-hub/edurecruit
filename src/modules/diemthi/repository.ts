/**
 * diemthi module - repository
 * File: src/modules/diemthi/repository.ts
 */
import { getDb } from '@/db';
import type { DiemThi } from '@/db/schema';
import type { DiemThiFilter, DiemThiStats, DiemThiUpsert, DiemThiView, KhoaDiemResult } from './types';

export const diemthiRepository = {

  // ─── List ────────────────────────────────────────────────────────────────

  list(filter: DiemThiFilter): DiemThiView[] {
    const db = getDb();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.ky_tuyendung_id != null) {
      conditions.push('t.ky_tuyendung_id = ?');
      params.push(filter.ky_tuyendung_id);
    }
    if (filter.phongthi_id != null) {
      conditions.push('dt.phongthi_id = ?');
      params.push(filter.phongthi_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    return db.prepare(`
      SELECT
        dt.*,
        t.sbd,
        t.ho,
        t.ten,
        t.ho_ten,
        p.ma_phong,
        kq.diem_uu_tien
      FROM diemthi dt
      JOIN thisinh t ON t.id = dt.thisinh_id
      LEFT JOIN phongthi p ON p.id = dt.phongthi_id
      LEFT JOIN ketqua kq ON kq.thisinh_id = dt.thisinh_id
      ${where}
      ORDER BY t.sbd ASC NULLS LAST, t.ho_ten ASC
    `).all(...params) as DiemThiView[];
  },

  // ─── Stats ───────────────────────────────────────────────────────────────

  getStats(filter: DiemThiFilter): DiemThiStats {
    const db = getDb();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.ky_tuyendung_id != null) {
      conditions.push('t.ky_tuyendung_id = ?');
      params.push(filter.ky_tuyendung_id);
    }
    if (filter.phongthi_id != null) {
      conditions.push('dt.phongthi_id = ?');
      params.push(filter.phongthi_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = db.prepare(`
      SELECT dt.trang_thai_nhap
      FROM diemthi dt
      JOIN thisinh t ON t.id = dt.thisinh_id
      ${where}
    `).all(...params) as { trang_thai_nhap: string }[];

    let daNhap = 0, daKhoa = 0;
    for (const r of rows) {
      if (r.trang_thai_nhap === 'DaNhap') daNhap++;
      else if (r.trang_thai_nhap === 'DaKhoa') daKhoa++;
    }
    return {
      tongThiSinh: rows.length,
      daNhap,
      chuaNhap: rows.length - daNhap - daKhoa,
      daKhoa,
    };
  },

  // ─── Find by thisinh_id ───────────────────────────────────────────────────

  findByThiSinhId(thiSinhId: number): DiemThi | null {
    const row = getDb().prepare('SELECT * FROM diemthi WHERE thisinh_id = ?').get(thiSinhId);
    return (row as DiemThi) ?? null;
  },

  // ─── Upsert ───────────────────────────────────────────────────────────────
  // Nếu chưa có record → INSERT; nếu đã có → UPDATE

  upsert(data: DiemThiUpsert, userId: number): DiemThi {
    const db = getDb();

    const existing = db.prepare('SELECT * FROM diemthi WHERE thisinh_id = ?').get(data.thisinh_id) as DiemThi | undefined;

    if (!existing) {
      // INSERT
      const info = db.prepare(`
        INSERT INTO diemthi (thisinh_id, phongthi_id, diem_gk1, diem_gk2, vang_thi, bo_thi, ly_do_vang, trang_thai_nhap, ngay_nhap, nguoi_nhap)
        VALUES (@thisinh_id, @phongthi_id, @diem_gk1, @diem_gk2, @vang_thi, @bo_thi, @ly_do_vang, @trang_thai_nhap, datetime('now'), @nguoi_nhap)
      `).run({
        thisinh_id: data.thisinh_id,
        phongthi_id: data.phongthi_id ?? null,
        diem_gk1: data.diem_gk1 ?? null,
        diem_gk2: data.diem_gk2 ?? null,
        vang_thi: data.vang_thi ? 1 : 0,
        bo_thi: data.bo_thi ? 1 : 0,
        ly_do_vang: data.ly_do_vang ?? null,
        trang_thai_nhap: hasScore(data) ? 'DaNhap' : 'ChuaNhap',
        nguoi_nhap: userId,
      });
      return db.prepare('SELECT * FROM diemthi WHERE id = ?').get(info.lastInsertRowid) as DiemThi;
    } else {
      // UPDATE — không cho update nếu đã khóa
      if (existing.trang_thai_nhap === 'DaKhoa') {
        throw new Error('Điểm đã khóa, không thể chỉnh sửa');
      }

      const fields: string[] = [];
      const params: unknown[] = [];

      if (data.phongthi_id !== undefined) { fields.push('phongthi_id = ?'); params.push(data.phongthi_id ?? null); }
      if (data.diem_gk1 !== undefined) { fields.push('diem_gk1 = ?'); params.push(data.diem_gk1 ?? null); }
      if (data.diem_gk2 !== undefined) { fields.push('diem_gk2 = ?'); params.push(data.diem_gk2 ?? null); }
      if (data.vang_thi !== undefined) {
        fields.push('vang_thi = ?'); params.push(data.vang_thi ? 1 : 0);
        // Mutual exclusive: nếu set vang_thi=1 thì reset bo_thi=0
        if (data.vang_thi && data.bo_thi === undefined) {
          fields.push('bo_thi = ?'); params.push(0);
        }
      }
      if (data.bo_thi !== undefined) {
        fields.push('bo_thi = ?'); params.push(data.bo_thi ? 1 : 0);
        // Mutual exclusive: nếu set bo_thi=1 thì reset vang_thi=0
        if (data.bo_thi && data.vang_thi === undefined) {
          fields.push('vang_thi = ?'); params.push(0);
        }
      }
      if (data.ly_do_vang !== undefined) { fields.push('ly_do_vang = ?'); params.push(data.ly_do_vang ?? null); }

      // Cập nhật trạng thái và người nhập
      const mergedData: DiemThiUpsert & { diem_gk1?: number | null; diem_gk2?: number | null; vang_thi?: number | boolean; bo_thi?: number | boolean } = {
        thisinh_id: existing.thisinh_id,
        phongthi_id: data.phongthi_id !== undefined ? data.phongthi_id : existing.phongthi_id,
        diem_gk1: data.diem_gk1 !== undefined ? data.diem_gk1 : existing.diem_gk1,
        diem_gk2: data.diem_gk2 !== undefined ? data.diem_gk2 : existing.diem_gk2,
        vang_thi: data.vang_thi !== undefined ? data.vang_thi : existing.vang_thi,
        bo_thi: data.bo_thi !== undefined ? data.bo_thi : existing.bo_thi,
        ly_do_vang: data.ly_do_vang !== undefined ? data.ly_do_vang : existing.ly_do_vang,
      };
      const newTrangThai = hasScore(mergedData) ? 'DaNhap' : 'ChuaNhap';
      fields.push('trang_thai_nhap = ?'); params.push(newTrangThai);
      fields.push('ngay_nhap = datetime(\'now\')');
      fields.push('nguoi_nhap = ?'); params.push(userId);

      if (fields.length > 0) {
        params.push(existing.id);
        db.prepare(`UPDATE diemthi SET ${fields.join(', ')} WHERE id = ?`).run(...params);
      }
      return db.prepare('SELECT * FROM diemthi WHERE id = ?').get(existing.id) as DiemThi;
    }
  },

  // ─── Khóa điểm ───────────────────────────────────────────────────────────

  khoaDiem(phongthi_id: number, userId: number): KhoaDiemResult {
    const db = getDb();
    const tx = db.transaction(() => {
      const rows = db.prepare(
        "SELECT id, trang_thai_nhap FROM diemthi WHERE phongthi_id = ? AND trang_thai_nhap != 'DaKhoa'"
      ).all(phongthi_id) as { id: number; trang_thai_nhap: string }[];

      let locked = 0, skipped = 0;
      for (const row of rows) {
        if (row.trang_thai_nhap === 'ChuaNhap') { skipped++; continue; }
        db.prepare(`
          UPDATE diemthi SET trang_thai_nhap = 'DaKhoa', ngay_khoa = datetime('now'), nguoi_khoa = ? WHERE id = ?
        `).run(userId, row.id);
        locked++;
      }
      return { locked, skipped };
    });
    return tx();
  },

  // ─── Helpers ─────────────────────────────────────────────────────────────

  phongthi_exists(id: number): boolean {
    const row = getDb().prepare('SELECT id FROM phongthi WHERE id = ?').get(id);
    return !!row;
  },

  thisinh_exists(id: number): boolean {
    const row = getDb().prepare('SELECT id FROM thisinh WHERE id = ?').get(id);
    return !!row;
  },

  is_locked(thisinh_id: number): boolean {
    const row = getDb().prepare("SELECT trang_thai_nhap FROM diemthi WHERE thisinh_id = ?").get(thisinh_id) as { trang_thai_nhap: string } | undefined;
    return row?.trang_thai_nhap === 'DaKhoa';
  },

  findByThiSinhIdRaw(thisinh_id: number): DiemThi | undefined {
    return getDb().prepare('SELECT * FROM diemthi WHERE thisinh_id = ?').get(thisinh_id) as DiemThi | undefined;
  },
};

// Helper: có ít nhất 1 điểm được nhập không?
function hasScore(data: Partial<DiemThiUpsert & { diem_gk1?: number | null; diem_gk2?: number | null; vang_thi?: number | boolean; bo_thi?: number | boolean }>): boolean {
  const vang = data.vang_thi === 1 || data.vang_thi === true;
  const bo = data.bo_thi === 1 || data.bo_thi === true;
  return data.diem_gk1 != null || data.diem_gk2 != null || vang || bo;
}
