/**
 * audit module - service
 * File: src/modules/audit/service.ts
 */
import { auditRepository } from './repository';

export const auditService = {
  async list(): Promise<unknown[]> {
    return auditRepository.listAll?.() ?? [];
  },
  async getById(id: number): Promise<unknown> {
    return auditRepository.findById?.(id);
  }
};

