/**
 * Bulk: duyệt TẤT CẢ hồ sơ "Chờ rà soát" trong 1 kỳ
 * File: src/app/api/hosso/bulk/duyet-all/route.ts
 *
 * POST /api/hosso/bulk/duyet-all
 * body: { ky_tuyendung_id: number }
 * response: { success, failed, errors: [{ id, message }] }
 */
import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { hossoService } from '@/modules/hosso/service';

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'hosso.rasoat');
    const body = await req.json() as { ky_tuyendung_id?: number };
    if (!body.ky_tuyendung_id) {
      return json({ error: 'Thiếu ky_tuyendung_id' }, { status: 400 });
    }
    const result = await hossoService.duyetAllChoRaSoat(body.ky_tuyendung_id, session);
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
