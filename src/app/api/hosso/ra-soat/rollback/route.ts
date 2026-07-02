/**
 * Rollback apply rà soát (khôi phục trạng thái cũ)
 * File: src/app/api/hosso/ra-soat/rollback/route.ts
 *
 * POST /api/hosso/ra-soat/rollback
 * body: { snapshot: Array<{ thisinh_id, old_trang_thai, old_ly_do_tu_choi }> }
 *
 * Dùng trong vòng 5 phút sau khi apply. Client lưu snapshot vào localStorage.
 */
import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { raSoatService } from '@/modules/hosso/ra-soat-service';
import { TrangThaiHoSo } from '@/shared/constants/enums';

const VALID_TRANG_THAI: ReadonlySet<string> = new Set(Object.values(TrangThaiHoSo));

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'hosso.rasoat');
    const body = await req.json() as {
      snapshot?: Array<{
        thisinh_id: number;
        old_trang_thai: string;
        old_ly_do_tu_choi: string | null;
        new_trang_thai?: string;
        new_ly_do_tu_choi?: string | null;
      }>;
    };

    if (!body.snapshot || !Array.isArray(body.snapshot) || body.snapshot.length === 0) {
      return json({ error: 'Thiếu hoặc rỗng snapshot' }, { status: 400 });
    }

    const missingNew = body.snapshot.find(s => !s.new_trang_thai);
    if (missingNew) {
      return json({ error: 'Snapshot thiếu new_trang_thai — vui lòng cập nhật client' }, { status: 400 });
    }

    for (const s of body.snapshot) {
      if (typeof s.thisinh_id !== 'number' || !Number.isInteger(s.thisinh_id) || s.thisinh_id <= 0) {
        return json({ error: `thisinh_id không hợp lệ: ${JSON.stringify(s.thisinh_id)}` }, { status: 400 });
      }
      if (!VALID_TRANG_THAI.has(s.old_trang_thai) || !VALID_TRANG_THAI.has(s.new_trang_thai ?? '')) {
        return json({ error: `trang_thai không hợp lệ: ${s.old_trang_thai} / ${s.new_trang_thai}` }, { status: 400 });
      }
    }

    const result = await raSoatService.rollback(body.snapshot, session);
    return json({
      ...result,
      warning: result.rolledBack === 0 ? 'Không có hồ sơ nào được rollback' : undefined,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
