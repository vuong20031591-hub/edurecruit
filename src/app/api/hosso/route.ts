import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { hossoService } from '@/modules/hosso/service';
import type { ThiSinhFilter } from '@/modules/hosso/types';
import type { ThiSinhCreate } from '@/db/schema';

export async function GET(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'hosso.view');
    const sp = req.nextUrl.searchParams;
    const filter: ThiSinhFilter = {
      ky_tuyendung_id: sp.get('ky_tuyendung_id') ? Number(sp.get('ky_tuyendung_id')) : undefined,
      search: sp.get('search') || undefined,
      trang_thai: (sp.get('trang_thai') as ThiSinhFilter['trang_thai']) || undefined,
      vi_tri_id: sp.get('vi_tri_id') ? Number(sp.get('vi_tri_id')) : undefined,
      don_vi_id: sp.get('don_vi_id') ? Number(sp.get('don_vi_id')) : undefined,
      ngay_nop_from: sp.get('ngay_nop_from') || undefined,
      ngay_nop_to: sp.get('ngay_nop_to') || undefined,
      page: sp.get('page') ? Number(sp.get('page')) : 1,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 50,
      sortBy: (sp.get('sortBy') as ThiSinhFilter['sortBy']) || 'ho_ten',
      sortDir: (sp.get('sortDir') as 'asc' | 'desc') || 'asc'
    };
    const result = await hossoService.listThiSinh(filter, session);
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'hosso.create');
    const body = await req.json();
    if (body.gioi_tinh === 'Nữ') body.gioi_tinh = 'Nu';
    if (body.gioi_tinh === 'Khác') body.gioi_tinh = 'Khac';
    const result = await hossoService.createThiSinh(body, session);
    return json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
