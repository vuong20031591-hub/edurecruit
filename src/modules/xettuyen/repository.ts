/**
 * xettuyen module - repository
 * File: src/modules/xettuyen/repository.ts
 */
import { getDb } from '@/db';
import type { KetQua } from '@/db/schema';

export const xettuyenRepository = {
  findById(id: number): KetQua | null {
    const row = getDb().prepare('SELECT * FROM ketqua WHERE id = ?').get(id) as KetQua | undefined;
    return row ?? null;
  },
  listAll(): KetQua[] {
    return getDb().prepare('SELECT * FROM ketqua ORDER BY id DESC').all() as KetQua[];
  }
};

