/**
 * Auth module - service
 * File: src/modules/auth/service.ts
 */
import { authRepository } from './repository';
import { signSession, verifyPassword, hashPassword, type Session } from '@/server/auth';
import { audit } from '@/server/audit';
import { UnauthorizedError, ValidationError } from '@/server/api';
import type { LoginInput, LoginResult, PublicUser, ChangePasswordInput } from './types';

function toPublicUser(u: import('@/db/schema').User): PublicUser {
  const { password_hash, ...rest } = u;
  return rest;
}

export const authService = {
  async login(input: LoginInput, meta?: { ip?: string; ua?: string }): Promise<LoginResult> {
    const user = authRepository.findByUsername(input.username);
    if (!user || user.trang_thai !== 'HoatDong') {
      audit({ action: 'LOGIN_FAIL', username: input.username, result: 'FAILURE', errorMessage: 'User not found or inactive', ipAddress: meta?.ip, userAgent: meta?.ua });
      throw new UnauthorizedError('Sai tên đăng nhập hoặc mật khẩu');
    }
    const ok = await verifyPassword(input.password, user.password_hash);
    if (!ok) {
      audit({ action: 'LOGIN_FAIL', username: input.username, userId: user.id, result: 'FAILURE', errorMessage: 'Bad password', ipAddress: meta?.ip, userAgent: meta?.ua });
      throw new UnauthorizedError('Sai tên đăng nhập hoặc mật khẩu');
    }
    authRepository.updateLastLogin(user.id);
    const token = await signSession({
      sub: String(user.id),
      username: user.username,
      quyen: user.quyen,
      ho_ten: user.ho_ten
    });
    audit({ action: 'LOGIN_SUCCESS', userId: user.id, username: user.username, ipAddress: meta?.ip, userAgent: meta?.ua });
    return {
      user: toPublicUser(user),
      token,
      expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString()
    };
  },

  async logout(session: Session | null, meta?: { ip?: string; ua?: string }): Promise<void> {
    if (session) {
      audit({ action: 'LOGOUT', userId: Number(session.sub), username: session.username, ipAddress: meta?.ip, userAgent: meta?.ua });
    }
  },

  async changePassword(userId: number, input: ChangePasswordInput): Promise<void> {
    const user = authRepository.findById(userId);
    if (!user) throw new ValidationError('User không tồn tại');
    const ok = await verifyPassword(input.oldPassword, user.password_hash);
    if (!ok) throw new ValidationError('Mật khẩu cũ không đúng');
    if (input.newPassword.length < 6) throw new ValidationError('Mật khẩu mới phải >= 6 ký tự');
    const hash = await hashPassword(input.newPassword);
    authRepository.updatePassword(userId, hash);
  },

  getMe(userId: number): PublicUser | null {
    const u = authRepository.findById(userId);
    return u ? toPublicUser(u) : null;
  }
};
