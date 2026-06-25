import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { hossoService } from '@/modules/hosso/service';

/**
 * POST /api/hosso/[id]/khoa
 * Duyệt (khóa) một hồ sơ thí sinh cụ thể (chỉ dành cho hồ sơ đã HopLe).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePerm(req, 'hosso.khoa');
    const { id } = await params;
    const result = await hossoService.lockSingleThiSinh(Number(id), session);
    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
