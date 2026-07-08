import { NextRequest } from 'next/server';
import { handleApiError, requireAuth, json, ValidationError } from '@/server/api';
import { getDb } from '@/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const userId = Number(session.sub);
    const db = getDb();

    const body = await req.json() as { ids?: number[]; all?: boolean };

    if (body.all) {
      db.prepare(`UPDATE thong_bao SET da_doc = 1 WHERE user_id = ? AND da_doc = 0`).run(userId);
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      const placeholders = body.ids.map(() => '?').join(',');
      db.prepare(
        `UPDATE thong_bao SET da_doc = 1 WHERE user_id = ? AND id IN (${placeholders})`
      ).run(userId, ...body.ids);
    } else {
      throw new ValidationError('Cần ids hoặc all=true');
    }

    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
