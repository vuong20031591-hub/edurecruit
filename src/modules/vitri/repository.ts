/**
 * vitri module - repository
 * File: src/modules/vitri/repository.ts
 */
import { getDb } from '@/db';
import type { ViTriTuyenDung, DonViTuyenDung, ViTriDonVi } from '@/db/schema';
import type { ViTriFilter, ViTriView } from './types';

interface CountRow { c: number; }
interface DonViCountRow { c: number; }

export const vitriRepository = {
  findById(id: number): ViTriTuyenDung | null {
    const row = getDb()
      .prepare('SELECT * FROM vitri_tuyendung WHERE id = ?')
      .get(id) as ViTriTuyenDung | undefined;
    return row ?? null;
  },

  findByMa(kyId: number, maViTri: string): ViTriTuyenDung | null {
    const row = getDb()
      .prepare('SELECT * FROM vitri_tuyendung WHERE ky_tuyendung_id = ? AND ma_vi_tri = ?')
      .get(kyId, maViTri) as ViTriTuyenDung | undefined;
    return row ?? null;
  },

  list(filter: ViTriFilter): ViTriView[] {
    const db = getDb();
    const where: string[] = [];
    const params: unknown[] = [];

    if (filter.ky_tuyendung_id !== undefined) {
      where.push('v.ky_tuyendung_id = ?');
      params.push(filter.ky_tuyendung_id);
    }
    if (filter.mon) {
      where.push('v.mon = ?');
      params.push(filter.mon);
    }
    if (filter.cap_hoc) {
      where.push('v.cap_hoc = ?');
      params.push(filter.cap_hoc);
    }
    if (filter.hinh_thuc_thi) {
      where.push('v.hinh_thuc_thi = ?');
      params.push(filter.hinh_thuc_thi);
    }
    if (filter.search) {
      where.push('(v.ma_vi_tri LIKE ? OR v.mon LIKE ?)');
      const kw = `%${filter.search}%`;
      params.push(kw, kw);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.max(1, Math.min(200, filter.pageSize ?? 20));
    const offset = (page - 1) * pageSize;

    const sql = `
      SELECT
        v.*,
        k.ten_ky AS ky_ten,
        (SELECT COUNT(*) FROM thisinh t WHERE t.vi_tri_dang_ky_id = v.id) AS soThiSinh,
        (SELECT COUNT(*) FROM vitri_donvi vd WHERE vd.vitri_tuyendung_id = v.id) AS donViCount
      FROM vitri_tuyendung v
      LEFT JOIN ky_tuyendung k ON v.ky_tuyendung_id = k.id
      ${whereClause}
      ORDER BY v.mon ASC, v.cap_hoc ASC, v.id ASC
      LIMIT ? OFFSET ?
    `;
    return db.prepare(sql).all(...params, pageSize, offset) as ViTriView[];
  },

  count(filter: ViTriFilter): number {
    const db = getDb();
    const where: string[] = [];
    const params: unknown[] = [];

    if (filter.ky_tuyendung_id !== undefined) {
      where.push('ky_tuyendung_id = ?');
      params.push(filter.ky_tuyendung_id);
    }
    if (filter.mon) {
      where.push('mon = ?');
      params.push(filter.mon);
    }
    if (filter.cap_hoc) {
      where.push('cap_hoc = ?');
      params.push(filter.cap_hoc);
    }
    if (filter.hinh_thuc_thi) {
      where.push('hinh_thuc_thi = ?');
      params.push(filter.hinh_thuc_thi);
    }
    if (filter.search) {
      where.push('(ma_vi_tri LIKE ? OR mon LIKE ?)');
      const kw = `%${filter.search}%`;
      params.push(kw, kw);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const row = db
      .prepare(`SELECT COUNT(*) AS c FROM vitri_tuyendung ${whereClause}`)
      .get(...params) as CountRow;
    return row.c;
  },

  listAll(kyId?: number): ViTriTuyenDung[] {
    const db = getDb();
    if (kyId !== undefined) {
      return db
        .prepare('SELECT * FROM vitri_tuyendung WHERE ky_tuyendung_id = ? ORDER BY mon, cap_hoc')
        .all(kyId) as ViTriTuyenDung[];
    }
    return db
      .prepare('SELECT * FROM vitri_tuyendung ORDER BY mon, cap_hoc')
      .all() as ViTriTuyenDung[];
  },

  countThiSinh(vitriId: number): number {
    const row = getDb()
      .prepare('SELECT COUNT(*) AS c FROM thisinh WHERE vi_tri_dang_ky_id = ?')
      .get(vitriId) as CountRow;
    return row.c;
  },

  create(data: import('@/db/schema').ViTriCreate): ViTriTuyenDung {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO vitri_tuyendung (
        ky_tuyendung_id, ma_vi_tri, mon, cap_hoc, loai_vi_tri,
        so_luong, hinh_thuc_thi, diem_chuan, thu_tu_uu_tien_dong_diem, ghi_chu
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      data.ky_tuyendung_id,
      data.ma_vi_tri,
      data.mon,
      data.cap_hoc,
      data.loai_vi_tri,
      data.so_luong,
      data.hinh_thuc_thi,
      data.diem_chuan ?? null,
      data.thu_tu_uu_tien_dong_diem ?? null,
      data.ghi_chu ?? null
    );
    return this.findById(Number(info.lastInsertRowid))!;
  },

  update(id: number, data: import('@/db/schema').ViTriUpdate): ViTriTuyenDung {
    const fields: string[] = [];
    const params: unknown[] = [];

    const map: Record<string, string> = {
      ky_tuyendung_id: 'ky_tuyendung_id',
      ma_vi_tri: 'ma_vi_tri',
      mon: 'mon',
      cap_hoc: 'cap_hoc',
      loai_vi_tri: 'loai_vi_tri',
      so_luong: 'so_luong',
      hinh_thuc_thi: 'hinh_thuc_thi',
      diem_chuan: 'diem_chuan',
      thu_tu_uu_tien_dong_diem: 'thu_tu_uu_tien_dong_diem',
      ghi_chu: 'ghi_chu'
    };

    for (const [k, col] of Object.entries(map)) {
      if (k in data) {
        fields.push(`${col} = ?`);
        params.push((data as Record<string, unknown>)[k] ?? null);
      }
    }

    if (fields.length === 0) {
      return this.findById(id)!;
    }

    params.push(id);
    getDb().prepare(`UPDATE vitri_tuyendung SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id)!;
  },

  delete(id: number): void {
    getDb().prepare('DELETE FROM vitri_tuyendung WHERE id = ?').run(id);
  },

  getDonViByViTri(vitriId: number): DonViTuyenDung[] {
    return getDb()
      .prepare(`
        SELECT d.*
        FROM don_vi_tuyen_dung d
        INNER JOIN vitri_donvi vd ON vd.don_vi_tuyen_dung_id = d.id
        WHERE vd.vitri_tuyendung_id = ?
        ORDER BY d.ten_don_vi
      `)
      .all(vitriId) as DonViTuyenDung[];
  },

  getMappingByViTri(vitriId: number): ViTriDonVi[] {
    return getDb()
      .prepare('SELECT * FROM vitri_donvi WHERE vitri_tuyendung_id = ?')
      .all(vitriId) as ViTriDonVi[];
  },

  replaceMapping(vitriId: number, items: { don_vi_id: number; so_luong_phan_bo: number }[]): void {
    const db = getDb();
    const txn = db.transaction(() => {
      db.prepare('DELETE FROM vitri_donvi WHERE vitri_tuyendung_id = ?').run(vitriId);
      const insert = db.prepare(`
        INSERT INTO vitri_donvi (vitri_tuyendung_id, don_vi_tuyen_dung_id, so_luong_phan_bo)
        VALUES (?, ?, ?)
      `);
      for (const it of items) {
        insert.run(vitriId, it.don_vi_id, it.so_luong_phan_bo);
      }
    });
    txn();
  },

  countDonViMapping(vitriId: number): number {
    const row = getDb()
      .prepare('SELECT COUNT(*) AS c FROM vitri_donvi WHERE vitri_tuyendung_id = ?')
      .get(vitriId) as DonViCountRow;
    return row.c;
  },

  sumChiTieu(vitriId: number): number {
    const row = getDb()
      .prepare('SELECT COALESCE(SUM(so_luong_phan_bo), 0) AS c FROM vitri_donvi WHERE vitri_tuyendung_id = ?')
      .get(vitriId) as CountRow;
    return row.c;
  },

  kyExists(kyId: number): boolean {
    const row = getDb()
      .prepare('SELECT 1 AS ok FROM ky_tuyendung WHERE id = ?')
      .get(kyId) as { ok: number } | undefined;
    return !!row;
  },

  donViExistsInKy(donViId: number, kyId: number): boolean {
    const row = getDb()
      .prepare('SELECT 1 AS ok FROM don_vi_tuyen_dung WHERE id = ? AND ky_tuyendung_id = ?')
      .get(donViId, kyId) as { ok: number } | undefined;
    return !!row;
  }
};
