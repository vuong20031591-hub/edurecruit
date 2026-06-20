import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { getDb } from '@/db';
import ExcelJS from 'exceljs';

/**
 * GET /api/bao-cao/xuat?ky_tuyendung_id=X&loai=ds-du-thi|ket-qua-diem|bang-diem-phong
 * Xuất file Excel cho trang Báo cáo
 */
export async function GET(req: NextRequest) {
  try {
    await requirePerm(req, 'baocao.xuat');
    const sp = req.nextUrl.searchParams;
    const kyId = sp.get('ky_tuyendung_id');
    const loai = sp.get('loai');
    if (!kyId) return json({ error: 'Thiếu ky_tuyendung_id' }, { status: 400 });
    if (!loai) return json({ error: 'Thiếu loai' }, { status: 400 });

    const db = getDb();
    const id = Number(kyId);
    const wb = new ExcelJS.Workbook();

    // Helper: header style
    function styleHeader(row: ExcelJS.Row) {
      row.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D293D' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      });
      row.height = 28;
    }

    if (loai === 'ds-du-thi') {
      // Danh sách thí sinh đủ điều kiện dự thi
      const ws = wb.addWorksheet('DS Thí sinh dự thi');
      ws.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Mã hồ sơ', key: 'ma_ho_so', width: 16 },
        { header: 'SBD', key: 'sbd', width: 10 },
        { header: 'Họ tên', key: 'ho_ten', width: 28 },
        { header: 'Ngày sinh', key: 'ngay_sinh', width: 12 },
        { header: 'Giới tính', key: 'gioi_tinh', width: 10 },
        { header: 'Vị trí ĐK', key: 'vi_tri', width: 22 },
        { header: 'Đơn vị dự tuyển', key: 'don_vi', width: 32 },
        { header: 'Phòng thi', key: 'phong', width: 12 },
        { header: 'Trạng thái', key: 'trang_thai', width: 14 },
      ];
      styleHeader(ws.getRow(1));

      const rows = db.prepare(`
        SELECT t.ma_ho_so, t.sbd, t.ho_ten, t.ngay_sinh, t.gioi_tinh,
          v.mon AS vi_tri, d.ten_don_vi AS don_vi,
          p.ma_phong AS phong, t.trang_thai_ho_so
        FROM thisinh t
        LEFT JOIN vitri_tuyendung v ON v.id = t.vi_tri_dang_ky_id
        LEFT JOIN don_vi_tuyen_dung d ON d.id = t.don_vi_du_tuyen_id
        LEFT JOIN diemthi dt ON dt.thisinh_id = t.id
        LEFT JOIN phongthi p ON p.id = dt.phongthi_id
        WHERE t.ky_tuyendung_id = ? AND t.trang_thai_ho_so = 'HopLe'
        ORDER BY v.mon ASC, t.sbd ASC NULLS LAST, t.ho_ten ASC
      `).all(id) as Record<string, unknown>[];

      rows.forEach((r, i) => {
        const row = ws.addRow({ stt: i + 1, ...r });
        if (i % 2 === 1) {
          row.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          });
        }
      });

    } else if (loai === 'ket-qua-diem') {
      // Kết quả thi chấm điểm tổng hợp
      const ws = wb.addWorksheet('Kết quả điểm thi');
      ws.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'SBD', key: 'sbd', width: 10 },
        { header: 'Họ tên', key: 'ho_ten', width: 28 },
        { header: 'Vị trí ĐK', key: 'vi_tri', width: 22 },
        { header: 'Phòng thi', key: 'phong', width: 12 },
        { header: 'GK1', key: 'gk1', width: 8 },
        { header: 'GK2', key: 'gk2', width: 8 },
        { header: 'ĐTB', key: 'dtb', width: 8 },
        { header: 'Điểm ưu tiên', key: 'uu_tien', width: 14 },
        { header: 'Vắng', key: 'vang', width: 8 },
        { header: 'Bỏ thi', key: 'bo', width: 8 },
        { header: 'Trạng thái', key: 'trang_thai', width: 14 },
      ];
      styleHeader(ws.getRow(1));

      const rows = db.prepare(`
        SELECT t.sbd, t.ho_ten,
          v.mon AS vi_tri, p.ma_phong AS phong,
          dt.diem_gk1 AS gk1, dt.diem_gk2 AS gk2,
          dt.diem_thi_giang AS dtb,
          kq.diem_uu_tien AS uu_tien,
          dt.vang_thi AS vang, dt.bo_thi AS bo,
          dt.trang_thai_nhap AS trang_thai
        FROM thisinh t
        JOIN diemthi dt ON dt.thisinh_id = t.id
        LEFT JOIN vitri_tuyendung v ON v.id = t.vi_tri_dang_ky_id
        LEFT JOIN phongthi p ON p.id = dt.phongthi_id
        LEFT JOIN ketqua kq ON kq.thisinh_id = t.id
        WHERE t.ky_tuyendung_id = ?
        ORDER BY p.ma_phong ASC, t.sbd ASC NULLS LAST
      `).all(id) as Record<string, unknown>[];

      rows.forEach((r, i) => {
        const row = ws.addRow({ stt: i + 1, ...r });
        if (i % 2 === 1) {
          row.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          });
        }
      });

    } else if (loai === 'bang-diem-phong') {
      // Bảng điểm chi tiết theo phòng thi
      const phongsRes = db.prepare(`
        SELECT id, ma_phong, ten_phong FROM phongthi WHERE ky_tuyendung_id = ? ORDER BY ma_phong ASC
      `).all(id) as { id: number; ma_phong: string; ten_phong: string | null }[];

      for (const phong of phongsRes) {
        const ws = wb.addWorksheet(`Phòng ${phong.ma_phong}`);
        ws.columns = [
          { header: 'STT', key: 'stt', width: 6 },
          { header: 'SBD', key: 'sbd', width: 10 },
          { header: 'Họ tên', key: 'ho_ten', width: 28 },
          { header: 'GK1', key: 'gk1', width: 8 },
          { header: 'GK2', key: 'gk2', width: 8 },
          { header: 'ĐTB', key: 'dtb', width: 8 },
          { header: 'Vắng', key: 'vang', width: 8 },
          { header: 'Bỏ thi', key: 'bo', width: 8 },
          { header: 'Trạng thái', key: 'trang_thai', width: 14 },
        ];
        styleHeader(ws.getRow(1));

        const rows = db.prepare(`
          SELECT t.sbd, t.ho_ten,
            dt.diem_gk1 AS gk1, dt.diem_gk2 AS gk2,
            dt.diem_thi_giang AS dtb,
            dt.vang_thi AS vang, dt.bo_thi AS bo,
            dt.trang_thai_nhap AS trang_thai
          FROM thisinh t
          JOIN diemthi dt ON dt.thisinh_id = t.id
          WHERE dt.phongthi_id = ?
          ORDER BY t.sbd ASC NULLS LAST
        `).all(phong.id) as Record<string, unknown>[];

        rows.forEach((r, i) => {
          const row = ws.addRow({ stt: i + 1, ...r });
          if (i % 2 === 1) {
            row.eachCell(cell => {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            });
          }
        });
      }
    } else {
      return json({ error: 'loai không hợp lệ' }, { status: 400 });
    }

    // Serialize workbook
    const buf = await wb.xlsx.writeBuffer();
    const filename = `bao-cao-${loai}-${Date.now()}.xlsx`;

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
