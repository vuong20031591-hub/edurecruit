import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { phongthiService } from '@/modules/phongthi/service';

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'phongthi.xepphong');
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const kyId = body.ky_tuyendung_id;
    if (!kyId || typeof kyId !== 'number') {
      return json({ error: 'Thiếu ky_tuyendung_id' }, { status: 400 });
    }
    const result = await phongthiService.sapXepTuDong(kyId, session);
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
