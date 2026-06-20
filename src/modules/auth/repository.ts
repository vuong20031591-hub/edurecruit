/**
 * Auth module - repository
 * File: src/modules/auth/repository.ts
 */
import { getDb } from '@/db';
import type { User } from '@/db/schema';

export const authRepository = {
  findByUsername(username: string): User | null {
    const row = getDb()
      .prepare('SELECT * FROM users WHERE username = ?')
      .get(username) as User | undefined;
    return row ?? null;
  },

  findById(id: number): User | null {
    const row = getDb()
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as User | undefined;
    return row ?? null;
  },

  listAll(): User[] {
    return getDb()
      .prepare('SELECT * FROM users ORDER BY username')
      .all() as User[];
  },

  updateLastLogin(id: number): void {
    getDb()
      .prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?")
      .run(id);
  },

  updatePassword(id: number, passwordHash: string): void {
    getDb()
      .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(passwordHash, id);
  },

  setStatus(id: number, trang_thai: 'HoatDong' | 'Khoa'): void {
    getDb()
      .prepare('UPDATE users SET trang_thai = ? WHERE id = ?')
      .run(trang_thai, id);
  }
};
