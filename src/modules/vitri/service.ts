/**
 * vitri module - service
 * File: src/modules/vitri/service.ts
 */
import type { Session } from '@/server/auth';
import { hasPermission, ForbiddenError } from '@/server/permissions';
import { audit, type AuditAction } from '@/server/audit';
import { ValidationError, NotFoundError, ConflictError } from '@/server/api';
import type { ViTriTuyenDung, DonViTuyenDung, CapHoc, HinhThucThi } from '@/db/schema';
import { vitriRepository } from './repository';
import type {
  ViTriView,
  ViTriFilter,
  PaginatedViTri,
  ViTriCreate,
  ViTriUpdate,
  ViTriDonViInput
} from './types';

const VALID_CAP_HOC: CapHoc[] = ['MN', 'TH', 'THCS', 'THPT', 'GDTX', 'DNTTHPT', 'THCS_THPT', 'TH_THCS'];
const VALID_HINH_THUC: HinhThucThi[] = ['Viet', 'TracNghiem', 'ThucHanh'];
const VALID_TIEU_CHI = ['diem_thi_giang', 'doi_tuong_uu_tien', 'xep_loai_bang', 'ngay_nop_ho_so'];

function validateThuTuUuTien(val: string | null | undefined): void {
  if (val === null || val === undefined) return;
  try {
    const arr = JSON.parse(val);
    if (!Array.isArray(arr)) {
      throw new Error('Cấu hình thứ tự ưu tiên đồng điểm phải là một mảng JSON');
    }
    for (const item of arr) {
      if (typeof item !== 'string' || !VALID_TIEU_CHI.includes(item)) {
        throw new Error(`Tiêu chí đồng điểm không hợp lệ: ${item}`);
      }
    }
  } catch (err) {
    throw new ValidationError(err instanceof Error ? err.message : 'Định dạng JSON cấu hình thứ tự ưu tiên đồng điểm không hợp lệ');
  }
}

function requirePerm(session: Session, perm: Parameters<typeof hasPermission>[1]): void {
  if (!hasPermission(session.quyen, perm)) {
    throw new ForbiddenError(`Missing permission: ${perm}`);
  }
}

function userId(session: Session): number {
  return Number(session.sub);
}

function trim(s: string | null | undefined): string {
  return (s ?? '').trim();
}

function logAudit(
  session: Session,
  action: string,
  resourceId: number | undefined,
  payload?: unknown,
  result: 'SUCCESS' | 'FAILURE' = 'SUCCESS',
  errorMessage?: string
): void {
  audit({
    action: action as AuditAction,
    userId: userId(session),
    username: session.username,
    resourceType: 'vitri_tuyendung',
    resourceId,
    payload,
    result,
    errorMessage
  });
}

