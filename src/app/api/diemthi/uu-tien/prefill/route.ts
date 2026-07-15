import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { diemthiService } from '@/modules/diemthi/service';

// POST /api/diemthi/uu-tien/prefill  body: { phongthi_id }
// Tự động điền điểm ưu tiên từ hồ sơ đăng ký (thisinh.doi_tuong_uu_tien)
// cho toàn bộ thí sinh trong phòng chưa có điểm ưu tiên trong bảng ketqua.
export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'diemthi.nhap');
    const body = await req.json().catch(() => ({}));
    const phongthi_id = Number(body?.phongthi_id);
    if (!phongthi_id) {
      const { ValidationError } = await import('@/server/api');
      throw new ValidationError('Thiếu phongthi_id');
    }
    const result = await diemthiService.prefillUuTienForPhong(phongthi_id, session);
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
