import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { getDb } from '@/db';
import ExcelJS from 'exceljs';
import { TrangThaiHoSoLabel, KetQuaLabel, type TrangThaiHoSoValue } from '@/shared/constants/enums';

/**
 * GET /api/bao-cao/xuat?ky_tuyendung_id=X&loai=ds-du-thi|ket-qua-diem|bang-diem-phong
 * Xuất file Excel cho trang Báo cáo
 */
function getPhongChoAssignments(db: any, kyId: number) {
  // Lấy danh sách các phòng thi của kỳ tuyển dụng này
  const phongs = db.prepare(`
    SELECT p.id, p.ma_phong, p.ten_phong, v.mon AS vi_tri, v.cap_hoc
    FROM phongthi p
    LEFT JOIN vitri_tuyendung v ON v.id = p.vi_tri_dang_ky_id
    WHERE p.ky_tuyendung_id = ?
    ORDER BY p.ma_phong ASC
  `).all(kyId) as { id: number; ma_phong: string; ten_phong: string | null; vi_tri: string | null; cap_hoc: string | null }[];

  const phongChoList: { name: string; cap_hoc: string; candidates: any[] }[] = [];
  const assignmentMap = new Map<number, string>();

  for (const phong of phongs) {
    const candidates = db.prepare(`
      SELECT t.id, t.ho, t.ten, t.ho_ten, t.sbd, t.ngay_sinh, t.gioi_tinh,
        t.dan_toc, t.ho_khau_thuong_tru, t.doi_tuong_uu_tien,
        v.mon AS vi_tri, v.cap_hoc, d.ten_don_vi AS don_vi,
        dt.diem_dan_toc, kq.diem_uu_tien,
        p.ma_phong, p.ten_phong
      FROM thisinh t
      JOIN diemthi dt ON dt.thisinh_id = t.id
      LEFT JOIN vitri_tuyendung v ON v.id = t.vi_tri_dang_ky_id
      LEFT JOIN don_vi_tuyen_dung d ON d.id = t.don_vi_du_tuyen_id
      LEFT JOIN ketqua kq ON kq.thisinh_id = t.id
      LEFT JOIN phongthi p ON p.id = dt.phongthi_id
      WHERE dt.phongthi_id = ?
        AND t.trang_thai_ho_so = 'HopLe'
        AND t.is_profile_locked = 1
        AND t.cccd IS NOT NULL
        AND t.cccd != ''
      ORDER BY t.sbd ASC, t.ho_ten ASC
    `).all(phong.id) as {
      id: number; ho: string; ten: string; ho_ten: string; sbd: string | null;
      ngay_sinh: string; gioi_tinh: string; dan_toc: string | null;
      ho_khau_thuong_tru: string | null; doi_tuong_uu_tien: string | null;
      vi_tri: string; cap_hoc: string; don_vi: string;
      diem_dan_toc: number | null;
      diem_uu_tien: number | null;
      ma_phong: string | null;
      ten_phong: string | null;
    }[];

    if (candidates.length > 0) {
      const roomName = phong.ma_phong;
      phongChoList.push({
        name: roomName,
        cap_hoc: phong.cap_hoc || '',
        candidates: candidates,
      });

      for (const ts of candidates) {
        assignmentMap.set(ts.id, roomName);
      }
    }
  }

  return { assignmentMap, phongChoList };
}

