/**
 * mon-chuyen-nganh — list & create
 * File: src/app/api/mon-chuyen-nganh/route.ts
 *
 * GET  /api/mon-chuyen-nganh?grouped=true
 *   - default: trả về flat array
 *   - ?grouped=true: trả về group theo môn (cho UI admin)
 *
 * POST /api/mon-chuyen-nganh
 *   body: { mon, chuyen_nganh, ghi_chu? }
 */
import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { monChuyenNganhService } from '@/modules/mon-chuyen-nganh/service';

export async function GET(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'hosso.cauhinh');
    const grouped = req.nextUrl.searchParams.get('grouped') === 'true';
    if (grouped) {
      return json(monChuyenNganhService.listGrouped(session));
    }
    return json(monChuyenNganhService.listAll(session));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'hosso.cauhinh');
    const body = await req.json() as { mon?: string; chuyen_nganh?: string; ghi_chu?: string | null };
    if (!body.mon || !body.chuyen_nganh) {
      return json({ error: 'Thiếu mon hoặc chuyen_nganh' }, { status: 400 });
    }
    const row = monChuyenNganhService.create({
      mon: body.mon,
      chuyen_nganh: body.chuyen_nganh,
      ghi_chu: body.ghi_chu ?? null
    }, session);
    return json(row, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/mon-chuyen-nganh?mon=X
 *   Xóa toàn bộ chuyên ngành của 1 môn (dùng cho admin "Xóa môn").
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'hosso.cauhinh');
    const mon = req.nextUrl.searchParams.get('mon');
    if (!mon) {
      return json({ error: 'Thiếu query ?mon=X' }, { status: 400 });
    }
    const result = monChuyenNganhService.deleteByMon(mon, session);
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
