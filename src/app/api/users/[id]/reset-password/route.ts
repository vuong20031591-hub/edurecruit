import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { handleApiError, requirePerm, json, ValidationError, NotFoundError } from '@/server/api';
import { getDb } from '@/db';
import { audit } from '@/server/audit';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePerm(req, 'users.update');
    const { id } = await params;
    const userId = Number(id);
    const db = getDb();

    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!existing) throw new NotFoundError('User không tồn tại');

    const body = await req.json();
    const { password } = body;

    if (!password || password.length < 6) {
      throw new ValidationError('Mật khẩu tối thiểu 6 ký tự');
    }

    const password_hash = await bcrypt.hash(password, 10);
    db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(password_hash, userId);

    audit({
      userId: Number(session.sub),
      username: session.username,
      action: 'USER_RESET_PASSWORD',
      resourceType: 'user',
      resourceId: userId,
      result: 'SUCCESS',
    });

    return json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
