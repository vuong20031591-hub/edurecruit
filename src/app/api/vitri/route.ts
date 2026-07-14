import { NextRequest } from 'next/server';
import { handleApiError, requireAuth, requirePerm, json, ValidationError } from '@/server/api';
import { vitriService } from '@/modules/vitri/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const sp = req.nextUrl.searchParams;
    const kyId = sp.get('ky_tuyendung_id');
    const all = sp.get('all') === 'true';
    if (all && kyId) {
      const data = await vitriService.listAllByKy(Number(kyId), session);
      return json({ data });
    }
    // Paginated path BẮT BUỘC có ky_tuyendung_id — tránh silent fallback
    // trả data gộp tất cả kỳ (vi phạm source of truth).
    if (!kyId) {
      throw new ValidationError('Thiếu ky_tuyendung_id — vị trí tuyển dụng phải lọc theo đúng kỳ đã chọn');
    }
    const filter = {
      ky_tuyendung_id: Number(kyId),
      mon: sp.get('mon') || undefined,
      cap_hoc: (sp.get('cap_hoc') as any) || undefined,
      search: sp.get('search') || undefined,
      page: sp.get('page') ? Number(sp.get('page')) : 1,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 50
    };
    const result = await vitriService.listViTri(filter, session);
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'vitri.create');
    const body = await req.json();
    const result = await vitriService.createViTri(body, session);
    return json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
