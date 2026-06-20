/**
 * baocao module - service
 * File: src/modules/baocao/service.ts
 */
import { baocaoRepository } from './repository';

export const baocaoService = {
  async list(): Promise<unknown[]> {
    return baocaoRepository.listAll?.() ?? [];
  },
  async getById(id: number): Promise<unknown> {
    return baocaoRepository.findById?.(id);
  }
};

