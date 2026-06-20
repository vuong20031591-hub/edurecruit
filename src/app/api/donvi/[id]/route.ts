import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { donviService } from '@/modules/donvi/service';
import type { DonViUpdateInput } from '@/modules/donvi/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePerm(req, 'donvi.view');
    const { id } = await params;
    const result = await donviService.getDonVi(Number(id), session);
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
    const session = await requirePerm(req, 'donvi.update');
    const { id } = await params;
    const body = (await req.json()) as DonViUpdateInput;
    const result = await donviService.updateDonVi(Number(id), body, session);
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
    const session = await requirePerm(req, 'donvi.delete');
    const { id } = await params;
    await donviService.deleteDonVi(Number(id), session);
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
