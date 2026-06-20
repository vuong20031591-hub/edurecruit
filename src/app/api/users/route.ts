import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { handleApiError, requirePerm, json, ValidationError, ConflictError } from '@/server/api';
import { getDb } from '@/db';
import { audit } from '@/server/audit';
import type { User, Quyen, TrangThaiUser } from '@/db/schema';

export async function GET(req: NextRequest) {
  try {
    await requirePerm(req, 'users.view');
    const db = getDb();

    const rows = db.prepare(`
      SELECT id, username, ho_ten, email, quyen, trang_thai, last_login_at, created_at, updated_at
      FROM users
      ORDER BY quyen ASC, ho_ten ASC
    `).all() as Omit<User, 'password_hash'>[];

    return json({ data: rows });
  } catch (err) {
    return handleApiError(err);
  }
}

const VALID_QUYEN: Quyen[] = ['ADMIN', 'TO_NHAP_HOSO', 'TO_NHAP_DIEM', 'LANH_DAO'];
const VALID_TRANG_THAI: TrangThaiUser[] = ['HoatDong', 'Khoa'];

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'users.create');
    const body = await req.json();
    const { username, ho_ten, email, quyen, password } = body;

    if (!username || !ho_ten || !password) {
      throw new ValidationError('username, ho_ten, password là bắt buộc');
    }
    if (!VALID_QUYEN.includes(quyen)) {
      throw new ValidationError('quyen không hợp lệ');
    }
    if (password.length < 6) {
      throw new ValidationError('Mật khẩu tối thiểu 6 ký tự');
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      throw new ConflictError('Username đã tồn tại');
    }

    const password_hash = await bcrypt.hash(password, 10);
    const trang_thai: TrangThaiUser = body.trang_thai && VALID_TRANG_THAI.includes(body.trang_thai)
      ? body.trang_thai
      : 'HoatDong';

    const result = db.prepare(`
      INSERT INTO users (username, password_hash, ho_ten, email, quyen, trang_thai)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(username.trim(), password_hash, ho_ten.trim(), email?.trim() || null, quyen, trang_thai);

    const newUser = db.prepare(`
      SELECT id, username, ho_ten, email, quyen, trang_thai, last_login_at, created_at, updated_at
      FROM users WHERE id = ?
    `).get(result.lastInsertRowid) as Omit<User, 'password_hash'>;

    audit({
      userId: Number(session.sub),
      username: session.username,
      action: 'USER_CREATE',
      resourceType: 'user',
      resourceId: newUser.id,
      result: 'SUCCESS',
    });

    return json({ data: newUser }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
