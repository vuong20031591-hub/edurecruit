/**
 * Bulk: khóa nhiều hồ sơ (chỉ khi đã duyệt HopLe + chưa khóa)
 * File: src/app/api/hosso/bulk/khoa/route.ts
 *
 * POST /api/hosso/bulk/khoa
 * body: { ids: number[] }
 * response: { success, failed, errors: [{ id, message }] }
 *
 * Permission: hosso.khoa
 */
import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { hossoService } from '@/modules/hosso/service';

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'hosso.khoa');
    const body = await req.json() as { ids?: number[] };
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return json({ error: 'Thiếu hoặc rỗng mảng ids' }, { status: 400 });
    }
    const result = await hossoService.bulkKhoa(
      body.ids.filter((id): id is number => typeof id === 'number'),
      session
    );
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
