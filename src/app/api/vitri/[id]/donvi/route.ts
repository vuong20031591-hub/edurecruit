import { NextRequest } from 'next/server';
import { handleApiError, requireAuth, requirePerm, json } from '@/server/api';
import { vitriService } from '@/modules/vitri/service';
import { vitriRepository } from '@/modules/vitri/repository';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const numId = Number(id);
    if (!vitriRepository.findById(numId)) {
      return json({ error: 'Không tìm thấy' }, { status: 404 });
    }
    const donVis = await vitriService.getDonViByViTri(numId, session);
    const mappings = vitriRepository.getMappingByViTri(numId).map((m) => ({
      don_vi_id: m.don_vi_tuyen_dung_id,
      so_luong_phan_bo: m.so_luong_phan_bo
    }));
    return json({ data: donVis, mappings });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePerm(req, 'vitri.update');
    const { id } = await params;
    const body = await req.json();
    await vitriService.mapDonVi(Number(id), body.mappings, session);
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
