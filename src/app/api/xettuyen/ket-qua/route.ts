import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json, ValidationError } from '@/server/api';
import { xettuyenService } from '@/modules/xettuyen/service';

export async function GET(req: NextRequest) {
  try {
    await requirePerm(req, 'xettuyen.xem');
    const kyId = Number(req.nextUrl.searchParams.get('ky_tuyendung_id'));
    const vitriId = req.nextUrl.searchParams.get('vitri_id');

    if (!kyId) {
      throw new ValidationError('Thiếu ky_tuyendung_id');
    }

    const data = xettuyenService.getKetQua(
      kyId,
      vitriId ? Number(vitriId) : undefined
    );

    return json({ data, total: data.length });
  } catch (err) {
    return handleApiError(err);
  }
}
