/**
 * mon-chuyen-nganh — update & delete 1 record
 * File: src/app/api/mon-chuyen-nganh/[id]/route.ts
 */
import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { monChuyenNganhService } from '@/modules/mon-chuyen-nganh/service';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm(req, 'hosso.cauhinh');
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isFinite(numId) || numId <= 0) {
      return json({ error: 'ID không hợp lệ' }, { status: 400 });
    }
    const body = await req.json() as { mon?: string; chuyen_nganh?: string; ghi_chu?: string | null };
    const row = monChuyenNganhService.update(numId, body, session);
    return json(row);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm(req, 'hosso.cauhinh');
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isFinite(numId) || numId <= 0) {
      return json({ error: 'ID không hợp lệ' }, { status: 400 });
    }
    monChuyenNganhService.delete(numId, session);
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
