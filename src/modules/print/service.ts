/**
 * print module - service
 * File: src/modules/print/service.ts
 */
import { printRepository } from './repository';

export const printService = {
  async list(): Promise<unknown[]> {
    return printRepository.listAll?.() ?? [];
  },
  async getById(id: number): Promise<unknown> {
    return printRepository.findById?.(id);
  }
};

