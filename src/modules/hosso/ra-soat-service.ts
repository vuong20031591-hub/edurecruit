/**
 * Rà soát tự động — Service
 * File: src/modules/hosso/ra-soat-service.ts
 */
import type { Session } from '@/server/auth';
import { hasPermission } from '@/server/permissions';
import { audit } from '@/server/audit';
import { NotFoundError, UnauthorizedError, ValidationError } from '@/server/api';
import { getDb } from '@/db';
import { raSoatRepository } from './ra-soat-repository';
import { monChuyenNganhRepository } from '../mon-chuyen-nganh/repository';
import {
  buildDuplicateSets,
  evaluateThiSinh,
  summarize,
  type RaSoatResult
} from './ra-soat-rules';

/** Cache whitelist (mon, chuyen_nganh) với TTL 60s */
let whitelistCache: { data: Set<string>; loadedAt: number } | null = null;
const WHITELIST_TTL_MS = 60 * 1000;

function getWhitelist(): Set<string> {
  const now = Date.now();
  if (whitelistCache && now - whitelistCache.loadedAt < WHITELIST_TTL_MS) {
    return whitelistCache.data;
  }
  const rows = monChuyenNganhRepository.listAll();
  const set = new Set<string>();
  for (const r of rows) {
    set.add(`${r.mon.toLowerCase().trim()}|${r.chuyen_nganh.toLowerCase().trim()}`);
  }
  whitelistCache = { data: set, loadedAt: now };
  return set;
}

/** Invalidate cache (gọi từ admin page khi update) */
export function invalidateWhitelistCache(): void {
  whitelistCache = null;
}

export function isWhitelistedMonChuyenNganh(mon: string, chuyenNganh: string): boolean {
  return getWhitelist().has(`${mon.toLowerCase().trim()}|${chuyenNganh.toLowerCase().trim()}`);
}

function getUserId(session: Session): number {
  const id = parseInt(session.sub, 10);
  if (!Number.isFinite(id) || id <= 0) {
    throw new ValidationError('Session không hợp lệ');
  }
  return id;
}

function requirePerm(session: Session, perm: Parameters<typeof hasPermission>[1]): void {
  if (!hasPermission(session.quyen, perm)) {
    throw new UnauthorizedError(`Thiếu quyền: ${perm}`);
  }
}

