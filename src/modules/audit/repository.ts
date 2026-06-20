/**
 * audit module - repository
 * File: src/modules/audit/repository.ts
 */
import { getDb } from '@/db';
import type { LogHeThong } from '@/db/schema';

export const auditRepository = {
  findById(id: number): LogHeThong | null {
    const row = getDb().prepare('SELECT * FROM log_he_thong WHERE id = ?').get(id) as LogHeThong | undefined;
    return row ?? null;
  },
  listAll(): LogHeThong[] {
    return getDb().prepare('SELECT * FROM log_he_thong ORDER BY id DESC').all() as LogHeThong[];
  }
};

