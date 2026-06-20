/**
 * PATCH /api/hosso/[id]/trang-thai - rà soát trạng thái hồ sơ
 * File: src/app/api/hosso/[id]/trang-thai/route.ts
 */
import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { hossoService } from '@/modules/hosso/service';
import type { TrangThaiHoSo } from '@/db/schema';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm(req, 'hosso.rasoat');
    const { id } = await params;
    const body = await req.json();
    const trangThai = body.trang_thai_ho_so ?? body.trang_thai;
    if (!trangThai) {
      return json({ error: 'Thiếu trang_thai_ho_so' }, { status: 400 });
    }
    const result = await hossoService.rasoatThiSinh(
      Number(id),
      trangThai as TrangThaiHoSo,
      body.ly_do,
      session
    );
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
