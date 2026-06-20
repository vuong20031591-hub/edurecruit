/**
 * quyetdinh module - repository
 * File: src/modules/quyetdinh/repository.ts
 */
import { getDb } from '@/db';
import type { QuyetDinh } from '@/db/schema';

export const quyetdinhRepository = {
  findById(id: number): QuyetDinh | null {
    const row = getDb().prepare('SELECT * FROM quyetdinh WHERE id = ?').get(id) as QuyetDinh | undefined;
    return row ?? null;
  },
  listAll(): QuyetDinh[] {
    return getDb().prepare('SELECT * FROM quyetdinh ORDER BY id DESC').all() as QuyetDinh[];
  }
};

