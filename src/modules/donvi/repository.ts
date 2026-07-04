/**
 * donvi module - repository
 * File: src/modules/donvi/repository.ts
 */
import { getDb } from '@/db';
import type { DonViTuyenDung, DonViCreate } from '@/db/schema';
import type { DonViFilter, DonViView, PaginatedDonVi } from './types';

interface CountRow { c: number }

export const donviRepository = {
  findById(id: number): DonViTuyenDung | null {
    const row = getDb()
      .prepare('SELECT * FROM don_vi_tuyen_dung WHERE id = ?')
      .get(id) as DonViTuyenDung | undefined;
    return row ?? null;
  },

  findByMa(kyId: number, maDonVi: string): DonViTuyenDung | null {
    const row = getDb()
      .prepare('SELECT * FROM don_vi_tuyen_dung WHERE ky_tuyendung_id = ? AND ma_don_vi = ?')
      .get(kyId, maDonVi) as DonViTuyenDung | undefined;
    return row ?? null;
  },

  listAll(kyId: number): DonViTuyenDung[] {
    return getDb()
      .prepare('SELECT * FROM don_vi_tuyen_dung WHERE ky_tuyendung_id = ? ORDER BY ten_don_vi')
      .all(kyId) as DonViTuyenDung[];
  },

  countThiSinh(donViId: number): number {
    const row = getDb()
      .prepare('SELECT COUNT(*) AS c FROM thisinh WHERE don_vi_du_tuyen_id = ?')
      .get(donViId) as CountRow;
    return row.c;
  },

  count(filter: DonViFilter): number {
    const { where, params } = buildWhere(filter);
    const row = getDb()
      .prepare(`SELECT COUNT(*) AS c FROM don_vi_tuyen_dung d ${where}`)
      .get(...params) as CountRow;
    return row.c;
  },

  list(filter: DonViFilter): PaginatedDonVi {
    const { where, params } = buildWhere(filter);
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(200, Math.max(1, filter.pageSize ?? 20));
    const offset = (page - 1) * pageSize;

    const data = getDb()
      .prepare(`
        SELECT
          d.*,
          k.ten_ky AS ky_ten,
          (SELECT COUNT(*) FROM thisinh t WHERE t.don_vi_du_tuyen_id = d.id) AS so_thi_sinh,
          (SELECT COUNT(*) FROM vitri_donvi vd WHERE vd.don_vi_tuyen_dung_id = d.id) AS so_vi_tri
        FROM don_vi_tuyen_dung d
        LEFT JOIN ky_tuyendung k ON d.ky_tuyendung_id = k.id
        ${where}
        ORDER BY d.id DESC
        LIMIT ? OFFSET ?
      `)
      .all(...params, pageSize, offset) as Array<DonViTuyenDung & {
        ky_ten: string | null;
        so_thi_sinh: number;
        so_vi_tri: number;
      }>;

    const total = this.count(filter);

    const view: DonViView[] = data.map((r) => ({
      ...r,
      kyTen: r.ky_ten ?? undefined,
      soThiSinh: r.so_thi_sinh,
      soViTri: r.so_vi_tri
    }));

    return { data: view, total, page, pageSize };
  },

  create(data: DonViCreate): DonViTuyenDung {
    const stmt = getDb().prepare(`
      INSERT INTO don_vi_tuyen_dung (
        ky_tuyendung_id, ma_don_vi, ten_don_vi, cap_hoc,
        dia_chi, so_dien_thoai, nguoi_lien_he, ghi_chu, so_chi_tieu
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      data.ky_tuyendung_id,
      data.ma_don_vi,
      data.ten_don_vi,
      data.cap_hoc,
      data.dia_chi ?? null,
      data.so_dien_thoai ?? null,
      data.nguoi_lien_he ?? null,
      data.ghi_chu ?? null,
      data.so_chi_tieu ?? 0
    );
    return this.findById(Number(info.lastInsertRowid))!;
  },

  update(id: number, data: Partial<DonViTuyenDung>): DonViTuyenDung | null {
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, string> = {
      ma_don_vi: 'ma_don_vi',
      ten_don_vi: 'ten_don_vi',
      cap_hoc: 'cap_hoc',
      dia_chi: 'dia_chi',
      so_dien_thoai: 'so_dien_thoai',
      nguoi_lien_he: 'nguoi_lien_he',
      ghi_chu: 'ghi_chu',
      so_chi_tieu: 'so_chi_tieu'
    };
    for (const key of Object.keys(map)) {
      const k = key as keyof DonViTuyenDung;
      if (k in data) {
        fields.push(`${map[key]} = ?`);
        params.push((data as Record<string, unknown>)[k] ?? null);
      }
    }
    if (fields.length === 0) return this.findById(id);
    params.push(id);
    getDb()
      .prepare(`UPDATE don_vi_tuyen_dung SET ${fields.join(', ')} WHERE id = ?`)
      .run(...params);
    return this.findById(id);
  },

  delete(id: number): void {
    getDb().prepare('DELETE FROM don_vi_tuyen_dung WHERE id = ?').run(id);
  }
};

function buildWhere(filter: DonViFilter): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.ky_tuyendung_id !== undefined) {
    conditions.push('d.ky_tuyendung_id = ?');
    params.push(filter.ky_tuyendung_id);
  }
  if (filter.cap_hoc) {
    conditions.push('d.cap_hoc = ?');
    params.push(filter.cap_hoc);
  }
  if (filter.search && filter.search.trim() !== '') {
    const like = `%${filter.search.trim()}%`;
    conditions.push('(d.ma_don_vi LIKE ? OR d.ten_don_vi LIKE ?)');
    params.push(like, like);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}
