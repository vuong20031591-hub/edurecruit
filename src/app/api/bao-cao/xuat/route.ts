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
  const candidates = db.prepare(`
    SELECT t.id, t.ho_ten, t.sbd, t.ngay_sinh, t.gioi_tinh, v.mon AS vi_tri, v.cap_hoc, d.ten_don_vi AS don_vi
    FROM thisinh t
    LEFT JOIN vitri_tuyendung v ON v.id = t.vi_tri_dang_ky_id
    LEFT JOIN don_vi_tuyen_dung d ON d.id = t.don_vi_du_tuyen_id
    WHERE t.ky_tuyendung_id = ?
      AND t.trang_thai_ho_so = 'HopLe'
      AND t.is_profile_locked = 1
      AND t.cccd IS NOT NULL
      AND t.cccd != ''
    ORDER BY v.cap_hoc ASC, t.id ASC
  `).all(kyId) as { id: number; ho_ten: string; sbd: string | null; ngay_sinh: string; gioi_tinh: string; vi_tri: string; cap_hoc: string; don_vi: string }[];

  // Lấy sức chứa mặc định của phòng thi (config)
  const configSucChua = db.prepare(`
    SELECT value FROM system_config WHERE key = 'phong_thi.suc_chua_mac_dinh'
  `).get() as { value: string } | undefined;
  const maxCapacity = configSucChua ? Number(configSucChua.value) : 24; // Mặc định là 24 nếu không cấu hình

  // Nhóm theo cấp học
  const byCapHoc = new Map<string, typeof candidates>();
  for (const c of candidates) {
    const cap = c.cap_hoc || 'KHAC';
    if (!byCapHoc.has(cap)) byCapHoc.set(cap, []);
    byCapHoc.get(cap)!.push(c);
  }

  // Thuật toán xáo trộn ngẫu nhiên có seed cố định
  function seededShuffle<T>(array: T[], seed: number): T[] {
    const arr = [...array];
    let currSeed = seed;
    for (let i = arr.length - 1; i > 0; i--) {
      const r = Math.sin(currSeed++) * 10000;
      const randomValue = r - Math.floor(r);
      const j = Math.floor(randomValue * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const assignmentMap = new Map<number, string>(); // thisinh_id -> phong_cho_name
  const phongChoList: { name: string; cap_hoc: string; candidates: typeof candidates }[] = [];

  // Để đồng bộ seed qua các lần chạy, sử dụng kyId làm seed gốc
  let globalSeed = kyId + 179;

  // Lần lượt duyệt qua từng cấp học
  const sortedCapHocs = Array.from(byCapHoc.keys()).sort();
  for (const capHoc of sortedCapHocs) {
    const list = byCapHoc.get(capHoc)!;
    // Xáo trộn ngẫu nhiên danh sách thí sinh cùng cấp học
    const shuffledList = seededShuffle(list, globalSeed);
    // Cập nhật globalSeed để cấp học sau không trùng pattern xáo trộn của cấp học trước
    globalSeed += shuffledList.length + 7;

    // Chia vào các phòng chờ
    let roomSeq = 1;
    for (let i = 0; i < shuffledList.length; i += maxCapacity) {
      const chunk = shuffledList.slice(i, i + maxCapacity);
      const roomName = `Phòng chờ ${String(roomSeq).padStart(2, '0')} - Cấp ${capHoc}`;
      
      phongChoList.push({
        name: roomName,
        cap_hoc: capHoc,
        candidates: chunk,
      });

      for (const ts of chunk) {
        assignmentMap.set(ts.id, roomName);
      }
      roomSeq++;
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
        { header: 'Đạt/Không đạt', key: 'dat_khongdat', width: 16 },
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
          ? (diemTong >= diemChuan ? 'Đạt' : 'Không đạt')
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

      if (phongChoList.length === 0) {
        const ws = wb.addWorksheet('Danh sách trống');
        ws.addRow(['Không có dữ liệu phòng chờ']);
      }

      for (const pc of phongChoList) {
        // Tên sheet tối đa 31 ký tự trong Excel
        const ws = wb.addWorksheet(pc.name.substring(0, 31));
        ws.columns = [
          { header: 'STT', key: 'stt', width: 6 },
          { header: 'SBD', key: 'sbd', width: 10 },
          { header: 'Họ tên', key: 'ho_ten', width: 28 },
          { header: 'Vị trí thi', key: 'vi_tri', width: 24 },
          { header: 'Đơn vị dự tuyển', key: 'don_vi', width: 32 },
          { header: 'Mã đề / Phách bốc thăm', key: 'ma_de', width: 22 },
          { header: 'Thời gian bắt đầu chuẩn bị', key: 'tg_bat_dau', width: 24 },
          { header: 'Thời gian kết thúc / Gọi vào', key: 'tg_ket_thuc', width: 24 },
          { header: 'Chữ ký thí sinh', key: 'chu_ky', width: 20 },
        ];
        styleHeader(ws.getRow(1));

        pc.candidates.forEach((r, i) => {
          const row = ws.addRow({
            stt: i + 1,
            sbd: r.sbd,
            ho_ten: r.ho_ten,
            vi_tri: r.vi_tri,
            don_vi: r.don_vi,
            ma_de: '',
            tg_bat_dau: '',
            tg_ket_thuc: '',
            chu_ky: '',
          });
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
