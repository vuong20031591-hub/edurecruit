import { NextRequest } from 'next/server';
import { handleApiError, requireAuth, json } from '@/server/api';
import { phongthiService } from '@/modules/phongthi/service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const item = await phongthiService.getById(Number(id), session);
    return json(item);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();
    const updated = await phongthiService.update(Number(id), body, session);
    return json(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    await phongthiService.delete(Number(id), session);
    return json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
