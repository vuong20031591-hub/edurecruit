import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { diemthiService } from '@/modules/diemthi/service';

// GET /api/diemthi?ky_tuyendung_id=X
// GET /api/diemthi?phongthi_id=X
// GET /api/diemthi?phongthi_id=X&stats=true
export async function GET(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'diemthi.view');
    const sp = req.nextUrl.searchParams;
    const kyId = sp.get('ky_tuyendung_id');
    const phongId = sp.get('phongthi_id');
    const statsOnly = sp.get('stats') === 'true';

    const filter = {
      ky_tuyendung_id: kyId ? Number(kyId) : undefined,
      phongthi_id: phongId ? Number(phongId) : undefined,
    };

    if (statsOnly) {
      const stats = await diemthiService.getStats(filter, session);
      return json(stats);
    }

    const data = await diemthiService.list(filter, session);
    return json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}

// PUT /api/diemthi — upsert điểm cho 1 thí sinh
export async function PUT(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'diemthi.nhap');
    const body = await req.json();
    const result = await diemthiService.upsert(body, session);
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