export const raSoatService = {
  /**
   * Preview kết quả rà soát — không lưu DB.
   * Dùng cho modal preview trước khi user xác nhận.
   */
  async previewForKy(kyId: number, session: Session): Promise<{
    results: RaSoatResult[];
    summary: { dat: number; canhBao: number; khongDat: number; tong: number };
  }> {
    requirePerm(session, 'hosso.rasoat');
    const thisinhs = raSoatRepository.listThiSinhForCheck(kyId);
    const dup = buildDuplicateSets(thisinhs);
    const results = thisinhs.map(ts => evaluateThiSinh(ts, dup, isWhitelistedMonChuyenNganh));
    return { results, summary: summarize(results) };
  },

  /**
   * Chạy rà soát thực sự cho toàn bộ kỳ — lưu DB + audit log.
   * Trả về summary + số bản ghi đã ghi.
   */
  async runForKy(
    kyId: number,
    session: Session
  ): Promise<{
    saved: number;
    summary: { dat: number; canhBao: number; khongDat: number; tong: number };
  }> {
    requirePerm(session, 'hosso.rasoat');
    const userId = getUserId(session);

    const thisinhs = raSoatRepository.listThiSinhForCheck(kyId);
    if (thisinhs.length === 0) {
      throw new ValidationError('Không có thí sinh nào chưa khóa trong kỳ để rà soát');
    }

    const dup = buildDuplicateSets(thisinhs);
    const results = thisinhs.map(ts => evaluateThiSinh(ts, dup, isWhitelistedMonChuyenNganh));

    let saved = 0;
    const db = raSoatRepository;
    for (const r of results) {
      db.insert({
        thisinh_id: r.thisinh_id,
        ky_tuyendung_id: kyId,
        trang_thai: r.trang_thai,
        diem_uu_tien: r.diem_uu_tien,
        ly_do: JSON.stringify(r.issues),
        nguoi_ra_soat: userId
      });
      saved++;
    }

    audit({
      action: 'RA_SOAT_TU_DONG',
      userId,
      username: session.username,
      resourceType: 'ky_tuyendung',
      resourceId: kyId,
      payload: {
        ky_tuyendung_id: kyId,
        so_thi_sinh: results.length,
        ...summarize(results)
      },
      result: 'SUCCESS'
    });

    return { saved, summary: summarize(results) };
  },

  /**
   * Chạy rà soát cho 1 thí sinh cụ thể — dùng khi user vừa sửa thông tin và muốn check lại.
   */
  async runForThiSinh(
    thisinhId: number,
    session: Session
  ): Promise<RaSoatResult> {
    requirePerm(session, 'hosso.rasoat');
    const userId = getUserId(session);

    const ts = raSoatRepository.findThiSinhForCheck(thisinhId);
    if (!ts) throw new NotFoundError(`Không tìm thấy thí sinh #${thisinhId}`);

    // Lấy toàn bộ TS trong kỳ để build duplicate map
    const allInKy = raSoatRepository.listThiSinhForCheck(ts.ky_tuyendung_id);
    const dup = buildDuplicateSets(allInKy);
    const result = evaluateThiSinh(ts, dup, isWhitelistedMonChuyenNganh);

    raSoatRepository.insert({
      thisinh_id: result.thisinh_id,
      ky_tuyendung_id: ts.ky_tuyendung_id,
      trang_thai: result.trang_thai,
      diem_uu_tien: result.diem_uu_tien,
      ly_do: JSON.stringify(result.issues),
      nguoi_ra_soat: userId
    });

    audit({
      action: 'RA_SOAT_TU_DONG',
      userId,
      username: session.username,
      resourceType: 'thisinh',
      resourceId: thisinhId,
      payload: {
        trang_thai: result.trang_thai,
        diem: result.diem_uu_tien,
        so_issues: result.issues.length
      },
      result: 'SUCCESS'
    });

    return result;
  },

  /**
   * Lấy lịch sử rà soát của 1 thí sinh.
   */
  async getHistory(thisinhId: number, session: Session) {
    requirePerm(session, 'hosso.view');
    return raSoatRepository.getHistoryForThiSinh(thisinhId);
  },

  /**
   * Lấy kết quả mới nhất của 1 thí sinh.
   */
  async getLatest(thisinhId: number, session: Session) {
    requirePerm(session, 'hosso.view');
    return raSoatRepository.getLatestForThiSinh(thisinhId);
  },

  /**
   * Summary cho toàn kỳ (cho UI hiển thị nhanh).
   */
  async summary(kyId: number, session: Session) {
    requirePerm(session, 'hosso.view');
    return raSoatRepository.summaryByKy(kyId);
  },

  /**
   * Áp dụng kết quả rà soát tự động vào trang_thai_ho_so của THISINH.
   * Mapping:
   *   - Dat         → HopLe            (không cần lý do)
   *   - KhongDat     → KhongDuDieuKien  (lý do tự sinh từ issues)
   *   - CanhBao      → giữ nguyên ChoRaSoat (user duyệt thủ công)
   *
   * Side effects (mỗi hồ sơ thay đổi):
   *   - UPDATE thisinh.trang_thai_ho_so + ly_do_tu_choi
   *   - INSERT hist_chinh_sua (lưu vết thay đổi)
   *   - INSERT log_he_thong (audit) — gọi 1 lần ở cuối với summary
   *
   * Trả về: danh sách thay đổi để client lưu snapshot cho rollback.
   */
  async applyToTrangThaiHoSo(
    kyId: number,
    onlyIds: number[] | null,
    session: Session
  ): Promise<{
    applied: number;
    details: { hopLe: number; khongDuDieuKien: number; giuNguyen: number };
    /** Snapshot để client lưu vào localStorage, dùng cho rollback */
    snapshot: Array<{
      thisinh_id: number;
      old_trang_thai: string;
      old_ly_do_tu_choi: string | null;
      new_trang_thai: string;
      new_ly_do_tu_choi: string | null;
    }>;
  }> {
    requirePerm(session, 'hosso.rasoat');
    const userId = getUserId(session);
    const db = raSoatRepository;

    // Lấy kết quả rà soát mới nhất cho tất cả thí sinh trong kỳ
    const results = db.getLatestForKy(kyId);
    if (results.length === 0) {
      throw new ValidationError('Chưa có kết quả rà soát nào trong kỳ. Hãy bấm "Lưu kết quả" trước.');
    }

    // Lọc theo onlyIds nếu có
    const filtered = onlyIds && onlyIds.length > 0
      ? results.filter(r => onlyIds.includes(r.thisinh_id))
      : results;

    // Dedupe theo thisinh_id (onlyIds có thể trùng; results có thể có nhiều row cùng id do MAX(ngay_ra_soat) trùng)
    const dedupeFiltered = Array.from(
      new Map(filtered.map(r => [r.thisinh_id, r])).values()
    );

    if (dedupeFiltered.length === 0) {
      throw new ValidationError('Không có hồ sơ hợp lệ để áp dụng');
    }

    const snapshot: Array<{
      thisinh_id: number;
      old_trang_thai: string;
      old_ly_do_tu_choi: string | null;
      new_trang_thai: string;
      new_ly_do_tu_choi: string | null;
    }> = [];

    const dbHandle = getDb();
    const updateThisinh = dbHandle.prepare(`
      UPDATE thisinh
      SET trang_thai_ho_so = ?, ly_do_tu_choi = ?, updated_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    const insertHistory = dbHandle.prepare(`
      INSERT INTO hist_chinh_sua
        (thisinh_id, truong, gia_tri_cu, gia_tri_moi, ly_do, nguoi_sua)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const counts = { hopLe: 0, khongDuDieuKien: 0, giuNguyen: 0 };

    dbHandle.transaction(() => {
      for (const r of dedupeFiltered) {
        // SELECT per row bên trong transaction để tránh TOCTOU race (R-A7)
        const current = raSoatRepository.findTrangThaiHoSo(r.thisinh_id);
        if (!current) continue;
        const oldTrangThai = current.trang_thai_ho_so;
        const oldLyDo = current.ly_do_tu_choi;

        let newTrangThai: typeof oldTrangThai;
        let newLyDo: string | null = null;

        if (r.trang_thai === 'Dat') {
          newTrangThai = 'HopLe';
          newLyDo = null;
          counts.hopLe++;
        } else if (r.trang_thai === 'KhongDat') {
          newTrangThai = 'KhongDuDieuKien';
          // Tự sinh lý do từ issues (chỉ lấy message)
          const issuesText = r.ly_do
            ? (() => {
                try {
                  const parsed: unknown = JSON.parse(r.ly_do);
                  if (Array.isArray(parsed)) {
                    return parsed
                      .map((i: { message?: string }) => i?.message)
                      .filter((m): m is string => !!m)
                      .join('; ');
                  }
                  return 'Không đạt yêu cầu (chi tiết xem lịch sử rà soát)';
                } catch {
                  return 'Không đạt yêu cầu (chi tiết xem lịch sử rà soát)';
                }
              })()
            : 'Không đạt yêu cầu (chi tiết xem lịch sử rà soát)';
          newLyDo = issuesText;
          counts.khongDuDieuKien++;
        } else {
          // CanhBao → giữ nguyên ChoRaSoat
          counts.giuNguyen++;
          continue; // không UPDATE, không ghi history
        }

        // UPDATE thisinh
        updateThisinh.run(newTrangThai, newLyDo, userId, r.thisinh_id);

        // INSERT lịch sử chỉnh sửa
        insertHistory.run(
          r.thisinh_id,
          'trang_thai_ho_so',
          oldTrangThai,
          newTrangThai,
          `Áp dụng từ rà soát tự động (điểm ${r.diem_uu_tien}): ${newLyDo ?? ''}`,
          userId
        );

        snapshot.push({
          thisinh_id: r.thisinh_id,
          old_trang_thai: oldTrangThai,
          old_ly_do_tu_choi: oldLyDo,
          new_trang_thai: newTrangThai,
          new_ly_do_tu_choi: newLyDo
        });
      }
    })();

    audit({
      action: 'APPLY_RA_SOAT',
      userId,
      username: session.username,
      resourceType: 'ky_tuyendung',
      resourceId: kyId,
      payload: {
        ky_tuyendung_id: kyId,
        so_thi_sinh: dedupeFiltered.length,
        ...counts
      },
      result: 'SUCCESS'
    });

    return {
      applied: counts.hopLe + counts.khongDuDieuKien,
      details: counts,
      snapshot
    };
  },

  /**
   * Rollback: khôi phục trạng thái hồ sơ từ snapshot (do apply lưu).
   * Chỉ rollback được trong cùng phiên (TTL localStorage 5 phút).
   */
  async rollback(
    snapshot: Array<{ thisinh_id: number; old_trang_thai: string; old_ly_do_tu_choi: string | null; new_trang_thai?: string; new_ly_do_tu_choi?: string | null }>,
    session: Session
  ): Promise<{ rolledBack: number; conflicts: number; not_found: number }> {
    requirePerm(session, 'hosso.rasoat');
    const userId = getUserId(session);

    const dbHandle = getDb();
    const updateThisinh = dbHandle.prepare(`
      UPDATE thisinh
      SET trang_thai_ho_so = ?, ly_do_tu_choi = ?, updated_by = ?, updated_at = datetime('now')
      WHERE id = ? AND trang_thai_ho_so = ?
    `);
    const insertHistory = dbHandle.prepare(`
      INSERT INTO hist_chinh_sua
        (thisinh_id, truong, gia_tri_cu, gia_tri_moi, ly_do, nguoi_sua)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const dedupe = new Map<number, typeof snapshot[number]>();
    for (const s of snapshot) dedupe.set(s.thisinh_id, s);
    const uniqueSnapshot = Array.from(dedupe.values());

    let rolledBack = 0;
    let conflicts = 0;
    let notFound = 0;

    dbHandle.transaction(() => {
      for (const s of uniqueSnapshot) {
        const current = raSoatRepository.findTrangThaiHoSo(s.thisinh_id);
        if (!current) {
          notFound++;
          continue;
        }

        if (!s.new_trang_thai) {
          conflicts++;
          continue;
        }

        if (s.new_trang_thai !== current.trang_thai_ho_so) {
          conflicts++;
          continue;
        }

        const result = updateThisinh.run(
          s.old_trang_thai,
          s.old_ly_do_tu_choi,
          userId,
          s.thisinh_id,
          s.new_trang_thai
        );

        if (result.changes === 0) {
          conflicts++;
          continue;
        }

        insertHistory.run(
          s.thisinh_id,
          'trang_thai_ho_so',
          current.trang_thai_ho_so,
          s.old_trang_thai,
          `Rollback từ rà soát tự động (khôi phục về trạng thái trước apply)`,
          userId
        );
        rolledBack++;
      }
    })();

    const result: 'SUCCESS' | 'FAILURE' = rolledBack === 0 ? 'FAILURE' : 'SUCCESS';
    audit({
      action: 'ROLLBACK_RA_SOAT',
      userId,
      username: session.username,
      payload: { so_thi_sinh: rolledBack, conflicts, partial: conflicts > 0 && rolledBack > 0, not_found: notFound },
      result,
      errorMessage: rolledBack === 0 && conflicts === 0 && notFound > 0
        ? `${notFound} hồ sơ không tồn tại trong DB`
        : rolledBack === 0
        ? 'Không có hồ sơ nào được rollback'
        : undefined,
    });

    return { rolledBack, conflicts, not_found: notFound };
  },
};
