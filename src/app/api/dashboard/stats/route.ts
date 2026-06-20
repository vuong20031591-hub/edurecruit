/**
 * GET /api/dashboard/stats
 * File: src/app/api/dashboard/stats/route.ts
 * Trả về dữ liệu thống kê cho trang Tổng quan
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db';
import { handleApiError, json, requireAuth } from '@/server/api';

export interface DashboardStats {
  ky: { id: number; ten_ky: string; nam: number; ngay_bat_dau: string; ngay_ket_thuc: string } | null;
  stats: {
    tongSoHoSo: number;
    hopLe: number;
    canBoSung: number;
    khongDuDieuKien: number;
    soPhong: number;
    tongChoNgoi: number;
  };
  progressChart: { label: string; tong: number; hopLe: number }[];
  positionBar: { name: string; value: number; full: string }[];
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const db = getDb();

    // 1. Kỳ hiện tại (lấy từ config hoặc kỳ mới nhất)
    const cfgKy = db.prepare("SELECT value FROM system_config WHERE key = 'app.current_ky_id'").get() as { value: string } | undefined;
    const ky = cfgKy
      ? db.prepare('SELECT id, ten_ky, nam, ngay_bat_dau, ngay_ket_thuc FROM ky_tuyendung WHERE id = ?').get(Number(cfgKy.value)) as DashboardStats['ky']
      : db.prepare('SELECT id, ten_ky, nam, ngay_bat_dau, ngay_ket_thuc FROM ky_tuyendung ORDER BY nam DESC, id DESC LIMIT 1').get() as DashboardStats['ky'];

    const kyId = ky?.id ?? 0;

    // 2. Stats cơ bản
    const tongSoHoSo = (db.prepare('SELECT COUNT(*) AS c FROM thisinh WHERE ky_tuyendung_id = ?').get(kyId) as { c: number }).c;
    const hopLe = (db.prepare("SELECT COUNT(*) AS c FROM thisinh WHERE ky_tuyendung_id = ? AND trang_thai_ho_so = 'HopLe'").get(kyId) as { c: number }).c;
    const canBoSung = (db.prepare("SELECT COUNT(*) AS c FROM thisinh WHERE ky_tuyendung_id = ? AND trang_thai_ho_so = 'CanBoSung'").get(kyId) as { c: number }).c;
    const khongDuDieuKien = (db.prepare("SELECT COUNT(*) AS c FROM thisinh WHERE ky_tuyendung_id = ? AND trang_thai_ho_so = 'KhongDuDieuKien'").get(kyId) as { c: number }).c;
    const soPhong = (db.prepare('SELECT COUNT(*) AS c FROM phongthi WHERE ky_tuyendung_id = ?').get(kyId) as { c: number }).c;
    const tongChoNgoi = (db.prepare('SELECT COALESCE(SUM(suc_chua), 0) AS s FROM phongthi WHERE ky_tuyendung_id = ?').get(kyId) as { s: number }).s;

    // 3. Progress chart: thí sinh đăng ký theo tháng
    // Lấy khoảng từ tháng bắt đầu kỳ -> tháng hiện tại
    const progressChart: { label: string; tong: number; hopLe: number }[] = db.prepare(`
      SELECT
        strftime('%Y-%m', ngay_nop_ho_so) AS thang,
        COUNT(*) AS tong,
        SUM(CASE WHEN trang_thai_ho_so = 'HopLe' THEN 1 ELSE 0 END) AS hopLe
      FROM thisinh
      WHERE ky_tuyendung_id = ?
      GROUP BY thang
      ORDER BY thang
    `).all(kyId).map((r: any) => {
      const [y, m] = r.thang.split('-');
      return {
        label: `T${Number(m)}`,
        tong: r.tong,
        hopLe: r.hopLe
      };
    });

    // Nếu không có data, vẫn trả về mảng 12 tháng rỗng
    if (progressChart.length === 0) {
      for (let i = 1; i <= 12; i++) {
        progressChart.push({ label: `T${i}`, tong: 0, hopLe: 0 });
      }
    }

    // 4. Position bar: hồ sơ theo vị trí (group by mon)
    const positionBar: { name: string; value: number; full: string }[] = db.prepare(`
      SELECT
        v.mon AS mon,
        v.cap_hoc AS cap_hoc,
        COUNT(t.id) AS so_luong
      FROM vitri_tuyendung v
      LEFT JOIN thisinh t ON t.vi_tri_dang_ky_id = v.id AND t.ky_tuyendung_id = ?
      WHERE v.ky_tuyendung_id = ?
      GROUP BY v.id
      ORDER BY so_luong DESC
    `).all(kyId, kyId).map((r: any) => ({
      name: `GV ${r.mon}`,
      full: `${r.mon} - ${r.cap_hoc}`,
      value: r.so_luong
    }));

    const data: DashboardStats = {
      ky,
      stats: { tongSoHoSo, hopLe, canBoSung, khongDuDieuKien, soPhong, tongChoNgoi },
      progressChart,
      positionBar
    };

    return json(data);
  } catch (err) {
    return handleApiError(err);
  }
}
