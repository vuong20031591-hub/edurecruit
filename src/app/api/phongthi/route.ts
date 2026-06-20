import { NextRequest } from 'next/server';
import { handleApiError, requireAuth, requirePerm, json } from '@/server/api';
import { phongthiService } from '@/modules/phongthi/service';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const sp = req.nextUrl.searchParams;
    const kyId = sp.get('ky_tuyendung_id');
    const vitriId = sp.get('vi_tri_dang_ky_id');
    const statsOnly = sp.get('stats') === 'true';

    if (!kyId) return json({ error: 'Thiếu ky_tuyendung_id' }, { status: 400 });

    if (statsOnly) {
      const stats = await phongthiService.getStats(Number(kyId), session);
      return json(stats);
    }

    const data = await phongthiService.list({
      ky_tuyendung_id: Number(kyId),
      vi_tri_dang_ky_id: vitriId ? Number(vitriId) : undefined,
    }, session);
    return json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'phongthi.create');
    const body = await req.json();
    const created = await phongthiService.create(body, session);
    return json(created, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
