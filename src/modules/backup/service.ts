/**
 * backup module - service
 * File: src/modules/backup/service.ts
 */
import { backupRepository } from './repository';

export const backupService = {
  async list(): Promise<unknown[]> {
    return backupRepository.listAll?.() ?? [];
  },
  async getById(id: number): Promise<unknown> {
    return backupRepository.findById?.(id);
  }
};

