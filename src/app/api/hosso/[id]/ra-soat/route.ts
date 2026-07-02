/**
 * Lịch sử rà soát của 1 thí sinh
 * File: src/app/api/hosso/[id]/ra-soat/route.ts
 *
 * GET /api/hosso/[id]/ra-soat
 *   - Trả về danh sách kết quả rà soát theo thời gian (mới nhất trước)
 */
import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { raSoatService } from '@/modules/hosso/ra-soat-service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm(req, 'hosso.view');
    const { id } = await params;
    const thisinhId = Number(id);
    if (!Number.isFinite(thisinhId) || thisinhId <= 0) {
      return json({ error: 'ID thí sinh không hợp lệ' }, { status: 400 });
    }
    const history = await raSoatService.getHistory(thisinhId, session);
    return json({ thisinh_id: thisinhId, history });
  } catch (err) {
    return handleApiError(err);
  }
}
