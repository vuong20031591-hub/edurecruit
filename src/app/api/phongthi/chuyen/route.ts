import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { phongthiService } from '@/modules/phongthi/service';

/**
 * POST /api/phongthi/chuyen
 * Body: { ts_ids: number[], phong_moi_id: number }
 *
 * Chuyển nhiều thí sinh sang 1 phòng khác (cùng vị trí).
 * Validate: cùng vị trí, phòng đích còn chỗ, điểm chưa khóa.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'phongthi.xepphong');
    const body = await req.json() as { ts_ids?: unknown; phong_moi_id?: unknown };
    const tsIds = Array.isArray(body.ts_ids) ? (body.ts_ids as unknown[]).filter((n): n is number => typeof n === 'number') : [];
    const phongMoiId = typeof body.phong_moi_id === 'number' ? body.phong_moi_id : null;
    if (!phongMoiId) return json({ error: 'Thiếu phong_moi_id' }, { status: 400 });
    const result = await phongthiService.chuyenPhong(tsIds, phongMoiId, session);
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
