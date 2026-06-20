import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { hossoService } from '@/modules/hosso/service';

/**
 * POST /api/hosso/khoa
 * Body: { ky_tuyendung_id: number }
 *
 * Khóa toàn bộ hồ sơ HopLe trong kỳ (Bước 2 PRD).
 * Sau khi khóa không ai được sửa thông tin cá nhân nữa.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'hosso.khoa');
    const body = await req.json() as { ky_tuyendung_id?: unknown };
    const kyId = body.ky_tuyendung_id;
    if (!kyId || typeof kyId !== 'number') {
      return json({ error: 'Thiếu ky_tuyendung_id' }, { status: 400 });
    }
    const result = await hossoService.lockAllHopLe(kyId, session);
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
