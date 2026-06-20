/**
 * users module - repository
 * File: src/modules/users/repository.ts
 */
import { getDb } from '@/db';
import type { User } from '@/db/schema';

export const usersRepository = {
  findById(id: number): User | null {
    const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    return row ?? null;
  },
  listAll(): User[] {
    return getDb().prepare('SELECT * FROM users ORDER BY id DESC').all() as User[];
  }
};

