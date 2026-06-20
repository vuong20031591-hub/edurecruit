import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { phongthiService } from '@/modules/phongthi/service';

/**
 * GET /api/phongthi/preview-sapxep?ky_tuyendung_id=X
 *
 * Trả về số TS đủ điều kiện, tổng sức chứa, cảnh báo.
 * Dùng để hiển thị preview trước khi user bấm "Xếp phòng tự động".
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'phongthi.xepphong');
    const sp = req.nextUrl.searchParams;
    const kyId = sp.get('ky_tuyendung_id');
    if (!kyId) return json({ error: 'Thiếu ky_tuyendung_id' }, { status: 400 });
    const preview = await phongthiService.previewSapXep(Number(kyId), session);
    return json(preview);
  } catch (err) {
    return handleApiError(err);
  }
}
