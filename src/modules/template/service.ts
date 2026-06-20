/**
 * template module - service
 * File: src/modules/template/service.ts
 */
import { templateRepository } from './repository';

export const templateService = {
  async list(): Promise<unknown[]> {
    return templateRepository.listAll?.() ?? [];
  },
  async getById(id: number): Promise<unknown> {
    return templateRepository.findById?.(id);
  }
};

