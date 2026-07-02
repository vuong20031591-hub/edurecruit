/**
 * mon-chuyen-nganh module - service
 * File: src/modules/mon-chuyen-nganh/service.ts
 */
import type { Session } from '@/server/auth';
import { hasPermission } from '@/server/permissions';
import { audit } from '@/server/audit';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '@/server/api';
import { monChuyenNganhRepository } from './repository';
import type {
  CreateMonChuyenNganhInput,
  MonChuyenNganhGrouped,
  MonChuyenNganhRow,
  UpdateMonChuyenNganhInput
} from './types';

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

export const monChuyenNganhService = {
  listAll(session: Session): MonChuyenNganhRow[] {
    requirePerm(session, 'hosso.cauhinh');
    return monChuyenNganhRepository.listAll();
  },

  listGrouped(session: Session): MonChuyenNganhGrouped[] {
    requirePerm(session, 'hosso.cauhinh');
    const rows = monChuyenNganhRepository.listAll();
    const map = new Map<string, MonChuyenNganhRow[]>();
    for (const r of rows) {
      if (!map.has(r.mon)) map.set(r.mon, []);
      map.get(r.mon)!.push(r);
    }
    return Array.from(map.entries()).map(([mon, items]) => ({ mon, items }));
  },

  listDistinctMon(session: Session): string[] {
    requirePerm(session, 'hosso.cauhinh');
    return monChuyenNganhRepository.listDistinctMon();
  },

  create(input: CreateMonChuyenNganhInput, session: Session): MonChuyenNganhRow {
    requirePerm(session, 'hosso.cauhinh');
    const mon = input.mon?.trim() ?? '';
    const chuyen_ganh = input.chuyen_nganh?.trim() ?? '';
    if (!mon) throw new ValidationError('Thiếu môn');
    if (!chuyen_ganh) throw new ValidationError('Thiếu chuyên ngành');
    if (monChuyenNganhRepository.exists(mon, chuyen_ganh)) {
      throw new ConflictError(`Cặp "${mon}" - "${chuyen_ganh}" đã tồn tại`);
    }
    const id = monChuyenNganhRepository.insert({ mon, chuyen_nganh: chuyen_ganh, ghi_chu: input.ghi_chu ?? null });
    audit({
      action: 'CONFIG_MON_CHUYEN_NGANH',
      userId: getUserId(session),
      username: session.username,
      resourceType: 'mon_chuyen_nganh_map',
      resourceId: id,
      payload: { mon, chuyen_nganh: chuyen_ganh, ghi_chu: input.ghi_chu ?? null }
    });
    return monChuyenNganhRepository.findById(id)!;
  },

  update(id: number, input: UpdateMonChuyenNganhInput, session: Session): MonChuyenNganhRow {
    requirePerm(session, 'hosso.cauhinh');
    const existing = monChuyenNganhRepository.findById(id);
    if (!existing) throw new NotFoundError(`Không tìm thấy bản ghi #${id}`);

    // Nếu đổi (mon, chuyen_nganh) thì check trùng
    if (input.mon !== undefined || input.chuyen_nganh !== undefined) {
      const newMon = (input.mon ?? existing.mon).trim();
      const newCn = (input.chuyen_nganh ?? existing.chuyen_nganh).trim();
      if (newMon !== existing.mon || newCn !== existing.chuyen_nganh) {
        if (monChuyenNganhRepository.exists(newMon, newCn)) {
          throw new ConflictError(`Cặp "${newMon}" - "${newCn}" đã tồn tại`);
        }
      }
    }

    monChuyenNganhRepository.update(id, input);
    audit({
      action: 'CONFIG_MON_CHUYEN_NGANH',
      userId: getUserId(session),
      username: session.username,
      resourceType: 'mon_chuyen_nganh_map',
      resourceId: id,
      payload: { before: { mon: existing.mon, chuyen_nganh: existing.chuyen_nganh }, after: input }
    });
    return monChuyenNganhRepository.findById(id)!;
  },

  delete(id: number, session: Session): void {
    requirePerm(session, 'hosso.cauhinh');
    const existing = monChuyenNganhRepository.findById(id);
    if (!existing) throw new NotFoundError(`Không tìm thấy bản ghi #${id}`);
    monChuyenNganhRepository.delete(id);
    audit({
      action: 'CONFIG_MON_CHUYEN_NGANH',
      userId: getUserId(session),
      username: session.username,
      resourceType: 'mon_chuyen_nganh_map',
      resourceId: id,
      payload: { deleted: { mon: existing.mon, chuyen_nganh: existing.chuyen_nganh } }
    });
  },

  deleteByMon(mon: string, session: Session): { deleted: number } {
    requirePerm(session, 'hosso.cauhinh');
    const deleted = monChuyenNganhRepository.deleteByMon(mon);
    audit({
      action: 'CONFIG_MON_CHUYEN_NGANH',
      userId: getUserId(session),
      username: session.username,
      resourceType: 'mon_chuyen_nganh_map',
      payload: { deleted_mon: mon, count: deleted }
    });
    return { deleted };
  },

  /**
   * Check 1 cặp (mon, chuyen_nganh) có trong whitelist không.
   * Public cho module khác (ra-soat) dùng.
   * Không cần permission — chỉ là query public.
   */
  isAllowed(mon: string, chuyenNganh: string): boolean {
    return monChuyenNganhRepository.exists(mon, chuyenNganh);
  },
};