export const vitriService = {
  async listViTri(filter: ViTriFilter, session: Session): Promise<PaginatedViTri> {
    requirePerm(session, 'vitri.view');
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.max(1, Math.min(200, filter.pageSize ?? 20));
    const data = vitriRepository.list({ ...filter, page, pageSize });
    const total = vitriRepository.count(filter);
    return { data, total, page, pageSize };
  },

  async getViTri(id: number, session: Session): Promise<ViTriView> {
    requirePerm(session, 'vitri.view');
    if (!vitriRepository.findById(id)) {
      throw new NotFoundError(`Vị trí ${id} không tồn tại`);
    }
    const view = vitriRepository
      .list({ page: 1, pageSize: 1 })
      .find((r) => r.id === id);
    if (!view) {
      throw new NotFoundError(`Vị trí ${id} không tồn tại`);
    }
    return view;
  },

  async listAllByKy(kyId: number, session: Session): Promise<ViTriTuyenDung[]> {
    requirePerm(session, 'vitri.view');
    if (!vitriRepository.kyExists(kyId)) {
      throw new NotFoundError(`Kỳ tuyển dụng ${kyId} không tồn tại`);
    }
    return vitriRepository.listAll(kyId);
  },

  async createViTri(data: ViTriCreate, session: Session): Promise<ViTriTuyenDung> {
    requirePerm(session, 'vitri.create');

    const maViTri = trim(data.ma_vi_tri);
    const mon = trim(data.mon);
    if (!maViTri) throw new ValidationError('Mã vị trí không được để trống');
    if (!mon) throw new ValidationError('Môn không được để trống');
    if (!VALID_CAP_HOC.includes(data.cap_hoc)) {
      throw new ValidationError(`Cấp học không hợp lệ: ${data.cap_hoc}`);
    }
    if (!VALID_HINH_THUC.includes(data.hinh_thuc_thi)) {
      throw new ValidationError(`Hình thức thi không hợp lệ: ${data.hinh_thuc_thi}`);
    }
    if (!Number.isFinite(data.so_luong) || data.so_luong <= 0) {
      throw new ValidationError('Số lượng phải > 0');
    }
    if (data.diem_chuan !== null && data.diem_chuan !== undefined) {
      if (data.diem_chuan < 0 || data.diem_chuan > 10) {
        throw new ValidationError('Điểm chuẩn phải trong khoảng [0, 10]');
      }
    }
    if (!vitriRepository.kyExists(data.ky_tuyendung_id)) {
      throw new ValidationError(`Kỳ tuyển dụng ${data.ky_tuyendung_id} không tồn tại`);
    }
    if (vitriRepository.findByMa(data.ky_tuyendung_id, maViTri)) {
      throw new ConflictError(`Mã vị trí "${maViTri}" đã tồn tại trong kỳ này`);
    }

    validateThuTuUuTien(data.thu_tu_uu_tien_dong_diem);

    try {
      const created = vitriRepository.create({
        ...data,
        ma_vi_tri: maViTri,
        mon
      });
      logAudit(session, 'CREATE_VITRI', created.id, { ma_vi_tri: created.ma_vi_tri, ky_id: created.ky_tuyendung_id });
      return created;
    } catch (err) {
      logAudit(session, 'CREATE_VITRI', undefined, { data }, 'FAILURE',
        err instanceof Error ? err.message : String(err));
      throw err;
    }
  },

  async updateViTri(id: number, data: ViTriUpdate, session: Session): Promise<ViTriTuyenDung> {
    requirePerm(session, 'vitri.update');
    const current = vitriRepository.findById(id);
    if (!current) throw new NotFoundError(`Vị trí ${id} không tồn tại`);

    if (data.ma_vi_tri !== undefined) {
      const ma = trim(data.ma_vi_tri);
      if (!ma) throw new ValidationError('Mã vị trí không được để trống');
      if (ma !== current.ma_vi_tri) {
        const dup = vitriRepository.findByMa(current.ky_tuyendung_id, ma);
        if (dup && dup.id !== id) {
          throw new ConflictError(`Mã vị trí "${ma}" đã tồn tại trong kỳ này`);
        }
        data.ma_vi_tri = ma;
      }
    }
    if (data.mon !== undefined) {
      const m = trim(data.mon);
      if (!m) throw new ValidationError('Môn không được để trống');
      data.mon = m;
    }
    if (data.cap_hoc !== undefined && !VALID_CAP_HOC.includes(data.cap_hoc)) {
      throw new ValidationError(`Cấp học không hợp lệ: ${data.cap_hoc}`);
    }
    if (data.hinh_thuc_thi !== undefined && !VALID_HINH_THUC.includes(data.hinh_thuc_thi)) {
      throw new ValidationError(`Hình thức thi không hợp lệ: ${data.hinh_thuc_thi}`);
    }
    if (data.so_luong !== undefined) {
      if (!Number.isFinite(data.so_luong) || data.so_luong <= 0) {
        throw new ValidationError('Số lượng phải > 0');
      }
      const soThiSinh = vitriRepository.countThiSinh(id);
      if (data.so_luong < soThiSinh) {
        throw new ConflictError(
          `Không thể giảm số lượng xuống ${data.so_luong}: đã có ${soThiSinh} thí sinh đăng ký`
        );
      }
    }
    if (data.diem_chuan !== undefined && data.diem_chuan !== null) {
      if (data.diem_chuan < 0 || data.diem_chuan > 10) {
        throw new ValidationError('Điểm chuẩn phải trong khoảng [0, 10]');
      }
    }
    if (data.thu_tu_uu_tien_dong_diem !== undefined) {
      validateThuTuUuTien(data.thu_tu_uu_tien_dong_diem);
    }

    try {
      const updated = vitriRepository.update(id, data);
      logAudit(session, 'UPDATE_VITRI', id, { before: current, after: updated });
      return updated;
    } catch (err) {
      logAudit(session, 'UPDATE_VITRI', id, { data }, 'FAILURE',
        err instanceof Error ? err.message : String(err));
      throw err;
    }
  },

  async deleteViTri(id: number, session: Session): Promise<void> {
    requirePerm(session, 'vitri.delete');
    const current = vitriRepository.findById(id);
    if (!current) throw new NotFoundError(`Vị trí ${id} không tồn tại`);

    const soThiSinh = vitriRepository.countThiSinh(id);
    if (soThiSinh > 0) {
      throw new ConflictError(
        `Không thể xóa vị trí: đã có ${soThiSinh} thí sinh đăng ký`
      );
    }

    try {
      vitriRepository.delete(id);
      logAudit(session, 'DELETE_VITRI', id, { ma_vi_tri: current.ma_vi_tri, ky_id: current.ky_tuyendung_id });
    } catch (err) {
      logAudit(session, 'DELETE_VITRI', id, undefined, 'FAILURE',
        err instanceof Error ? err.message : String(err));
      throw err;
    }
  },

  async mapDonVi(
    vitriId: number,
    items: ViTriDonViInput[],
    session: Session
  ): Promise<{ inserted: number }> {
    requirePerm(session, 'vitri.update');
    const vitri = vitriRepository.findById(vitriId);
    if (!vitri) throw new NotFoundError(`Vị trí ${vitriId} không tồn tại`);

    const cleaned: { don_vi_id: number; so_luong_phan_bo: number }[] = [];
    const seen = new Set<number>();

    for (const it of items) {
      if (!Number.isInteger(it.don_vi_id) || it.don_vi_id <= 0) {
        throw new ValidationError(`don_vi_id không hợp lệ: ${it.don_vi_id}`);
      }
      if (!Number.isInteger(it.so_luong_phan_bo) || it.so_luong_phan_bo < 0) {
        throw new ValidationError(`so_luong_phan_bo phải >= 0 (don_vi_id=${it.don_vi_id})`);
      }
      if (seen.has(it.don_vi_id)) {
        throw new ValidationError(`Đơn vị ${it.don_vi_id} bị trùng trong danh sách`);
      }
      if (!vitriRepository.donViExistsInKy(it.don_vi_id, vitri.ky_tuyendung_id)) {
        throw new ValidationError(
          `Đơn vị ${it.don_vi_id} không tồn tại trong kỳ ${vitri.ky_tuyendung_id}`
        );
      }
      seen.add(it.don_vi_id);
      cleaned.push({ don_vi_id: it.don_vi_id, so_luong_phan_bo: it.so_luong_phan_bo });
    }

    const tongPhanBo = cleaned.reduce((sum, x) => sum + x.so_luong_phan_bo, 0);
    if (tongPhanBo > vitri.so_luong) {
      throw new ValidationError(
        `Tổng chỉ tiêu phân bổ (${tongPhanBo}) vượt quá số lượng vị trí (${vitri.so_luong})`
      );
    }

    const before = vitriRepository.getMappingByViTri(vitriId);
    try {
      vitriRepository.replaceMapping(vitriId, cleaned);
      logAudit(session, 'MAP_DONVI_VITRI', vitriId, {
        before: before.map((m) => ({ don_vi_id: m.don_vi_tuyen_dung_id, so_luong_phan_bo: m.so_luong_phan_bo })),
        after: cleaned
      });
      return { inserted: cleaned.length };
    } catch (err) {
      logAudit(session, 'MAP_DONVI_VITRI', vitriId, { items }, 'FAILURE',
        err instanceof Error ? err.message : String(err));
      throw err;
    }
  },

  async getDonViByViTri(vitriId: number, session: Session): Promise<DonViTuyenDung[]> {
    requirePerm(session, 'vitri.view');
    if (!vitriRepository.findById(vitriId)) {
      throw new NotFoundError(`Vị trí ${vitriId} không tồn tại`);
    }
    return vitriRepository.getDonViByViTri(vitriId);
  }
};
