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

    // Sync diem_tong trong ketqua nếu diem_dan_toc thay đổi
    if (body.diem_dan_toc !== undefined) {
      const { getDb } = await import('@/db');
      const db = getDb();
      const kq = db.prepare('SELECT diem_uu_tien FROM ketqua WHERE thisinh_id = ?').get(body.thisinh_id) as
        { diem_uu_tien: number } | undefined;
      if (kq) {
        const diemTong = (result.diem_thi_giang ?? 0) + (kq.diem_uu_tien ?? 0) + (result.diem_dan_toc ?? 0);
        db.prepare('UPDATE ketqua SET diem_tong = ?, updated_at = datetime(\'now\') WHERE thisinh_id = ?')
          .run(diemTong, body.thisinh_id);
      }
    }

    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
