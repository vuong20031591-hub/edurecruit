/**
 * users module - service
 * File: src/modules/users/service.ts
 */
import { usersRepository } from './repository';

export const usersService = {
  async list(): Promise<unknown[]> {
    return usersRepository.listAll?.() ?? [];
  },
  async getById(id: number): Promise<unknown> {
    return usersRepository.findById?.(id);
  }
};

