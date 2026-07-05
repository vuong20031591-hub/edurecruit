import { getDb } from '@/db';
import type { XetTuyenResult, KetQuaView, PreCheckResult } from './types';

const DEFAULT_DIEM_DAT = 5.0;

interface ViTriRow {
  id: number;
  ma_vi_tri: string;
  mon: string;
  thu_tu_uu_tien_dong_diem: string | null;
}

interface ThiSinhDiem {
  thisinh_id: number;
  diem_thi_giang: number | null;
  diem_uu_tien: number;
  vang_thi: number;
  bo_thi: number;
  doi_tuong_uu_tien: string | null;
  xep_loai_bang: string | null;
  ngay_nop_ho_so: string;
}

export const xettuyenService = {

  getDiemDat(): number {
    const db = getDb();
    const row = db.prepare(
      "SELECT value FROM system_config WHERE key = 'xet_tuyen.diem_dat'"
    ).get() as { value: string } | undefined;
    return row ? parseFloat(row.value) : DEFAULT_DIEM_DAT;
  },

  preCheck(kyId: number): PreCheckResult {
    const db = getDb();

    // Chỉ tính thí sinh HopLe đã có phongthi (đã xếp phòng) - theo PRD Bước 5
    const total = db.prepare(`
      SELECT COUNT(*) AS c FROM thisinh t
      JOIN diemthi dt ON dt.thisinh_id = t.id
      WHERE t.ky_tuyendung_id = ? AND t.trang_thai_ho_so = 'HopLe'
        AND dt.phongthi_id IS NOT NULL
    `).get(kyId) as { c: number };

    const daKhoa = db.prepare(`
      SELECT COUNT(*) AS c FROM diemthi dt
      JOIN thisinh t ON t.id = dt.thisinh_id
      WHERE t.ky_tuyendung_id = ? AND t.trang_thai_ho_so = 'HopLe'
        AND dt.phongthi_id IS NOT NULL
        AND dt.trang_thai_nhap = 'DaKhoa'
    `).get(kyId) as { c: number };

    const chuaKhoa = total.c - daKhoa.c;
    const ready = total.c > 0 && chuaKhoa === 0;

    let message = '';
    if (total.c === 0) {
      message = 'Chưa có thí sinh hợp lệ trong kỳ này';
    } else if (chuaKhoa > 0) {
      message = `Còn ${chuaKhoa}/${total.c} thí sinh chưa khóa điểm`;
    } else {
      message = `Sẵn sàng xét tuyển (${total.c} thí sinh đã khóa điểm)`;
    }

    return {
      ready,
      total_thisinh: total.c,
      diem_da_khoa: daKhoa.c,
      diem_chua_khoa: chuaKhoa,
      message,
    };
  },

  run(kyId: number, userId: number): XetTuyenResult {
    const db = getDb();
    const diemDat = this.getDiemDat();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    let trungTuyenCount = 0;
    let duPhongCount = 0;
    let khongDatCount = 0;

    const tx = db.transaction(() => {
      db.prepare(`
        DELETE FROM ketqua WHERE thisinh_id IN (
          SELECT id FROM thisinh WHERE ky_tuyendung_id = ?
        )
      `).run(kyId);

      interface NhomRow {
        vi_tri_dang_ky_id: number;
        don_vi_du_tuyen_id: number;
        so_luong_phan_bo: number;
        ma_vi_tri: string;
        mon: string;
        thu_tu_uu_tien_dong_diem: string | null;
      }

      const nhomList = db.prepare(`
        SELECT DISTINCT 
          t.vi_tri_dang_ky_id, 
          t.don_vi_du_tuyen_id, 
          COALESCE(vd.so_luong_phan_bo, 0) AS so_luong_phan_bo,
          v.ma_vi_tri,
          v.mon,
          v.thu_tu_uu_tien_dong_diem
        FROM thisinh t
        JOIN vitri_tuyendung v ON v.id = t.vi_tri_dang_ky_id
        LEFT JOIN vitri_donvi vd ON vd.vitri_tuyendung_id = t.vi_tri_dang_ky_id AND vd.don_vi_tuyen_dung_id = t.don_vi_du_tuyen_id
        WHERE t.ky_tuyendung_id = ? AND t.trang_thai_ho_so = 'HopLe'
      `).all(kyId) as NhomRow[];

      const insertKetqua = db.prepare(`
        INSERT INTO ketqua (thisinh_id, diem_thi_giang, diem_uu_tien, diem_tong, xep_hang, ket_qua, ghi_chu, ngay_chay, nguoi_chay)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const nhom of nhomList) {
        const danhSach = db.prepare(`
          SELECT
            t.id AS thisinh_id,
            dt.diem_thi_giang,
            COALESCE(kq.diem_uu_tien, 0) AS diem_uu_tien,
            dt.vang_thi,
            dt.bo_thi,
            t.doi_tuong_uu_tien,
            t.xep_loai_bang,
            t.ngay_nop_ho_so
          FROM thisinh t
          JOIN diemthi dt ON dt.thisinh_id = t.id
          LEFT JOIN ketqua kq ON kq.thisinh_id = t.id
          WHERE t.vi_tri_dang_ky_id = ?
            AND t.don_vi_du_tuyen_id = ?
            AND t.trang_thai_ho_so = 'HopLe'
            AND dt.trang_thai_nhap = 'DaKhoa'
        `).all(nhom.vi_tri_dang_ky_id, nhom.don_vi_du_tuyen_id) as ThiSinhDiem[];

        const scored = danhSach.map(ts => ({
          ...ts,
          diem_tong: (ts.diem_thi_giang ?? 0) + ts.diem_uu_tien,
        }));

        const getDoiTuongUuTienWeight = (val: string | null): number => {
          if (!val) return 0;
          const list = val.split(',').map(s => s.trim().toLowerCase());
          let maxWeight = 0;
          for (const item of list) {
            let w = 0;
            if (item === 'anh_hung_llvt') w = 5;
            else if (item === 'con_liet_si') w = 4;
            else if (item === 'con_thuong_binh') w = 3;
            else if (item === 'dan_toc_thieu_so') w = 2;
            else if (item === 'ho_khau_tinh') w = 1;
            if (w > maxWeight) maxWeight = w;
          }
          return maxWeight;
        };

        const getXepLoaiBangWeight = (val: string | null): number => {
          if (!val) return 0;
          const normalized = val.trim();
          if (normalized === 'Xuất sắc') return 5;
          if (normalized === 'Giỏi') return 4;
          if (normalized === 'Khá') return 3;
          if (normalized === 'TB Khá') return 2;
          if (normalized === 'Trung bình') return 1;
          return 0;
        };

        const criteria = nhom.thu_tu_uu_tien_dong_diem
          ? (JSON.parse(nhom.thu_tu_uu_tien_dong_diem) as string[])
          : ['diem_thi_giang', 'doi_tuong_uu_tien', 'xep_loai_bang', 'ngay_nop_ho_so'];

        scored.sort((a, b) => {
          if (b.diem_tong !== a.diem_tong) return b.diem_tong - a.diem_tong;

          for (const criterion of criteria) {
            if (criterion === 'diem_thi_giang') {
              const diff = (b.diem_thi_giang ?? 0) - (a.diem_thi_giang ?? 0);
              if (diff !== 0) return diff;
            } else if (criterion === 'doi_tuong_uu_tien') {
              const diff = getDoiTuongUuTienWeight(b.doi_tuong_uu_tien) - getDoiTuongUuTienWeight(a.doi_tuong_uu_tien);
              if (diff !== 0) return diff;
            } else if (criterion === 'xep_loai_bang') {
              const diff = getXepLoaiBangWeight(b.xep_loai_bang) - getXepLoaiBangWeight(a.xep_loai_bang);
              if (diff !== 0) return diff;
            } else if (criterion === 'ngay_nop_ho_so') {
              const tA = a.ngay_nop_ho_so ? new Date(a.ngay_nop_ho_so).getTime() : 0;
              const tB = b.ngay_nop_ho_so ? new Date(b.ngay_nop_ho_so).getTime() : 0;
              const diff = tA - tB;
              if (diff !== 0) return diff;
            }
          }
          return 0;
        });

        let rank = 0;
        for (const ts of scored) {
          const isVangBo = ts.vang_thi === 1 || ts.bo_thi === 1;

          if (isVangBo) {
            const ketQua = ts.vang_thi === 1 ? 'Vang' : 'BoThi';
            insertKetqua.run(
              ts.thisinh_id, ts.diem_thi_giang, ts.diem_uu_tien,
              ts.diem_tong, null, ketQua, null, now, userId
            );
            khongDatCount++;
            continue;
          }

          const datDieuKien = (ts.diem_thi_giang ?? 0) >= diemDat;

          if (!datDieuKien) {
            insertKetqua.run(
              ts.thisinh_id, ts.diem_thi_giang, ts.diem_uu_tien,
              ts.diem_tong, null, 'KhongDat', 'Trượt điểm tối thiểu', now, userId
            );
            khongDatCount++;
            continue;
          }

          rank++;

          if (rank <= nhom.so_luong_phan_bo) {
            insertKetqua.run(
              ts.thisinh_id, ts.diem_thi_giang, ts.diem_uu_tien,
              ts.diem_tong, rank, 'Dat', null, now, userId
            );
            trungTuyenCount++;
          } else {
            insertKetqua.run(
              ts.thisinh_id, ts.diem_thi_giang, ts.diem_uu_tien,
              ts.diem_tong, rank, 'Dat', 'DuPhong', now, userId
            );
            duPhongCount++;
          }
        }
      }

      const uniqueViTriCount = new Set(nhomList.map(n => n.vi_tri_dang_ky_id)).size;
      return uniqueViTriCount;
    });

    const vitriCount = tx();

    return {
      vitri_count: vitriCount,
      trung_tuyen_count: trungTuyenCount,
      du_phong_count: duPhongCount,
      khong_dat_count: khongDatCount,
      ngay_chay: now,
    };
  },

  getKetQua(kyId: number, vitriId?: number): KetQuaView[] {
    const db = getDb();
    const conditions = ['t.ky_tuyendung_id = ?'];
    const params: unknown[] = [kyId];

    if (vitriId) {
      conditions.push('t.vi_tri_dang_ky_id = ?');
      params.push(vitriId);
    }

    const where = conditions.join(' AND ');

    return db.prepare(`
      SELECT
        kq.id,
        kq.thisinh_id,
        t.sbd,
        t.ho_ten,
        t.vi_tri_dang_ky_id AS vi_tri_id,
        v.ma_vi_tri,
        v.mon,
        kq.diem_thi_giang,
        kq.diem_uu_tien,
        kq.diem_tong,
        kq.xep_hang,
        kq.ket_qua,
        kq.ghi_chu,
        kq.ngay_chay,
        dt.vang_thi,
        dt.bo_thi
      FROM ketqua kq
      JOIN thisinh t ON t.id = kq.thisinh_id
      JOIN vitri_tuyendung v ON v.id = t.vi_tri_dang_ky_id
      LEFT JOIN diemthi dt ON dt.thisinh_id = t.id
      WHERE ${where}
      ORDER BY
        CASE kq.ket_qua
          WHEN 'Dat' THEN 1
          WHEN 'Vang' THEN 2
          WHEN 'BoThi' THEN 3
          WHEN 'KhongDat' THEN 4
          ELSE 5
        END,
        kq.xep_hang ASC NULLS LAST,
        kq.diem_tong DESC
    `).all(...params) as KetQuaView[];
  },

  getLastRun(kyId: number): string | null {
    const db = getDb();
    const row = db.prepare(`
      SELECT MAX(kq.ngay_chay) AS last_run
      FROM ketqua kq
      JOIN thisinh t ON t.id = kq.thisinh_id
      WHERE t.ky_tuyendung_id = ?
    `).get(kyId) as { last_run: string | null } | undefined;
    return row?.last_run ?? null;
  },
};
