import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { getDb } from '@/db';

// GET /api/bao-cao?ky_tuyendung_id=X
// Trả về toàn bộ dữ liệu cho trang Báo cáo
export async function GET(req: NextRequest) {
  try {
    await requirePerm(req, 'baocao.xem');
    const sp = req.nextUrl.searchParams;
    const kyId = sp.get('ky_tuyendung_id');
    if (!kyId) return json({ error: 'Thiếu ky_tuyendung_id' }, { status: 400 });

    const db = getDb();
    const id = Number(kyId);

    // ── 1. Phân bổ điểm thi (histogram bins) ──────────────────────────────
    // Chỉ lấy thí sinh có diem_thi_giang (đã thi)
    const diemRows = db.prepare(`
      SELECT dt.diem_thi_giang
      FROM diemthi dt
      JOIN thisinh t ON t.id = dt.thisinh_id
      WHERE t.ky_tuyendung_id = ? AND dt.diem_thi_giang IS NOT NULL
        AND dt.vang_thi = 0 AND dt.bo_thi = 0
    `).all(id) as { diem_thi_giang: number }[];

    const bins = [
      { label: '< 5.0', min: 0, max: 5, count: 0, color: '#ef4444' },
      { label: '5.0–6.0', min: 5, max: 6, count: 0, color: '#f59e0b' },
      { label: '6.0–7.0', min: 6, max: 7, count: 0, color: '#3b82f6' },
      { label: '7.0–8.0', min: 7, max: 8, count: 0, color: '#6366f1' },
      { label: '8.0–9.0', min: 8, max: 9, count: 0, color: '#10b981' },
      { label: '≥ 9.0', min: 9, max: 11, count: 0, color: '#059669' },
    ];
    for (const { diem_thi_giang: d } of diemRows) {
      const bin = bins.find(b => d >= b.min && d < b.max);
      if (bin) bin.count++;
    }
    const phanBoDiem = bins.map(b => ({ label: b.label, count: b.count, color: b.color }));

    // ── 2. Tỷ lệ đậu/rớt ─────────────────────────────────────────────────
    let dat = 0, khongDat = 0;
    for (const { diem_thi_giang: d } of diemRows) {
      if (d >= 5) dat++;
      else khongDat++;
    }
    // Vắng/bỏ thi → cũng tính là không đạt (PRD §Bước5: tong_diem=0, loại khỏi xét tuyển)
    const vangBoRow = db.prepare(`
      SELECT COUNT(*) AS c FROM diemthi dt
      JOIN thisinh t ON t.id = dt.thisinh_id
      WHERE t.ky_tuyendung_id = ? AND (dt.vang_thi = 1 OR dt.bo_thi = 1)
    `).get(id) as { c: number };
    khongDat += vangBoRow.c;  // merge vào không đạt

    const tongCoKetQua = dat + khongDat;
    const tyLeDat = tongCoKetQua > 0 ? Math.round(dat / tongCoKetQua * 10000) / 100 : 0;
    const tyLeRat = tongCoKetQua > 0 ? Math.round(khongDat / tongCoKetQua * 10000) / 100 : 0;

    // ── 3. Kết quả theo vị trí ────────────────────────────────────────────
    const vitriRows = db.prepare(`
      SELECT
        v.id AS vitri_id,
        v.mon AS ten_vi_tri,
        SUM(CASE WHEN dt.diem_thi_giang >= 5 AND dt.vang_thi = 0 AND dt.bo_thi = 0 THEN 1 ELSE 0 END) AS dat,
        SUM(CASE WHEN (dt.diem_thi_giang < 5 OR dt.vang_thi = 1 OR dt.bo_thi = 1) AND dt.diem_thi_giang IS NOT NULL THEN 1 ELSE 0 END) AS khong_dat,
        COUNT(*) AS tong
      FROM vitri_tuyendung v
      LEFT JOIN thisinh t ON t.vi_tri_dang_ky_id = v.id
      LEFT JOIN diemthi dt ON dt.thisinh_id = t.id
      WHERE v.ky_tuyendung_id = ?
      GROUP BY v.id
      ORDER BY v.mon ASC
    `).all(id) as { vitri_id: number; ten_vi_tri: string; dat: number; khong_dat: number; tong: number }[];

    const ketQuaTheoViTri = vitriRows.map(r => ({
      name: r.ten_vi_tri,
      dat: r.dat ?? 0,
      khongDat: r.khong_dat ?? 0,
      tong: r.tong ?? 0,
    }));

    // ── 4. Tổng số liệu chung ─────────────────────────────────────────────
    const tongHopLe = db.prepare(
      "SELECT COUNT(*) AS c FROM thisinh WHERE ky_tuyendung_id = ? AND trang_thai_ho_so = 'HopLe'"
    ).get(id) as { c: number };
    const tongDaNhapDiem = db.prepare(
      `SELECT COUNT(*) AS c FROM diemthi dt JOIN thisinh t ON t.id = dt.thisinh_id
       WHERE t.ky_tuyendung_id = ? AND dt.trang_thai_nhap IN ('DaNhap','DaKhoa')`
    ).get(id) as { c: number };

    return json({
      tongHopLe: tongHopLe.c,
      tongDaNhapDiem: tongDaNhapDiem.c,
      phanBoDiem,
      tyLe: { dat, khongDat, tyLeDat, tyLeRat, tong: tongCoKetQua },
      ketQuaTheoViTri,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
