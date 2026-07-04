/**
 * donvi module - service
 * File: src/modules/donvi/service.ts
 */
import { donviRepository } from './repository';
import { audit, type AuditAction } from '@/server/audit';
import {
  ConflictError,
  NotFoundError,
  ValidationError
} from '@/server/api';
import type { Session } from '@/server/auth';
import type {
  DonViCreateInput,
  DonViFilter,
  DonViUpdateInput,
  DonViView,
  PaginatedDonVi
} from './types';
import type { DonViTuyenDung } from '@/db/schema';

type DonViAuditAction = 'CREATE_DONVI' | 'UPDATE_DONVI' | 'DELETE_DONVI';

function toAudit(a: DonViAuditAction): AuditAction {
  return a as unknown as AuditAction;
}

function actor(session: Session | null | undefined): {
  userId: number | null;
  username: string | null;
} {
  if (!session) return { userId: null, username: null };
  return {
    userId: Number(session.sub),
    username: session.username ?? null
  };
}

function validatePayload(input: DonViCreateInput, partial = false): void {
  if (!partial || input.ky_tuyendung_id !== undefined) {
    if (!Number.isInteger(input.ky_tuyendung_id) || input.ky_tuyendung_id <= 0) {
      throw new ValidationError('ky_tuyendung_id không hợp lệ');
    }
  }
  if (!partial || input.ma_don_vi !== undefined) {
    if (!input.ma_don_vi || !input.ma_don_vi.trim()) {
      throw new ValidationError('ma_don_vi không được để trống');
    }
    if (input.ma_don_vi.length > 50) {
      throw new ValidationError('ma_don_vi tối đa 50 ký tự');
    }
  }
  if (!partial || input.ten_don_vi !== undefined) {
    if (!input.ten_don_vi || !input.ten_don_vi.trim()) {
      throw new ValidationError('ten_don_vi không được để trống');
    }
  }
  if (!partial || input.cap_hoc !== undefined) {
    const allowed = ['MN', 'TH', 'THCS', 'THPT', 'GDTX', 'DNTTHPT'] as const;
    if (!allowed.includes(input.cap_hoc as typeof allowed[number])) {
      throw new ValidationError('cap_hoc không hợp lệ');
    }
  }
  if (!partial || input.so_chi_tieu !== undefined) {
    const v = input.so_chi_tieu ?? 0;
    if (!Number.isInteger(v) || v < 0) {
      throw new ValidationError('so_chi_tieu phải là số nguyên không âm');
    }
  }
  if (input.so_dien_thoai != null && input.so_dien_thoai !== '') {
    const phone = input.so_dien_thoai.replace(/[\s.-]/g, '');
    if (!/^\+?\d{9,12}$/.test(phone)) {
      throw new ValidationError('so_dien_thoai không hợp lệ');
    }
  }
}

