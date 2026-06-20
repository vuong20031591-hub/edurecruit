/**
 * excel module - service
 * File: src/modules/excel/service.ts
 */
import { excelRepository } from './repository';

export const excelService = {
  async list(): Promise<unknown[]> {
    return excelRepository.listAll?.() ?? [];
  },
  async getById(id: number): Promise<unknown> {
    return excelRepository.findById?.(id);
  }
};

