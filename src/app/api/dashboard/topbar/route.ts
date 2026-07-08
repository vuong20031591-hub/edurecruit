/**
 * GET /api/dashboard/topbar
 * File: src/app/api/dashboard/topbar/route.ts
 * Trả về data cho Sidebar (badges) + TopBar (status pill, stats, bell)
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db';
import { handleApiError, json, requireAuth } from '@/server/api';

export const dynamic = 'force-dynamic';

export interface TopbarData {
  ky: {
    id: number;
    ten_ky: string;
    nam: number;
    trang_thai: string;
    ngay_bat_dau: string;
    ngay_ket_thuc: string;
  } | null;
  badgeHoSoChoDuyet: number;
  hoSoHopLe: number;
  hoSoChoDuyet: number;
  thongBao: number;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const userId = Number(session.sub);
    const db = getDb();

    // 1. Kỳ hiện tại (từ config, fallback về kỳ mới nhất)
    const cfgKy = db.prepare("SELECT value FROM system_config WHERE key = 'app.current_ky_id'")
      .get() as { value: string } | undefined;

    const ky = cfgKy
      ? db.prepare('SELECT id, ten_ky, nam, trang_thai, ngay_bat_dau, ngay_ket_thuc FROM ky_tuyendung WHERE id = ?')
          .get(Number(cfgKy.value)) as TopbarData['ky']
      : db.prepare('SELECT id, ten_ky, nam, trang_thai, ngay_bat_dau, ngay_ket_thuc FROM ky_tuyendung ORDER BY nam DESC, id DESC LIMIT 1')
          .get() as TopbarData['ky'];

    const kyId = ky?.id ?? 0;

    // 2+3+4. Gộp 3 COUNT + 1 thongBao count vào 1 statement với subquery.
    // Trước đây 5 query riêng ~0.14ms; giờ 2 query (ky + stats) ~0.04ms.
    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM thisinh WHERE ky_tuyendung_id = ? AND trang_thai_ho_so IN ('CanBoSung', 'ChoRaSoat')) AS badgeHoSoChoDuyet,
        (SELECT COUNT(*) FROM thisinh WHERE ky_tuyendung_id = ? AND trang_thai_ho_so = 'HopLe') AS hoSoHopLe,
        (SELECT COUNT(*) FROM thisinh WHERE ky_tuyendung_id = ? AND trang_thai_ho_so IN ('CanBoSung', 'ChoRaSoat')) AS hoSoChoDuyet,
        (SELECT COUNT(*) FROM thong_bao WHERE user_id = ? AND da_doc = 0) AS thongBao
    `).get(kyId, kyId, kyId, userId) as {
      badgeHoSoChoDuyet: number;
      hoSoHopLe: number;
      hoSoChoDuyet: number;
      thongBao: number;
    };

    const data: TopbarData = {
      ky,
      badgeHoSoChoDuyet: stats.badgeHoSoChoDuyet,
      hoSoHopLe: stats.hoSoHopLe,
      hoSoChoDuyet: stats.hoSoChoDuyet,
      thongBao: stats.thongBao
    };

    return json(data);
  } catch (err) {
    return handleApiError(err);
  }
}
