/**
 * congthuc module - service
 * File: src/modules/congthuc/service.ts
 */
import { congthucRepository } from './repository';

export const congthucService = {
  async list(): Promise<unknown[]> {
    return congthucRepository.listAll?.() ?? [];
  },
  async getById(id: number): Promise<unknown> {
    return congthucRepository.findById?.(id);
  }
};

