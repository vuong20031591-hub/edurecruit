import { NextRequest } from 'next/server';
import { handleApiError, requireAuth, json } from '@/server/api';
import { getDb } from '@/db';
import type { ThongBao } from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const userId = Number(session.sub);
    const db = getDb();

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);
    const offset = Number(url.searchParams.get('offset') ?? 0);

    const data = db.prepare(
      `SELECT * FROM thong_bao WHERE user_id = ?
       ORDER BY da_doc ASC, created_at DESC LIMIT ? OFFSET ?`
    ).all(userId, limit, offset) as ThongBao[];

    const { unreadCount } = db.prepare(
      `SELECT COUNT(*) AS unreadCount FROM thong_bao WHERE user_id = ? AND da_doc = 0`
    ).get(userId) as { unreadCount: number };

    return json({ data, unreadCount });
  } catch (err) {
    return handleApiError(err);
  }
}