export const donviService = {
  async listDonVi(
    filter: DonViFilter,
    _session?: Session | null
  ): Promise<PaginatedDonVi> {
    return donviRepository.list(filter);
  },

  async getDonVi(id: number, _session?: Session | null): Promise<DonViView> {
    const dv = donviRepository.findById(id);
    if (!dv) throw new NotFoundError(`Đơn vị #${id} không tồn tại`);
    const soThiSinh = donviRepository.countThiSinh(id);
    return { ...dv, soThiSinh, soViTri: 0 };
  },

  async listAllByKy(kyId: number, _session?: Session | null): Promise<DonViTuyenDung[]> {
    if (!Number.isInteger(kyId) || kyId <= 0) {
      throw new ValidationError('kyId không hợp lệ');
    }
    return donviRepository.listAll(kyId);
  },

  async createDonVi(input: DonViCreateInput, session?: Session | null): Promise<DonViView> {
    validatePayload(input, false);

    const existing = donviRepository.findByMa(input.ky_tuyendung_id, input.ma_don_vi.trim());
    if (existing) {
      throw new ConflictError(
        `Mã đơn vị "${input.ma_don_vi}" đã tồn tại trong kỳ này`
      );
    }

    const a = actor(session);
    try {
      const created = donviRepository.create({
        ky_tuyendung_id: input.ky_tuyendung_id,
        ma_don_vi: input.ma_don_vi.trim(),
        ten_don_vi: input.ten_don_vi.trim(),
        cap_hoc: input.cap_hoc,
        dia_chi: input.dia_chi ?? null,
        so_dien_thoai: input.so_dien_thoai ?? null,
        nguoi_lien_he: input.nguoi_lien_he ?? null,
        ghi_chu: input.ghi_chu ?? null,
        so_chi_tieu: input.so_chi_tieu ?? 0
      });
      audit({
        action: toAudit('CREATE_DONVI'),
        userId: a.userId,
        username: a.username,
        resourceType: 'don_vi_tuyen_dung',
        resourceId: created.id,
        payload: { ma_don_vi: created.ma_don_vi, ten_don_vi: created.ten_don_vi }
      });
      return { ...created, soThiSinh: 0, soViTri: 0 };
    } catch (err) {
      audit({
        action: toAudit('CREATE_DONVI'),
        userId: a.userId,
        username: a.username,
        result: 'FAILURE',
        errorMessage: err instanceof Error ? err.message : String(err)
      });
      throw err;
    }
  },

  async updateDonVi(
    id: number,
    input: DonViUpdateInput,
    session?: Session | null
  ): Promise<DonViView> {
    const current = donviRepository.findById(id);
    if (!current) throw new NotFoundError(`Đơn vị #${id} không tồn tại`);

    validatePayload({ ...current, ...input } as DonViCreateInput, true);

    if (input.ma_don_vi !== undefined && input.ma_don_vi.trim() !== current.ma_don_vi) {
      const dup = donviRepository.findByMa(current.ky_tuyendung_id, input.ma_don_vi.trim());
      if (dup && dup.id !== id) {
        throw new ConflictError(
          `Mã đơn vị "${input.ma_don_vi}" đã tồn tại trong kỳ này`
        );
      }
    }

    const a = actor(session);
    const patch: Partial<DonViTuyenDung> = {};
    if (input.ma_don_vi !== undefined) patch.ma_don_vi = input.ma_don_vi.trim();
    if (input.ten_don_vi !== undefined) patch.ten_don_vi = input.ten_don_vi.trim();
    if (input.cap_hoc !== undefined) patch.cap_hoc = input.cap_hoc;
    if (input.dia_chi !== undefined) patch.dia_chi = input.dia_chi ?? null;
    if (input.so_dien_thoai !== undefined) patch.so_dien_thoai = input.so_dien_thoai ?? null;
    if (input.nguoi_lien_he !== undefined) patch.nguoi_lien_he = input.nguoi_lien_he ?? null;
    if (input.ghi_chu !== undefined) patch.ghi_chu = input.ghi_chu ?? null;
    if (input.so_chi_tieu !== undefined) patch.so_chi_tieu = input.so_chi_tieu ?? 0;

    try {
      const updated = donviRepository.update(id, patch);
      audit({
        action: toAudit('UPDATE_DONVI'),
        userId: a.userId,
        username: a.username,
        resourceType: 'don_vi_tuyen_dung',
        resourceId: id,
        payload: { before: current, after: updated }
      });
      const soThiSinh = donviRepository.countThiSinh(id);
      return { ...(updated as DonViTuyenDung), soThiSinh, soViTri: 0 };
    } catch (err) {
      audit({
        action: toAudit('UPDATE_DONVI'),
        userId: a.userId,
        username: a.username,
        resourceId: id,
        result: 'FAILURE',
        errorMessage: err instanceof Error ? err.message : String(err)
      });
      throw err;
    }
  },

  async deleteDonVi(id: number, session?: Session | null): Promise<void> {
    const current = donviRepository.findById(id);
    if (!current) throw new NotFoundError(`Đơn vị #${id} không tồn tại`);

    const soThiSinh = donviRepository.countThiSinh(id);
    if (soThiSinh > 0) {
      throw new ConflictError(
        `Không thể xóa: đơn vị đang có ${soThiSinh} thí sinh`
      );
    }

    const a = actor(session);
    try {
      donviRepository.delete(id);
      audit({
        action: toAudit('DELETE_DONVI'),
        userId: a.userId,
        username: a.username,
        resourceType: 'don_vi_tuyen_dung',
        resourceId: id,
        payload: { ma_don_vi: current.ma_don_vi, ten_don_vi: current.ten_don_vi }
      });
    } catch (err) {
      audit({
        action: toAudit('DELETE_DONVI'),
        userId: a.userId,
        username: a.username,
        resourceId: id,
        result: 'FAILURE',
        errorMessage: err instanceof Error ? err.message : String(err)
      });
      throw err;
    }
  }
};
