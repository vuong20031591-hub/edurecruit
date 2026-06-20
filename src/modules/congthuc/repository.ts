/**
 * congthuc module - repository
 * File: src/modules/congthuc/repository.ts
 */
import { getDb } from '@/db';
import type { CongThucXetTuyen } from '@/db/schema';

export const congthucRepository = {
  findById(id: number): CongThucXetTuyen | null {
    const row = getDb().prepare('SELECT * FROM congthuc_xettuyen WHERE id = ?').get(id) as CongThucXetTuyen | undefined;
    return row ?? null;
  },
  listAll(): CongThucXetTuyen[] {
    return getDb().prepare('SELECT * FROM congthuc_xettuyen ORDER BY id DESC').all() as CongThucXetTuyen[];
  }
};

