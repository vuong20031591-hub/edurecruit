import { NextRequest } from 'next/server';
import { handleApiError, requireAuth, requirePerm, json } from '@/server/api';
import { donviService } from '@/modules/donvi/service';
import type { DonViFilter } from '@/modules/donvi/types';
import type { CapHoc } from '@/db/schema';

export const dynamic = 'force-dynamic';

const VALID_CAP_HOC: CapHoc[] = ['MN', 'TH', 'THCS', 'THPT', 'GDTX', 'DNTTHPT', 'THCS_THPT', 'TH_THCS'];

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const sp = req.nextUrl.searchParams;
    const kyId = sp.get('ky_tuyendung_id');
    const all = sp.get('all') === 'true';

    if (all && kyId) {
      const data = await donviService.listAllByKy(Number(kyId), session);
      return json({ data });
    }

    const rawCapHoc = sp.get('cap_hoc');
    const capHoc = rawCapHoc && (VALID_CAP_HOC as string[]).includes(rawCapHoc)
      ? (rawCapHoc as CapHoc)
      : undefined;

    const filter: DonViFilter = {
      ky_tuyendung_id: kyId ? Number(kyId) : undefined,
      cap_hoc: capHoc,
      search: sp.get('search') || undefined,
      page: sp.get('page') ? Number(sp.get('page')) : 1,
      pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : 50
    };

    const result = await donviService.listDonVi(filter, session);
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'donvi.create');
    const body = await req.json();
    const result = await donviService.createDonVi(body, session);
    return json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
