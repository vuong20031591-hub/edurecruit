/**
 * Auth module - types
 * File: src/modules/auth/types.ts
 */
import type { User, Quyen } from '@/db/schema';

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResult {
  user: PublicUser;
  token: string;
  expiresAt: string;
}

export type PublicUser = Omit<User, 'password_hash'>;

export interface CurrentSession {
  userId: number;
  username: string;
  ho_ten: string;
  quyen: Quyen;
  exp: number;
}

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}
