/**
 * Rà soát tự động — API
 * File: src/app/api/hosso/ra-soat/route.ts
 *
 * POST /api/hosso/ra-soat
 *   body: { ky_tuyendung_id: number, thisinh_id?: number, dry_run?: boolean }
 *   - Nếu có thisinh_id: rà soát 1 hồ sơ
 *   - Nếu không: rà soát toàn kỳ
 *   - dry_run: chỉ preview, không lưu DB
 */
import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { raSoatService } from '@/modules/hosso/ra-soat-service';

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'hosso.rasoat');
    const body = await req.json() as {
      ky_tuyendung_id?: number;
      thisinh_id?: number;
      dry_run?: boolean;
    };

    if (body.thisinh_id) {
      // Rà soát 1 thí sinh
      const result = await raSoatService.runForThiSinh(body.thisinh_id, session);
      return json({ ...result, thisinh_id: body.thisinh_id });
    }

    if (!body.ky_tuyendung_id) {
      return json({ error: 'Thiếu ky_tuyendung_id hoặc thisinh_id' }, { status: 400 });
    }

    // Dry run → chỉ preview
    if (body.dry_run) {
      const preview = await raSoatService.previewForKy(body.ky_tuyendung_id, session);
      return json(preview);
    }

    const result = await raSoatService.runForKy(body.ky_tuyendung_id, session);
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
