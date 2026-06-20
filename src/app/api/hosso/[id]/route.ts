import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { hossoService } from '@/modules/hosso/service';
import type { ThiSinhUpdate } from '@/db/schema';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePerm(req, 'hosso.view');
    const { id } = await params;
    const result = await hossoService.getThiSinh(Number(id), session);
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
    const session = await requirePerm(req, 'hosso.update');
    const { id } = await params;
    const body = await req.json();
    if (body.gioi_tinh === 'Nữ') body.gioi_tinh = 'Nu';
    if (body.gioi_tinh === 'Khác') body.gioi_tinh = 'Khac';
    const result = await hossoService.updateThiSinh(Number(id), body as ThiSinhUpdate, session);
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
    const session = await requirePerm(req, 'hosso.delete');
    const { id } = await params;
    await hossoService.deleteThiSinh(Number(id), session);
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
