/**
 * mon-chuyen-nganh module - repository
 * File: src/modules/mon-chuyen-nganh/repository.ts
 */
import { getDb } from '@/db';
import type { MonChuyenNganhRow } from './types';

export const monChuyenNganhRepository = {
  /** Lấy tất cả, sắp xếp theo mon ASC rồi chuyen_nganh ASC */
  listAll(): MonChuyenNganhRow[] {
    const db = getDb();
    return db.prepare(`
      SELECT id, mon, chuyen_nganh, ghi_chu, created_at, updated_at
      FROM mon_chuyen_nganh_map
      ORDER BY mon ASC, chuyen_nganh ASC
    `).all() as MonChuyenNganhRow[];
  },

  /** Check 1 cặp (mon, chuyen_nganh) có tồn tại không */
  exists(mon: string, chuyenNganh: string): boolean {
    const db = getDb();
    const row = db.prepare(`
      SELECT 1 AS x FROM mon_chuyen_nganh_map
      WHERE LOWER(mon) = LOWER(?) AND LOWER(chuyen_nganh) = LOWER(?)
      LIMIT 1
    `).get(mon, chuyenNganh) as { x: number } | undefined;
    return !!row;
  },

  /** Lấy 1 row theo id */
  findById(id: number): MonChuyenNganhRow | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT id, mon, chuyen_nganh, ghi_chu, created_at, updated_at
      FROM mon_chuyen_nganh_map WHERE id = ?
    `).get(id) as MonChuyenNganhRow | undefined;
    return row ?? null;
  },

  insert(input: { mon: string; chuyen_nganh: string; ghi_chu?: string | null }): number {
    const db = getDb();
    const r = db.prepare(`
      INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh, ghi_chu)
      VALUES (?, ?, ?)
    `).run(input.mon.trim(), input.chuyen_nganh.trim(), input.ghi_chu ?? null);
    return Number(r.lastInsertRowid);
  },

  update(id: number, input: { mon?: string; chuyen_nganh?: string; ghi_chu?: string | null }): void {
    const db = getDb();
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    if (input.mon !== undefined) { sets.push('mon = ?'); params.push(input.mon.trim()); }
    if (input.chuyen_nganh !== undefined) { sets.push('chuyen_nganh = ?'); params.push(input.chuyen_nganh.trim()); }
    if (input.ghi_chu !== undefined) { sets.push('ghi_chu = ?'); params.push(input.ghi_chu); }
    if (sets.length === 0) return;
    sets.push("updated_at = datetime('now')");
    params.push(id);
    db.prepare(`UPDATE mon_chuyen_nganh_map SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  },

  delete(id: number): void {
    const db = getDb();
    db.prepare(`DELETE FROM mon_chuyen_nganh_map WHERE id = ?`).run(id);
  },

  /** Xóa tất cả chuyên ngành của 1 môn */
  deleteByMon(mon: string): number {
    const db = getDb();
    const r = db.prepare(`DELETE FROM mon_chuyen_nganh_map WHERE mon = ?`).run(mon);
    return Number(r.changes);
  },

  /** Lấy unique danh sách môn (dùng cho dropdown filter) */
  listDistinctMon(): string[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT DISTINCT mon FROM mon_chuyen_nganh_map
      ORDER BY mon ASC
    `).all() as Array<{ mon: string }>;
    return rows.map(r => r.mon);
  },
};
