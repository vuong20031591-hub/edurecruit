import { getDb } from '@/db';
import type { PhongThi } from '@/db/schema';
import type { PhongThiFilter, PhongThiView, PhongThiStats, PhongThiCreate, PhongThiUpdate } from './types';

export const phongthiRepository = {
  list(filter: PhongThiFilter): PhongThiView[] {
    const db = getDb();
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filter.ky_tuyendung_id != null) {
      conditions.push('p.ky_tuyendung_id = ?');
      params.push(filter.ky_tuyendung_id);
    }
    if (filter.vi_tri_dang_ky_id != null) {
      conditions.push('p.vi_tri_dang_ky_id = ?');
      params.push(filter.vi_tri_dang_ky_id);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db.prepare(`
      SELECT p.*,
        CAST(ROUND(CAST(p.so_luong_da_xep AS REAL) / MAX(p.suc_chua,1) * 100) AS INTEGER) AS ty_le_lap_day,
        v.mon AS ten_vi_tri
      FROM phongthi p
      LEFT JOIN vitri_tuyendung v ON v.id = p.vi_tri_dang_ky_id
      ${where}
      ORDER BY p.ngay_thi ASC, p.gio_thi ASC, p.ma_phong ASC
    `).all(...params) as PhongThiView[];
    return rows;
  },

  findById(id: number): PhongThiView | null {
    const row = getDb().prepare(`
      SELECT p.*,
        CAST(ROUND(CAST(p.so_luong_da_xep AS REAL) / MAX(p.suc_chua,1) * 100) AS INTEGER) AS ty_le_lap_day,
        v.mon AS ten_vi_tri
      FROM phongthi p
      LEFT JOIN vitri_tuyendung v ON v.id = p.vi_tri_dang_ky_id
      WHERE p.id = ?
    `).get(id) as PhongThiView | undefined;
    return row ?? null;
  },

  getStats(kyId: number): PhongThiStats {
    const db = getDb();
    // Compute so_luong_da_xep real-time từ diemthi (tránh denormalized counter drift)
    const rows = db.prepare(`
      SELECT
        p.suc_chua,
        (SELECT COUNT(*) FROM diemthi WHERE phongthi_id = p.id) AS da_xep_real
      FROM phongthi p
      WHERE p.ky_tuyendung_id = ?
    `).all(kyId) as { suc_chua: number; da_xep_real: number }[];
    let tongSucChua = 0, daXep = 0, phongDaycho = 0, phongConCho = 0;
    for (const r of rows) {
      tongSucChua += r.suc_chua;
      daXep += r.da_xep_real;
      if (r.da_xep_real >= r.suc_chua) phongDaycho++;
      else phongConCho++;
    }
    return {
      tongPhong: rows.length,
      tongSucChua,
      daXep,
      conTrong: tongSucChua - daXep,
      phongDaycho,
      phongConCho,
    };
  },

  create(data: PhongThiCreate): PhongThi {
    const db = getDb();
    const info = db.prepare(`
      INSERT INTO phongthi (ky_tuyendung_id, vi_tri_dang_ky_id, ma_phong, ten_phong, dia_diem, suc_chua, ngay_thi, gio_thi, ghi_chu)
      VALUES (@ky_tuyendung_id, @vi_tri_dang_ky_id, @ma_phong, @ten_phong, @dia_diem, @suc_chua, @ngay_thi, @gio_thi, @ghi_chu)
    `).run({
      ky_tuyendung_id: data.ky_tuyendung_id,
      vi_tri_dang_ky_id: data.vi_tri_dang_ky_id,
      ma_phong: data.ma_phong.trim(),
      ten_phong: data.ten_phong ?? null,
      dia_diem: data.dia_diem ?? null,
      suc_chua: data.suc_chua,
      ngay_thi: data.ngay_thi,
      gio_thi: data.gio_thi,
      ghi_chu: data.ghi_chu ?? null,
    });
    return db.prepare('SELECT * FROM phongthi WHERE id = ?').get(info.lastInsertRowid) as PhongThi;
  },

  update(id: number, data: PhongThiUpdate): PhongThi {
    const db = getDb();
    const fields: string[] = [];
    const params: unknown[] = [];
    if (data.ma_phong !== undefined) { fields.push('ma_phong = ?'); params.push(data.ma_phong.trim()); }
    if (data.ten_phong !== undefined) { fields.push('ten_phong = ?'); params.push(data.ten_phong); }
    if (data.dia_diem !== undefined) { fields.push('dia_diem = ?'); params.push(data.dia_diem); }
    if (data.suc_chua !== undefined) { fields.push('suc_chua = ?'); params.push(data.suc_chua); }
    if (data.ngay_thi !== undefined) { fields.push('ngay_thi = ?'); params.push(data.ngay_thi); }
    if (data.gio_thi !== undefined) { fields.push('gio_thi = ?'); params.push(data.gio_thi); }
    if (data.ghi_chu !== undefined) { fields.push('ghi_chu = ?'); params.push(data.ghi_chu); }
    if (data.trang_thai !== undefined) { fields.push('trang_thai = ?'); params.push(data.trang_thai); }
    if (fields.length === 0) return db.prepare('SELECT * FROM phongthi WHERE id = ?').get(id) as PhongThi;
    fields.push("updated_at = datetime('now')");
    params.push(id);
    db.prepare(`UPDATE phongthi SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return db.prepare('SELECT * FROM phongthi WHERE id = ?').get(id) as PhongThi;
  },

  delete(id: number): void {
    getDb().prepare('DELETE FROM phongthi WHERE id = ?').run(id);
  },

  exists(id: number): boolean {
    const row = getDb().prepare('SELECT id FROM phongthi WHERE id = ?').get(id);
    return !!row;
  },

  kyExists(kyId: number): boolean {
    const row = getDb().prepare('SELECT id FROM ky_tuyendung WHERE id = ?').get(kyId);
    return !!row;
  },

  vitriExists(vitriId: number, kyId: number): boolean {
    const row = getDb().prepare('SELECT id FROM vitri_tuyendung WHERE id = ? AND ky_tuyendung_id = ?').get(vitriId, kyId);
    return !!row;
  },

  countThiSinhInPhong(phongId: number): number {
    const row = getDb().prepare('SELECT COUNT(*) AS c FROM diemthi WHERE phongthi_id = ?').get(phongId) as { c: number };
    return row.c;
  },

  hasViTriDonViWithChiTieu(kyId: number): boolean {
    const row = getDb().prepare(`
      SELECT 1
      FROM vitri_donvi vd
      JOIN vitri_tuyendung v ON v.id = vd.vitri_tuyendung_id
      WHERE v.ky_tuyendung_id = ? AND vd.so_luong_phan_bo > 0
      LIMIT 1
    `).get(kyId);
    return !!row;
  },

  countUnlockedHopLe(kyId: number): number {
    const row = getDb().prepare(`
      SELECT COUNT(*) AS c
      FROM thisinh
      WHERE ky_tuyendung_id = ? AND trang_thai_ho_so = 'HopLe' AND is_profile_locked = 0
    `).get(kyId) as { c: number };
    return row.c;
  },

  previewSapXep(kyId: number): { eligible: number; rooms: number; totalCapacity: number; warnings: string[] } {
    const db = getDb();
    const warnings: string[] = [];

    const eligibleRow = db.prepare(`
      SELECT COUNT(*) AS c
      FROM thisinh
      WHERE ky_tuyendung_id = ?
        AND trang_thai_ho_so = 'HopLe'
        AND is_profile_locked = 1
        AND cccd IS NOT NULL AND cccd != ''
    `).get(kyId) as { c: number };
    const eligible = eligibleRow.c;

    const roomRows = db.prepare(`
      SELECT suc_chua FROM phongthi
      WHERE ky_tuyendung_id = ? AND trang_thai NOT IN ('DaKhoa','DaThiXong')
    `).all(kyId) as { suc_chua: number }[];
    const rooms = roomRows.length;
    const totalCapacity = roomRows.reduce((sum, r) => sum + r.suc_chua, 0);

    if (eligible === 0) warnings.push('Không có thí sinh hợp lệ nào đủ điều kiện xếp phòng');
    if (rooms === 0) warnings.push('Chưa có phòng thi trong kỳ');
    if (eligible > totalCapacity) warnings.push(`Số thí sinh (${eligible}) vượt quá tổng sức chứa (${totalCapacity})`);

    const unlocked = db.prepare(`
      SELECT COUNT(*) AS c FROM thisinh
      WHERE ky_tuyendung_id = ? AND trang_thai_ho_so = 'HopLe' AND is_profile_locked = 0
    `).get(kyId) as { c: number };
    if (unlocked.c > 0) warnings.push(`Còn ${unlocked.c} thí sinh hợp lệ chưa khóa hồ sơ`);

    return { eligible, rooms, totalCapacity, warnings };
  },

  /**
   * Chuyển phòng thủ công cho 1 hoặc nhiều thí sinh.
   */
  chuyenPhong(tsIds: number[], phongMoiId: number): { moved: number; skipped: number; warnings: string[] } {
    const db = getDb();
    const warnings: string[] = [];

    const targetRoom = db.prepare('SELECT id, suc_chua, ky_tuyendung_id, vi_tri_dang_ky_id FROM phongthi WHERE id = ?').get(phongMoiId) as
      | { id: number; suc_chua: number; ky_tuyendung_id: number; vi_tri_dang_ky_id: number }
      | undefined;
    if (!targetRoom) throw new Error('Phòng đích không tồn tại');

    const currentCount = db.prepare('SELECT COUNT(*) AS c FROM diemthi WHERE phongthi_id = ?').get(phongMoiId) as { c: number };
    const slotsLeft = targetRoom.suc_chua - currentCount.c;

    const tsList = db.prepare(`
      SELECT t.id, t.vi_tri_dang_ky_id, dt.id AS diemthi_id, dt.trang_thai_nhap
      FROM thisinh t
      LEFT JOIN diemthi dt ON dt.thisinh_id = t.id
      WHERE t.id IN (${tsIds.map(() => '?').join(',')})
    `).all(...tsIds) as Array<{ id: number; vi_tri_dang_ky_id: number; diemthi_id: number | null; trang_thai_nhap: string | null }>;

    const updateDiemthi = db.prepare(`
      UPDATE diemthi SET phongthi_id = ?, updated_at = datetime('now') WHERE id = ?
    `);
    const insertDiemthi = db.prepare(`
      INSERT INTO diemthi (thisinh_id, phongthi_id, trang_thai_nhap) VALUES (?, ?, 'ChuaNhap')
    `);
    const updatePhongOld = db.prepare(`
      UPDATE phongthi
      SET so_luong_da_xep = so_luong_da_xep - 1,
          trang_thai = CASE WHEN so_luong_da_xep - 1 = 0 THEN 'ChuaSapXep' ELSE 'DaSapXep' END,
          updated_at = datetime('now')
      WHERE id = (SELECT phongthi_id FROM diemthi WHERE id = ?)
    `);
    const updatePhongNew = db.prepare(`
      UPDATE phongthi
      SET so_luong_da_xep = so_luong_da_xep + 1,
          trang_thai = 'DaSapXep',
          updated_at = datetime('now')
      WHERE id = ?
    `);

    let moved = 0;
    let skipped = 0;

    const tx = db.transaction(() => {
      for (const ts of tsList) {
        if (ts.vi_tri_dang_ky_id !== targetRoom.vi_tri_dang_ky_id) {
          warnings.push(`TS #${ts.id}: khác vị trí với phòng đích`);
          skipped++;
          continue;
        }
        if (ts.trang_thai_nhap === 'DaKhoa') {
          warnings.push(`TS #${ts.id}: điểm đã khóa, không thể chuyển phòng`);
          skipped++;
          continue;
        }
        if (moved >= slotsLeft) {
          warnings.push('Phòng đích đã đầy');
          skipped++;
          continue;
        }

        if (ts.diemthi_id) {
          updatePhongOld.run(ts.diemthi_id);
          updateDiemthi.run(phongMoiId, ts.diemthi_id);
        } else {
          insertDiemthi.run(ts.id, phongMoiId);
        }
        updatePhongNew.run(phongMoiId);
        moved++;
      }
    });

    tx();
    return { moved, skipped, warnings };
  },

  /**
   * Xếp phòng tự động theo PRD Bước 4.
   *
   * Preconditions (đã được service kiểm tra trước khi gọi):
   *   - Tất cả TS HopLe đã khóa hồ sơ (is_profile_locked = 1)
   *   - Có ít nhất 1 phòng thi trong kỳ
   *   - Có ít nhất 1 vitri_donvi với chỉ tiêu > 0
   *
   * Algorithm:
   *   1. Lấy TS HopLe, CCCD NOT NULL, chưa có phòng; sort theo vị trí, đơn vị, tên, họ.
   *   2. Reset toàn bộ SBD + phòng của các TS HopLe trong kỳ (cho phép xếp lại).
   *   3. Gán SBD theo thứ tự ABC tên trong cùng vị trí: SBD-0001, SBD-0002, ...
   *   4. Rải TS vào phòng:
   *        - Chỉ xếp vào phòng cùng vị trí (vi_tri_dang_ky_id)
   *        - Ưu tiên gom cùng đơn vị: trong các phòng cùng vị trí còn chỗ,
   *          chọn phòng đang có nhiều TS cùng đơn vị nhất.
   *        - Nếu không có phòng nào có TS cùng đơn vị, dùng round-robin để
   *          phân bổ đều giữa các phòng cùng vị trí còn chỗ.
   *   5. Nếu TS vượt quá sức chứa, vẫn tiếp tục xếp (phòng cuối quá tải) nhưng
   *      trả về warnings.
   */
  autoSapXep(kyId: number): { assigned: number; skipped: number; warnings: string[]; assignments: Array<{ thisinh_id: number; phongthi_id: number; sbd: string }> } {
    const db = getDb();

    const candidates = db.prepare(`
      SELECT t.id, t.vi_tri_dang_ky_id, t.don_vi_du_tuyen_id, t.ho, t.ten
      FROM thisinh t
      WHERE t.ky_tuyendung_id = ?
        AND t.trang_thai_ho_so = 'HopLe'
        AND t.is_profile_locked = 1
        AND t.cccd IS NOT NULL
        AND t.cccd != ''
      ORDER BY t.vi_tri_dang_ky_id ASC, t.don_vi_du_tuyen_id ASC, t.ten ASC, t.ho ASC
    `).all(kyId) as { id: number; vi_tri_dang_ky_id: number; don_vi_du_tuyen_id: number; ho: string; ten: string }[];

    const rooms = db.prepare(`
      SELECT id, vi_tri_dang_ky_id, suc_chua, so_luong_da_xep
      FROM phongthi
      WHERE ky_tuyendung_id = ? AND trang_thai NOT IN ('DaKhoa','DaThiXong')
      ORDER BY ngay_thi ASC, gio_thi ASC, ma_phong ASC
    `).all(kyId) as { id: number; vi_tri_dang_ky_id: number; suc_chua: number; so_luong_da_xep: number }[];

    const warnings: string[] = [];
    if (candidates.length === 0) {
      warnings.push('Không có thí sinh hợp lệ nào đủ điều kiện xếp phòng (đã khóa, có CCCD)');
      return { assigned: 0, skipped: 0, warnings, assignments: [] };
    }
    if (rooms.length === 0) {
      warnings.push('Chưa có phòng thi nào trong kỳ');
      return { assigned: 0, skipped: candidates.length, warnings, assignments: [] };
    }

    // Kiểm tra tổng sức chứa để warning trước khi chạy
    const totalCapacity = rooms.reduce((sum, r) => sum + r.suc_chua, 0);
    if (candidates.length > totalCapacity) {
      warnings.push(`Tổng số thí sinh (${candidates.length}) vượt quá tổng sức chứa (${totalCapacity}). Phòng cuối sẽ bị quá tải.`);
    }

    // Trạng thái runtime của từng phòng
    const roomState = new Map(rooms.map(r => [r.id, {
      ...r,
      available: r.suc_chua - r.so_luong_da_xep,
      // đếm số TS của từng đơn vị đang trong phòng này
      unitCounts: new Map<number, number>(),
      total: r.so_luong_da_xep,
    }]));

    // Reset SBD + xóa phân phòng cũ của TOÀN BỘ TS trong kỳ (kể cả không HopLe)
    // để tránh UNIQUE constraint khi gán lại. Đây là hành vi "xếp lại" theo PRD.
    const resetStmt = db.prepare(`
      UPDATE thisinh
      SET sbd = NULL, updated_at = datetime('now')
      WHERE ky_tuyendung_id = ?
    `);
    const clearDiemthiStmt = db.prepare(`
      DELETE FROM diemthi
      WHERE thisinh_id IN (SELECT id FROM thisinh WHERE ky_tuyendung_id = ?)
    `);
    const resetPhongStmt = db.prepare(`
      UPDATE phongthi
      SET so_luong_da_xep = 0,
          trang_thai = CASE WHEN trang_thai IN ('DaSapXep') THEN 'ChuaSapXep' ELSE trang_thai END,
          updated_at = datetime('now')
      WHERE ky_tuyendung_id = ?
    `);

    // Prepared statements cho assignment
    const insertDiemthi = db.prepare(`
      INSERT INTO diemthi (thisinh_id, phongthi_id) VALUES (?, ?)
    `);
    const updateThisinhSbd = db.prepare(`
      UPDATE thisinh SET sbd = ?, updated_at = datetime('now') WHERE id = ?
    `);
    const updatePhong = db.prepare(`
      UPDATE phongthi
      SET so_luong_da_xep = so_luong_da_xep + 1,
          trang_thai = CASE WHEN so_luong_da_xep + 1 >= suc_chua THEN 'DaKhoa' ELSE 'DaSapXep' END,
          updated_at = datetime('now')
      WHERE id = ?
    `);

    let assigned = 0;
    let skipped = 0;
    const assignments: Array<{ thisinh_id: number; phongthi_id: number; sbd: string }> = [];

    const sapXep = db.transaction(() => {
      // 1. Reset dữ liệu cũ
      resetStmt.run(kyId);
      clearDiemthiStmt.run(kyId);
      resetPhongStmt.run(kyId);

      // Reset runtime state về 0
      for (const r of rooms) {
        const s = roomState.get(r.id)!;
        s.available = r.suc_chua;
        s.unitCounts = new Map<number, number>();
        s.total = 0;
      }

      // 2. Gán SBD và xếp phòng
      let sbdSeq = 0;
      const viTriIds = Array.from(new Set(candidates.map(c => c.vi_tri_dang_ky_id)));

      for (const viTriId of viTriIds) {
        // Lấy danh sách thí sinh và phòng của vị trí này
        const candidatesForViTri = candidates.filter(c => c.vi_tri_dang_ky_id === viTriId);
        const roomsForViTri = rooms.filter(r => r.vi_tri_dang_ky_id === viTriId);

        if (roomsForViTri.length === 0) {
          for (const ts of candidatesForViTri) {
            skipped++;
            warnings.push(`Thí sinh #${ts.id} (${ts.ho} ${ts.ten}): không có phòng cho vị trí ${viTriId}`);
          }
          continue;
        }

        // Nhóm thí sinh theo đơn vị tuyển dụng
        const candidatesByUnit = new Map<number, typeof candidates>();
        for (const ts of candidatesForViTri) {
          if (!candidatesByUnit.has(ts.don_vi_du_tuyen_id)) {
            candidatesByUnit.set(ts.don_vi_du_tuyen_id, []);
          }
          candidatesByUnit.get(ts.don_vi_du_tuyen_id)!.push(ts);
        }

        // Trải phẳng danh sách thí sinh đã gom theo đơn vị (đơn vị sắp xếp theo ID)
        const sortedCandidatesForViTri: typeof candidates = [];
        const sortedUnitIds = Array.from(candidatesByUnit.keys()).sort((a, b) => a - b);
        for (const unitId of sortedUnitIds) {
          sortedCandidatesForViTri.push(...candidatesByUnit.get(unitId)!);
        }

        let roomIdx = 0;
        for (const ts of sortedCandidatesForViTri) {
          // Tìm phòng thi còn chỗ
          while (roomIdx < roomsForViTri.length) {
            const rState = roomState.get(roomsForViTri[roomIdx].id)!;
            if (rState.available > 0) {
              break;
            }
            roomIdx++;
          }

          if (roomIdx >= roomsForViTri.length) {
            skipped++;
            warnings.push(`Thí sinh #${ts.id} (${ts.ho} ${ts.ten}): hết chỗ trống cho vị trí ${viTriId}`);
            continue;
          }

          const targetRoom = roomsForViTri[roomIdx];
          const rState = roomState.get(targetRoom.id)!;

          // Gán SBD
          sbdSeq++;
          const sbd = `SBD-${String(sbdSeq).padStart(4, '0')}`;

          // Persist
          updateThisinhSbd.run(sbd, ts.id);
          insertDiemthi.run(ts.id, targetRoom.id);
          updatePhong.run(targetRoom.id);

          // Update runtime state
          rState.available--;
          rState.total++;
          rState.unitCounts.set(ts.don_vi_du_tuyen_id, (rState.unitCounts.get(ts.don_vi_du_tuyen_id) ?? 0) + 1);

          assignments.push({ thisinh_id: ts.id, phongthi_id: targetRoom.id, sbd });
          assigned++;
        }
      }
    });

    sapXep();
    return { assigned, skipped, warnings, assignments };
  },
};
