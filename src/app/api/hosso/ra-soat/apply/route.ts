/**
 * Apply kết quả rà soát tự động vào trạng thái hồ sơ
 * File: src/app/api/hosso/ra-soat/apply/route.ts
 *
 * POST /api/hosso/ra-soat/apply
 * body: { ky_tuyendung_id: number, only_ids?: number[] }
 *   - only_ids: optional, nếu có chỉ apply cho các ID này (apply theo filter đã chọn)
 *
 * Response bao gồm `snapshot` để client lưu localStorage cho rollback trong 5 phút.
 */
import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { raSoatService } from '@/modules/hosso/ra-soat-service';

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'hosso.rasoat');
    const body = await req.json() as {
      ky_tuyendung_id?: number;
      only_ids?: number[];
    };

    if (!body.ky_tuyendung_id) {
      return json({ error: 'Thiếu ky_tuyendung_id' }, { status: 400 });
    }

    const result = await raSoatService.applyToTrangThaiHoSo(
      body.ky_tuyendung_id,
      body.only_ids ?? null,
      session
    );
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
