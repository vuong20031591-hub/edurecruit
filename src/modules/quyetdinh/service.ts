/**
 * quyetdinh module - service
 * File: src/modules/quyetdinh/service.ts
 */
import { quyetdinhRepository } from './repository';

export const quyetdinhService = {
  async list(): Promise<unknown[]> {
    return quyetdinhRepository.listAll?.() ?? [];
  },
  async getById(id: number): Promise<unknown> {
    return quyetdinhRepository.findById?.(id);
  }
};

