/**
 * Bulk: duyệt nhiều hồ sơ (chuyển ChoRaSoat → HopLe)
 * File: src/app/api/hosso/bulk/duyet/route.ts
 *
 * POST /api/hosso/bulk/duyet
 * body: { ids: number[] }
 * response: { success, failed, errors: [{ id, message }] }
 *
 * Permission: hosso.rasoat
 */
import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { hossoService } from '@/modules/hosso/service';

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'hosso.rasoat');
    const body = await req.json() as { ids?: number[] };
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return json({ error: 'Thiếu hoặc rỗng mảng ids' }, { status: 400 });
    }
    const result = await hossoService.bulkDuyet(
      body.ids.filter((id): id is number => typeof id === 'number'),
      session
    );
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
