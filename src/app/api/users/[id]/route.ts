import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import {
  handleApiError, requirePerm, json,
  ValidationError, NotFoundError,
} from '@/server/api';
import { getDb } from '@/db';
import { audit } from '@/server/audit';
import type { User, Quyen, TrangThaiUser } from '@/db/schema';

type Params = { params: Promise<{ id: string }> };

const VALID_QUYEN: Quyen[] = ['ADMIN', 'TO_NHAP_HOSO', 'TO_NHAP_DIEM', 'LANH_DAO'];
const VALID_TRANG_THAI: TrangThaiUser[] = ['HoatDong', 'Khoa'];

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requirePerm(req, 'users.view');
    const { id } = await params;
    const db = getDb();
    const user = db.prepare(`
      SELECT id, username, ho_ten, email, quyen, trang_thai, last_login_at, created_at, updated_at
      FROM users WHERE id = ?
    `).get(Number(id)) as Omit<User, 'password_hash'> | undefined;

    if (!user) throw new NotFoundError('User không tồn tại');
    return json({ data: user });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePerm(req, 'users.update');
    const { id } = await params;
    const userId = Number(id);
    const db = getDb();

    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!existing) throw new NotFoundError('User không tồn tại');

    const body = await req.json();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (body.ho_ten !== undefined) {
      if (!body.ho_ten?.trim()) throw new ValidationError('ho_ten không được trống');
      sets.push('ho_ten = ?');
      values.push(body.ho_ten.trim());
    }
    if (body.email !== undefined) {
      sets.push('email = ?');
      values.push(body.email?.trim() || null);
    }
    if (body.quyen !== undefined) {
      if (!VALID_QUYEN.includes(body.quyen)) throw new ValidationError('quyen không hợp lệ');
      sets.push('quyen = ?');
      values.push(body.quyen);
    }
    if (body.trang_thai !== undefined) {
      if (!VALID_TRANG_THAI.includes(body.trang_thai)) throw new ValidationError('trang_thai không hợp lệ');
      sets.push('trang_thai = ?');
      values.push(body.trang_thai);
    }

    if (sets.length === 0) throw new ValidationError('Không có trường nào để cập nhật');

    sets.push("updated_at = datetime('now')");
    values.push(userId);

    db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare(`
      SELECT id, username, ho_ten, email, quyen, trang_thai, last_login_at, created_at, updated_at
      FROM users WHERE id = ?
    `).get(userId) as Omit<User, 'password_hash'>;

    audit({
      userId: Number(session.sub),
      username: session.username,
      action: 'USER_UPDATE',
      resourceType: 'user',
      resourceId: userId,
      result: 'SUCCESS',
    });

    return json({ data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePerm(req, 'users.delete');
    const { id } = await params;
    const userId = Number(id);

    if (userId === Number(session.sub)) {
      throw new ValidationError('Không thể xóa tài khoản đang đăng nhập');
    }

    const db = getDb();
    const existing = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId) as
      Pick<User, 'id' | 'username'> | undefined;
    if (!existing) throw new NotFoundError('User không tồn tại');

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    audit({
      userId: Number(session.sub),
      username: session.username,
      action: 'USER_DELETE',
      resourceType: 'user',
      resourceId: userId,
      result: 'SUCCESS',
    });

    return json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
