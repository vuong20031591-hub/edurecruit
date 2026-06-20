import { NextRequest } from 'next/server';
import { handleApiError, requireAuth, requirePerm, json } from '@/server/api';
import { vitriService } from '@/modules/vitri/service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const result = await vitriService.getViTri(Number(id), session);
    if (!result) return json({ error: 'Không tìm thấy' }, { status: 404 });
    return json(result);
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
    const result = await vitriService.updateViTri(Number(id), body, session);
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePerm(req, 'vitri.delete');
    const { id } = await params;
    await vitriService.deleteViTri(Number(id), session);
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
