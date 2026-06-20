/**
 * excel module - repository
 * File: src/modules/excel/repository.ts
 */
import { getDb } from '@/db';
import type { ImportBatch } from '@/db/schema';

export const excelRepository = {
  findById(id: number): ImportBatch | null {
    const row = getDb().prepare('SELECT * FROM import_batches WHERE id = ?').get(id) as ImportBatch | undefined;
    return row ?? null;
  },
  listAll(): ImportBatch[] {
    return getDb().prepare('SELECT * FROM import_batches ORDER BY id DESC').all() as ImportBatch[];
  }
};

