/**
 * template module - repository
 * File: src/modules/template/repository.ts
 */
import { getDb } from '@/db';
import type { WordTemplate } from '@/db/schema';

export const templateRepository = {
  findById(id: number): WordTemplate | null {
    const row = getDb().prepare('SELECT * FROM word_templates WHERE id = ?').get(id) as WordTemplate | undefined;
    return row ?? null;
  },
  listAll(): WordTemplate[] {
    return getDb().prepare('SELECT * FROM word_templates ORDER BY id DESC').all() as WordTemplate[];
  }
};

