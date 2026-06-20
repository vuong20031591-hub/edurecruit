import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { diemthiService } from '@/modules/diemthi/service';

// POST /api/diemthi/khoa — khóa điểm toàn bộ phòng thi
export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'diemthi.khoa');
    const body = await req.json();
    const result = await diemthiService.khoaDiem(body, session);
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