export async function GET(req: NextRequest) {
  try {
    await requirePerm(req, 'baocao.xuat');
    const sp = req.nextUrl.searchParams;
    const kyId = sp.get('ky_tuyendung_id');
    const loai = sp.get('loai');
    const phongthiId = sp.get('phongthi_id');

    if (!loai) return json({ error: 'Thiếu loai' }, { status: 400 });

    const db = getDb();
    let id = kyId ? Number(kyId) : 0;
    if (phongthiId) {
      const roomRow = db.prepare(`SELECT ky_tuyendung_id FROM phongthi WHERE id = ?`).get(Number(phongthiId)) as { ky_tuyendung_id: number } | undefined;
      if (roomRow) {
        id = roomRow.ky_tuyendung_id;
      }
    }

    if (!id) return json({ error: 'Thiếu ky_tuyendung_id hoặc phongthi_id không hợp lệ' }, { status: 400 });

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
        { header: 'Trạng thái hồ sơ', key: 'trang_thai_hoso', width: 18 },
        { header: 'Trạng thái xét tuyển', key: 'trang_thai_xettuyen', width: 20 },
        { header: 'Đỗ/Trượt', key: 'dat_khongdat', width: 16 },
      ];
      styleHeader(ws.getRow(1));

      const rows = db.prepare(`
        SELECT t.ma_ho_so, t.sbd, t.ho_ten, t.ngay_sinh, t.gioi_tinh,
          v.mon AS vi_tri, d.ten_don_vi AS don_vi,
          p.ma_phong AS phong,
          t.trang_thai_ho_so,
          kq.ket_qua AS trang_thai_xettuyen,
          kq.diem_tong AS diem_tong,
          v.diem_chuan
        FROM thisinh t
        LEFT JOIN vitri_tuyendung v ON v.id = t.vi_tri_dang_ky_id
        LEFT JOIN don_vi_tuyen_dung d ON d.id = t.don_vi_du_tuyen_id
        LEFT JOIN diemthi dt ON dt.thisinh_id = t.id
        LEFT JOIN phongthi p ON p.id = dt.phongthi_id
        LEFT JOIN ketqua kq ON kq.thisinh_id = t.id
        WHERE t.ky_tuyendung_id = ? AND t.trang_thai_ho_so = 'HopLe'
        ORDER BY v.mon ASC, t.sbd ASC NULLS LAST, t.ho_ten ASC
      `).all(id) as Record<string, unknown>[];

      rows.forEach((r, i) => {
        const trangThaiHoSo = (r.trang_thai_ho_so && typeof r.trang_thai_ho_so === 'string')
          ? (TrangThaiHoSoLabel[r.trang_thai_ho_so as TrangThaiHoSoValue] ?? r.trang_thai_ho_so)
          : '';
        const trangThaiXetTuyen = (r.trang_thai_xettuyen && typeof r.trang_thai_xettuyen === 'string')
          ? (KetQuaLabel[r.trang_thai_xettuyen] ?? r.trang_thai_xettuyen)
          : '';
        const diemChuan = typeof r.diem_chuan === 'number' ? r.diem_chuan : null;
        const diemTong = typeof r.diem_tong === 'number' ? r.diem_tong : null;
        const datKhongDat = (diemChuan !== null && diemTong !== null)
          ? (diemTong >= diemChuan ? 'Đỗ' : 'Trượt')
          : '';

        const row = ws.addRow({
          stt: i + 1,
          ma_ho_so: r.ma_ho_so,
          sbd: r.sbd,
          ho_ten: r.ho_ten,
          ngay_sinh: r.ngay_sinh,
          gioi_tinh: r.gioi_tinh,
          vi_tri: r.vi_tri,
          don_vi: r.don_vi,
          phong: r.phong,
          trang_thai_hoso: trangThaiHoSo,
          trang_thai_xettuyen: trangThaiXetTuyen,
          dat_khongdat: datKhongDat,
        });
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
    } else if (loai === 'ds-phong-thi') {
      const ptId = phongthiId ? Number(phongthiId) : null;
      if (!ptId) return json({ error: 'Thiếu phongthi_id' }, { status: 400 });

      const phongRow = db.prepare(`
        SELECT p.ma_phong, p.ten_phong, v.mon AS vi_tri
        FROM phongthi p
        LEFT JOIN vitri_tuyendung v ON v.id = p.vi_tri_dang_ky_id
        WHERE p.id = ?
      `).get(ptId) as { ma_phong: string; ten_phong: string | null; vi_tri: string } | undefined;

      if (!phongRow) return json({ error: 'Không tìm thấy phòng thi' }, { status: 404 });

      const ws = wb.addWorksheet(`Phòng ${phongRow.ma_phong}`);
      ws.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Mã hồ sơ', key: 'ma_ho_so', width: 16 },
        { header: 'SBD', key: 'sbd', width: 10 },
        { header: 'Họ tên', key: 'ho_ten', width: 28 },
        { header: 'Ngày sinh', key: 'ngay_sinh', width: 12 },
        { header: 'Giới tính', key: 'gioi_tinh', width: 10 },
        { header: 'Đơn vị dự tuyển', key: 'don_vi', width: 32 },
        { header: 'Phòng chờ', key: 'phong_cho', width: 24 },
      ];
      styleHeader(ws.getRow(1));

      // Lấy map phòng chờ
      const { assignmentMap } = getPhongChoAssignments(db, id);

      const rows = db.prepare(`
        SELECT t.id, t.ma_ho_so, t.sbd, t.ho_ten, t.ngay_sinh, t.gioi_tinh, d.ten_don_vi AS don_vi
        FROM thisinh t
        JOIN diemthi dt ON dt.thisinh_id = t.id
        LEFT JOIN don_vi_tuyen_dung d ON d.id = t.don_vi_du_tuyen_id
        WHERE dt.phongthi_id = ?
        ORDER BY t.sbd ASC, t.ho_ten ASC
      `).all(ptId) as Record<string, any>[];

      rows.forEach((r, i) => {
        const phongChoName = assignmentMap.get(r.id) || 'Chưa xếp';
        const row = ws.addRow({
          stt: i + 1,
          ma_ho_so: r.ma_ho_so,
          sbd: r.sbd,
          ho_ten: r.ho_ten,
          ngay_sinh: r.ngay_sinh,
          gioi_tinh: r.gioi_tinh,
          don_vi: r.don_vi,
          phong_cho: phongChoName,
        });
        if (i % 2 === 1) {
          row.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          });
        }
      });

    } else if (loai === 'ds-phong-cho') {
      const { phongChoList } = getPhongChoAssignments(db, id);

      const kyRowCho = db.prepare(`SELECT ten_ky, nam FROM ky_tuyendung WHERE id = ?`).get(id) as { ten_ky: string; nam: number } | undefined;
      const namKyCho = kyRowCho?.nam ?? new Date().getFullYear();
      const cfgOrgCho = db.prepare(`SELECT value FROM system_config WHERE key = 'org.name'`).get() as { value: string } | undefined;
      const orgNameCho = (cfgOrgCho?.value ?? 'SỞ GIÁO DỤC VÀ ĐÀO TẠO').toUpperCase();

      if (phongChoList.length === 0) {
        const ws = wb.addWorksheet('Danh sách trống');
        ws.addRow(['Không có dữ liệu phòng chờ']);
      }

      // Col widths: A=STT, B=SBD, C=HọLót, D=Tên, E=NgàySinh, F=GiớiTính, G=DânTộc,
      //             H=HộKhẩu, I=MônDựThi, J=ĐTưu, K=ĐơnVị, L=GhiChú
      const PCOLS = 12;
      const pColWidths = [5, 10, 18, 9, 13, 7, 8, 22, 22, 10, 32, 12];

      for (let pcIdx = 0; pcIdx < phongChoList.length; pcIdx++) {
        const pc = phongChoList[pcIdx];
        const ws = wb.addWorksheet(pc.name.substring(0, 31));

        pColWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
        ws.pageSetup = {
          paperSize: 9, orientation: 'landscape',
          fitToPage: true, fitToWidth: 1, fitToHeight: 0,
          margins: { left: 0.5, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
        };

        const monList = Array.from(new Set(pc.candidates.map(c => c.vi_tri).filter(Boolean)));
        const monStr = monList.join(', ');
        const HDR_COLS = 7; // A-G cho header org/HĐ (như mẫu A1:G1)
        const tnr = (size: number, bold = false, underline = false, italic = false): Partial<ExcelJS.Font> => ({
          name: 'Times New Roman', size,
          ...(bold ? { bold } : {}),
          ...(underline ? { underline: 'single' as const } : {}),
          ...(italic ? { italic } : {}),
        });
        const thin = { style: 'thin' as const };
        const hair = { style: 'hair' as const };

        // Row 1: org name — A1:G1, center, TNR 11 underline
        ws.mergeCells(1, 1, 1, HDR_COLS);
        const cr1 = ws.getCell(1, 1);
        cr1.value = orgNameCho;
        cr1.font = tnr(11, false, true);
        cr1.alignment = { horizontal: 'center' };
        ws.getRow(1).height = 16;

        // Row 2: HĐ TDVC — A2:G2, center, TNR 12 bold underline
        ws.mergeCells(2, 1, 2, HDR_COLS);
        const cr2 = ws.getCell(2, 1);
        cr2.value = `HỘI ĐỒNG TDVC NĂM HỌC ${namKyCho - 1}-${namKyCho}`;
        cr2.font = tnr(12, true, true);
        cr2.alignment = { horizontal: 'center' };
        ws.getRow(2).height = 16;

        // Row 3: blank
        ws.getRow(3).height = 6;

        // Row 4: tiêu đề — A4:L4, center, wrap, TNR 12 bold underline
        ws.mergeCells(4, 1, 4, PCOLS);
        const cr4 = ws.getCell(4, 1);
        cr4.value = `DANH SÁCH THÍ SINH PHÒNG THI ${pc.name.toUpperCase()}\n(${monStr})`;
        cr4.font = tnr(12, true, true);
        cr4.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        ws.getRow(4).height = 36;

        // Row 5: blank
        ws.getRow(5).height = 6;

        // Row 6: header (1 row, border all sides), bold TNR 10 underline
        const pHeaders = [
          { c: 1, v: 'STT' },
          { c: 2, v: 'SBD' },
          { c: 3, v: 'Họ và tên', mergeEnd: 4 },
          { c: 5, v: 'Ngày tháng\r\n năm sinh' },
          { c: 6, v: 'Giới\r\n tính' },
          { c: 7, v: 'Dân\r\n tộc' },
          { c: 8, v: 'Hộ khẩu\r\n thường trú\r\n(huyện - tỉnh)' },
          { c: 9, v: 'Môn dự thi' },
          { c: 10, v: 'Đối tượng\r\n ưu tiên' },
          { c: 11, v: 'Đơn vị dự tuyển' },
          { c: 12, v: 'Ghi chú' },
        ];
        for (const h of pHeaders) {
          if (h.mergeEnd) ws.mergeCells(6, h.c, 6, h.mergeEnd);
          const hc = ws.getCell(6, h.c);
          hc.value = h.v;
          hc.font = tnr(10, true, true);
          hc.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          hc.border = { top: thin, bottom: thin, left: thin, right: thin };
        }
        ws.getRow(6).height = 36;

        // Row 7: blank
        ws.getRow(7).height = 6;

        // Row 8: số thứ tự cột — italic TNR 10, border all
        const colNums = [1, 2, 3, null, 4, 5, 6, 7, 8, 10, 11, 12];
        colNums.forEach((v, i) => {
          const nc = ws.getCell(8, i + 1);
          if (v != null) nc.value = v;
          nc.font = tnr(10, false, true, true);
          nc.alignment = { horizontal: 'center', vertical: 'middle' };
          nc.border = { top: thin, bottom: thin, left: thin, right: thin };
        });
        ws.getRow(8).height = 14;

        // Data rows starting at row 9
        pc.candidates.forEach((ts, i) => {
          const r = 9 + i;
          let uuTienVal = ts.doi_tuong_uu_tien ?? '';
          if (!uuTienVal && ts.diem_dan_toc && ts.diem_dan_toc > 0) {
            uuTienVal = 'DTTS';
          }
          // col indexes: 0=STT,1=SBD,2=Họ,3=Tên,4=NgàySinh,5=GiớiTính,6=DânTộc,
          //              7=HộKhẩu,8=MônDựThi,9=ĐTưuTiên,10=ĐơnVị,11=GhiChú
          const vals: (number | string | Date | null)[] = [
            i + 1, ts.sbd ? ts.sbd.replace(/^SBD-?/i, '') : '', ts.ho, ts.ten,
            ts.ngay_sinh ? new Date(ts.ngay_sinh) : null,
            ts.gioi_tinh, ts.dan_toc ?? '', ts.ho_khau_thuong_tru ?? '',
            ts.vi_tri, uuTienVal, ts.don_vi, '',
          ];
          const borderTop = i === 0 ? thin : hair;
          vals.forEach((v, ci) => {
            const dc = ws.getCell(r, ci + 1);
            dc.value = v;
            if (ci === 4) dc.numFmt = 'dd/mm/yyyy';
            // Cột đơn vị (K, ci=10) dùng size 8 như mẫu
            dc.font = tnr(ci === 10 ? 8 : 10, false, true);
            dc.alignment = { horizontal: ci < 2 ? 'center' : 'left', vertical: 'middle', wrapText: true };
            dc.border = { top: borderTop, bottom: hair, left: thin, right: thin };
          });
          ws.getRow(r).height = 18;
        });
      }

    } else if (loai === 'niem-yet') {
      const kyRow = db.prepare(`SELECT ten_ky, nam FROM ky_tuyendung WHERE id = ?`).get(id) as { ten_ky: string; nam: number } | undefined;
      const namKy = kyRow?.nam ?? new Date().getFullYear();
      const tenHdTdvc = `HỘI ĐỒNG TDVC NĂM HỌC ${namKy - 1}-${namKy}`;

      const cfgOrgName = db.prepare(`SELECT value FROM system_config WHERE key = 'org.name'`).get() as { value: string } | undefined;
      const orgName = (cfgOrgName?.value ?? 'SỞ GIÁO DỤC VÀ ĐÀO TẠO').toUpperCase();

      const cfgOrgAddr = db.prepare(`SELECT value FROM system_config WHERE key = 'org.address'`).get() as { value: string } | undefined;
      const addrParts = (cfgOrgAddr?.value ?? '').split(',');
      const diaDanh = addrParts[addrParts.length - 1].trim() || 'Lạng Sơn';

      const phongs = db.prepare(`
        SELECT p.id, p.ma_phong, p.ten_phong, v.mon AS ten_vi_tri
        FROM phongthi p
        LEFT JOIN vitri_tuyendung v ON v.id = p.vi_tri_dang_ky_id
        WHERE p.ky_tuyendung_id = ?
        ORDER BY p.ngay_thi ASC, p.gio_thi ASC, p.ma_phong ASC
      `).all(id) as { id: number; ma_phong: string; ten_phong: string | null; ten_vi_tri: string | null }[];

      if (phongs.length === 0) {
        const ws = wb.addWorksheet('Trống');
        ws.getCell(1, 1).value = 'Chưa có phòng thi nào được xếp';
      }

      const today = new Date();
      const dateStr = `${diaDanh}, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
      const TNR = 'Times New Roman';
      const UL = 'single' as const;
      const COLS = 6;

      for (const phong of phongs) {
        const thiSinhs = db.prepare(`
          SELECT t.sbd, t.ho, t.ten, t.ho_ten, t.ngay_sinh
          FROM thisinh t
          JOIN diemthi dt ON dt.thisinh_id = t.id
          WHERE dt.phongthi_id = ?
          ORDER BY t.sbd ASC, t.ho_ten ASC
        `).all(phong.id) as { sbd: string | null; ho: string; ten: string; ho_ten: string; ngay_sinh: string }[];

        const tenPhong = phong.ten_phong ?? phong.ma_phong;
        const tieuDeDs = phong.ten_vi_tri
          ? `DANH SÁCH GỌI THÍ SINH VÀO PHÒNG CHUẨN BỊ THI\n${phong.ten_vi_tri.toUpperCase()}`
          : 'DANH SÁCH GỌI THÍ SINH VÀO PHÒNG CHUẨN BỊ THI';

        // Mỗi phòng 1 sheet riêng
        const sheetName = `CHUẨN BỊ ${phong.ma_phong}`.substring(0, 31);
        const ws = wb.addWorksheet(sheetName);
        ws.getColumn(1).width = 5;   // STT
        ws.getColumn(2).width = 11;  // SBD — format @
        ws.getColumn(3).width = 20;  // Họ lót
        ws.getColumn(4).width = 10;  // Tên
        ws.getColumn(5).width = 14;  // Ngày sinh
        ws.getColumn(6).width = 16;  // Ghi chú
        ws.pageSetup = {
          paperSize: 9, orientation: 'portrait',
          fitToPage: true, fitToWidth: 1, fitToHeight: 0,
          margins: { left: 0.7, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
        };

        const g = (r: number, c: number) => ws.getCell(r, c);
        const mc = (r: number, c1: number, c2: number) => { ws.mergeCells(r, c1, r, c2); return g(r, c1); };

        // Row 1: org name — A1:D1 merge, TNR 11, center, underline, black
        const r1 = mc(1, 1, 4);
        r1.value = orgName;
        r1.font = { name: TNR, size: 11, underline: UL, color: { argb: 'FF000000' } };
        r1.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(1).height = 16;

        // Row 2: HĐ TDVC — A2:D2 merge, TNR 12 bold center underline; tên phòng F2 TNR 10 bold center underline
        const r2 = mc(2, 1, 4);
        r2.value = tenHdTdvc;
        r2.font = { name: TNR, size: 12, bold: true, underline: UL };
        r2.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(2).height = 16;
        const r2f = g(2, 6);
        r2f.value = tenPhong.toUpperCase();
        r2f.font = { name: TNR, size: 10, bold: true, underline: UL, color: { argb: 'FF000000' } };
        r2f.alignment = { horizontal: 'center', vertical: 'middle' };

        // Row 3: tiêu đề — A3:F3 merge, TNR 14 bold center underline, border-bottom thin
        const r3 = mc(3, 1, COLS);
        r3.value = tieuDeDs;
        r3.font = { name: TNR, size: 14, bold: true, underline: UL };
        r3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        r3.border = { bottom: { style: 'thin' } };
        ws.getRow(3).height = 36;

        // Row 4: header — A4(STT), B4(SBD @), C4+D4 merge "Họ và tên", E4(Ngày sinh wrap), F4 — đúng border từng cell theo mẫu
        const hdr = 4;
        // A4: border left+right+top, bold TNR 10 underline center
        const hA = g(hdr, 1);
        hA.value = 'STT';
        hA.font = { name: TNR, size: 10, bold: true, underline: UL };
        hA.alignment = { horizontal: 'center', vertical: 'middle' };
        hA.border = { left: { style: 'thin' }, right: { style: 'thin' }, top: { style: 'thin' } };

        // B4: border all, bold TNR 10 underline center, format @
        const hB = g(hdr, 2);
        hB.value = 'SBD';
        hB.font = { name: TNR, size: 10, bold: true, underline: UL };
        hB.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        hB.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        hB.numFmt = '@';

        // C4+D4 merge "Họ và tên": C border left+top, D border right+top
        ws.mergeCells(hdr, 3, hdr, 4);
        const hC = g(hdr, 3);
        hC.value = 'Họ và tên';
        hC.font = { name: TNR, size: 10, bold: true, underline: UL };
        hC.alignment = { horizontal: 'center', vertical: 'middle' };
        hC.border = { left: { style: 'thin' }, top: { style: 'thin' } };
        g(hdr, 4).border = { right: { style: 'thin' }, top: { style: 'thin' } };

        // E4: Ngày sinh — border left+right+top wrap
        const hE = g(hdr, 5);
        hE.value = 'Ngày tháng\n năm sinh';
        hE.font = { name: TNR, size: 10, bold: true, underline: UL };
        hE.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        hE.border = { left: { style: 'thin' }, right: { style: 'thin' }, top: { style: 'thin' } };

        // F4: border all bold TNR 10 underline center
        const hF = g(hdr, 6);
        hF.value = 'Ghi chú';
        hF.font = { name: TNR, size: 10, bold: true, underline: UL };
        hF.alignment = { horizontal: 'center', vertical: 'middle' };
        hF.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        ws.getRow(hdr).height = 30;

        // Row 5: header row 2 (bottom border để đóng header) — theo mẫu row 5 có border bottom
        const hdr2 = 5;
        g(hdr2, 1).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        g(hdr2, 2).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        ws.mergeCells(hdr2, 3, hdr2, 4);
        g(hdr2, 3).border = { bottom: { style: 'thin' }, left: { style: 'thin' } };
        g(hdr2, 4).border = { bottom: { style: 'thin' }, right: { style: 'thin' } };
        g(hdr2, 5).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        g(hdr2, 6).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        ws.getRow(hdr2).height = 14;

        let curRow = 6;

        // Data rows — theo mẫu: A=italic TNR 8 underline, B=TNR 10 format @, C=left TNR 10, D=right TNR 10, E=date format, F=Calibri 11
        thiSinhs.forEach((ts, i) => {
          const r = curRow + i;
          const topB = i === 0 ? 'thin' : 'hair';

          const dA = g(r, 1); dA.value = i + 1;
          dA.font = { name: TNR, size: 8, italic: true, underline: UL };
          dA.alignment = { horizontal: 'center', vertical: 'middle' };
          dA.border = { top: { style: topB }, bottom: { style: 'hair' }, left: { style: 'thin' }, right: { style: 'thin' } };

          const dB = g(r, 2); dB.value = ts.sbd ? ts.sbd.replace(/^SBD-?/i, '') : '';
          dB.font = { name: TNR, size: 10, underline: UL };
          dB.alignment = { horizontal: 'center', vertical: 'middle' };
          dB.border = { top: { style: topB }, bottom: { style: 'hair' }, left: { style: 'thin' }, right: { style: 'thin' } };
          dB.numFmt = '@';

          const dC = g(r, 3); dC.value = ts.ho;
          dC.font = { name: TNR, size: 10, underline: UL };
          dC.alignment = { horizontal: 'left', vertical: 'middle' };
          dC.border = { top: { style: topB }, bottom: { style: 'hair' }, left: { style: 'thin' } };

          const dD = g(r, 4); dD.value = ts.ten;
          dD.font = { name: TNR, size: 10, underline: UL };
          dD.alignment = { horizontal: 'left', vertical: 'middle' };
          dD.border = { top: { style: topB }, bottom: { style: 'hair' }, right: { style: 'thin' } };

          const dE = g(r, 5);
          dE.value = ts.ngay_sinh ? new Date(ts.ngay_sinh) : null;
          dE.font = { name: TNR, size: 10, underline: UL };
          dE.alignment = { horizontal: 'center', vertical: 'middle' };
          dE.border = { top: { style: topB }, bottom: { style: 'hair' }, left: { style: 'thin' }, right: { style: 'thin' } };
          dE.numFmt = 'dd/mm/yyyy';

          const dF = g(r, 6);
          dF.font = { name: 'Calibri', size: 11, underline: UL };
          dF.border = { top: { style: topB }, bottom: { style: 'hair' }, left: { style: 'thin' }, right: { style: 'thin' } };

          ws.getRow(r).height = 18;
        });

        // Last data row — đóng border bottom = thin
        if (thiSinhs.length > 0) {
          const lastR = curRow + thiSinhs.length - 1;
          for (let c = 1; c <= COLS; c++) {
            const cl = g(lastR, c);
            cl.border = { ...cl.border, bottom: { style: 'thin' } };
          }
        }
        curRow += thiSinhs.length;

        // Blank row
        curRow++;

        // Footer: "Danh sách này gồm có X thí sinh./." — A19:E19 Calibri 11 center underline
        ws.mergeCells(curRow, 1, curRow, 5);
        const ftr = g(curRow, 1);
        ftr.value = `Danh sách này gồm có ${thiSinhs.length} thí sinh./.`;
        ftr.font = { name: 'Calibri', size: 11, underline: UL };
        ftr.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(curRow).height = 16;
        curRow++;

        // Địa danh ngày tháng — D20:F20 italic TNR 11 underline center
        ws.mergeCells(curRow, 4, curRow, COLS);
        const dateC = g(curRow, 4);
        dateC.value = dateStr;
        dateC.font = { name: TNR, size: 11, italic: true, underline: UL };
        dateC.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(curRow).height = 16;
        curRow++;

        // Chức danh ký — D21:F21 bold TNR 11 underline center
        ws.mergeCells(curRow, 4, curRow, COLS);
        const titC = g(curRow, 4);
        titC.value = `CHỦ TỊCH HĐTDVC NĂM ${namKy}`;
        titC.font = { name: TNR, size: 11, bold: true, underline: UL };
        titC.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getRow(curRow).height = 16;
        curRow++;

        // 4 dòng trống cho chữ ký tay
        curRow += 4;
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
