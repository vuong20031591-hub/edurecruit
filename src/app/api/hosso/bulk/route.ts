import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { hossoService } from '@/modules/hosso/service';
import { getDb } from '@/db';
import { audit } from '@/server/audit';

/**
 * DELETE /api/hosso/bulk
 * Body: { ids?: number[], ky_tuyendung_id?: number, deleteAll?: boolean }
 *
 * - ids: xóa danh sách cụ thể
 * - ky_tuyendung_id + deleteAll: xóa toàn bộ hồ sơ trong kỳ
 *
 * Sau khi xóa thisinh (cascade xóa diemthi), tự động:
 *   1. Recompute phongthi.so_luong_da_xep từ COUNT(diemthi)
 *   2. Reset phongthi.trang_thai = 'ChuaSapXep' nếu về 0
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'hosso.delete');
    const body = await req.json() as {
      ids?: number[];
      ky_tuyendung_id?: number;
      deleteAll?: boolean;
    };

    const db = getDb();
    let deleted = 0;
    let kyIdForRecalc: number | null = null;

    if (body.deleteAll && body.ky_tuyendung_id) {
      // Xóa toàn bộ trong kỳ
      const result = db
        .prepare('DELETE FROM thisinh WHERE ky_tuyendung_id = ?')
        .run(body.ky_tuyendung_id);
      deleted = result.changes;
      kyIdForRecalc = body.ky_tuyendung_id;

      audit({
        userId: parseInt(session.sub, 10) || undefined,
        username: session.username,
        resourceType: 'thisinh',
        action: 'DELETE_BULK_THISINH',
        payload: { ky_tuyendung_id: body.ky_tuyendung_id, deleted, scope: 'all' }
      });
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      // Xóa theo danh sách ID
      const placeholders = body.ids.map(() => '?').join(',');

      // Lấy danh sách phòng cần recompute trước khi xóa (vì FK CASCADE sẽ xóa diemthi)
      const affectedRooms = db
        .prepare(`
          SELECT DISTINCT d.phongthi_id AS room_id
          FROM diemthi d
          WHERE d.thisinh_id IN (${placeholders})
            AND d.phongthi_id IS NOT NULL
        `)
        .all(...body.ids) as { room_id: number }[];

      const result = db
        .prepare(`DELETE FROM thisinh WHERE id IN (${placeholders})`)
        .run(...body.ids);
      deleted = result.changes;

      // Recompute so_luong_da_xep cho các phòng bị ảnh hưởng
      const recompute = db.prepare(`
        UPDATE phongthi
        SET so_luong_da_xep = (
          SELECT COUNT(*) FROM diemthi WHERE phongthi_id = phongthi.id
        ),
        trang_thai = CASE
          WHEN (SELECT COUNT(*) FROM diemthi WHERE phongthi_id = phongthi.id) = 0
            AND trang_thai != 'DaKhoa' AND trang_thai != 'DaThiXong'
            THEN 'ChuaSapXep'
          ELSE trang_thai
        END,
        updated_at = datetime('now')
        WHERE id = ?
      `);

      for (const r of affectedRooms) {
        recompute.run(r.room_id);
      }

      audit({
        userId: parseInt(session.sub, 10) || undefined,
        username: session.username,
        resourceType: 'thisinh',
        action: 'DELETE_BULK_THISINH',
        payload: { ids: body.ids, deleted, rooms_recomputed: affectedRooms.length }
      });
    } else {
      return json({ error: 'Cần truyền ids hoặc deleteAll + ky_tuyendung_id' }, { status: 400 });
    }

    // Recompute toàn bộ phòng trong kỳ nếu deleteAll
    if (kyIdForRecalc != null) {
      db.prepare(`
        UPDATE phongthi
        SET so_luong_da_xep = (
          SELECT COUNT(*) FROM diemthi WHERE phongthi_id = phongthi.id
        ),
        trang_thai = CASE
          WHEN (SELECT COUNT(*) FROM diemthi WHERE phongthi_id = phongthi.id) = 0
            AND trang_thai != 'DaKhoa' AND trang_thai != 'DaThiXong'
            THEN 'ChuaSapXep'
          ELSE trang_thai
        END,
        updated_at = datetime('now')
        WHERE ky_tuyendung_id = ?
      `).run(kyIdForRecalc);
    }

    return json({ ok: true, deleted });
  } catch (err) {
    return handleApiError(err);
  }
}
