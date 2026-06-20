/**
 * hosso module - service
 * File: src/modules/hosso/service.ts
 */
import type { Session } from '@/server/auth';
import { hasPermission } from '@/server/permissions';
import { audit, type AuditAction } from '@/server/audit';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '@/server/api';
import type { ThiSinh, ThiSinhUpdate } from '@/db/schema';
import { TrangThaiHoSo } from '@/shared/constants/enums';
import { thisinhCreateSchema } from '@/shared/lib/validation';
import { buildViTriLabel, matchViTriByLabel } from '@/shared/lib/format';
import { hossoRepository } from './repository';
import type {
  ImportExcelResult,
  PaginatedThiSinh,
  PreviewImportResult,
  ThiSinhFilter,
  ThiSinhStats,
  ThiSinhView
} from './types';

// ============================================================================
// Helpers
// ============================================================================

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

function buildHoTen(data: { ho?: string; ten?: string; ho_ten?: string }): string {
  if (data.ho_ten && data.ho_ten.trim()) return data.ho_ten.trim();
  const ho = (data.ho ?? '').trim();
  const ten = (data.ten ?? '').trim();
  return `${ho} ${ten}`.trim();
}

function parseDateSafe(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function calcTuoi(ngaySinh: string): number | null {
  const d = parseDateSafe(ngaySinh);
  if (!d) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

const CCCD_REGEX = /^\d{9}$|^\d{12}$/;
const PHONE_REGEX = /^(0|\+84)\d{9,10}$/;

// Map gioi_tinh từ enums (có dấu: 'Nữ', 'Khác') sang DB schema (ASCII: 'Nu', 'Khac')
function normalizeGioiTinh(value: string): 'Nam' | 'Nu' | 'Khac' {
  if (value === 'Nam') return 'Nam';
  if (value === 'Nu' || value === 'Nữ') return 'Nu';
  if (value === 'Khac' || value === 'Khác') return 'Khac';
  return 'Nam';
}

// Loại bỏ undefined / chuỗi rỗng để match với ThiSinhCreate (nullable)
function normalizeOptionalString(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  return v as string;
}

function normalizeOptionalNumber(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ============================================================================
// State machine (Bước 2 - Rà soát hồ sơ)
// ============================================================================

const VALID_TRANSITIONS: Record<ThiSinh['trang_thai_ho_so'], ThiSinh['trang_thai_ho_so'][]> = {
  ChoRaSoat: [TrangThaiHoSo.HopLe, TrangThaiHoSo.CanBoSung, TrangThaiHoSo.KhongDuDieuKien],
  CanBoSung: [
    TrangThaiHoSo.HopLe,
    TrangThaiHoSo.KhongDuDieuKien,
    TrangThaiHoSo.DaChinhSua,
    TrangThaiHoSo.ChoRaSoat
  ],
  DaChinhSua: [
    TrangThaiHoSo.ChoRaSoat,
    TrangThaiHoSo.HopLe,
    TrangThaiHoSo.CanBoSung,
    TrangThaiHoSo.KhongDuDieuKien
  ],
  HopLe: [TrangThaiHoSo.CanBoSung, TrangThaiHoSo.DaChinhSua, TrangThaiHoSo.KhongDuDieuKien],
  KhongDuDieuKien: []
};

function isValidTransition(from: ThiSinh['trang_thai_ho_so'], to: ThiSinh['trang_thai_ho_so']): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ============================================================================
// Service
// ============================================================================

export const hossoService = {
  async listThiSinh(filter: ThiSinhFilter, session: Session): Promise<PaginatedThiSinh> {
    requirePerm(session, 'hosso.view');
    return hossoRepository.list(filter);
  },

  async getThiSinh(id: number, session: Session): Promise<ThiSinhView & { nguoiThan: unknown[]; vanBang: unknown[]; qtc: unknown[] }> {
    requirePerm(session, 'hosso.view');
    const view = hossoRepository.findByIdWithJoins(id);
    if (!view) throw new NotFoundError(`Không tìm thấy thí sinh #${id}`);
    return {
      ...view,
      nguoiThan: hossoRepository.listNguoiThan(id),
      vanBang: hossoRepository.listVanBang(id),
      qtc: hossoRepository.listQtc(id)
    };
  },

  async createThiSinh(
    data: Record<string, unknown>,
    session: Session
  ): Promise<ThiSinh> {
    requirePerm(session, 'hosso.create');
    const userId = getUserId(session);

    const parsed = thisinhCreateSchema.safeParse(data);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      throw new ValidationError(first ? first.message : 'Dữ liệu không hợp lệ');
    }
    const valid = parsed.data;

    // Custom validation: CCCD format
    if (valid.cccd && !CCCD_REGEX.test(valid.cccd)) {
      throw new ValidationError('CCCD phải là 9 hoặc 12 chữ số');
    }

    // Custom validation: phone format
    if (valid.dien_thoai && !PHONE_REGEX.test(valid.dien_thoai)) {
      throw new ValidationError('Số điện thoại không hợp lệ');
    }

    // Custom validation: tuổi 18-65
    const tuoi = calcTuoi(valid.ngay_sinh);
    if (tuoi === null) {
      throw new ValidationError('Ngày sinh không hợp lệ');
    }
    if (tuoi < 18 || tuoi > 65) {
      throw new ValidationError('Tuổi thí sinh phải từ 18 đến 65');
    }

    // Check FK exist
    if (!hossoRepository.vitriExists(valid.vi_tri_dang_ky_id, valid.ky_tuyendung_id)) {
      throw new ValidationError('Vị trí tuyển dụng không tồn tại trong kỳ này');
    }
    if (!hossoRepository.donviExists(valid.don_vi_du_tuyen_id, valid.ky_tuyendung_id)) {
      throw new ValidationError('Đơn vị tuyển dụng không tồn tại trong kỳ này');
    }

    // Check duplicate CCCD
    if (valid.cccd) {
      const dup = hossoRepository.findByCccd(valid.cccd);
      if (dup) {
        throw new ConflictError(`CCCD ${valid.cccd} đã tồn tại (thí sinh #${dup.id})`);
      }
    }

    const created = hossoRepository.create({
      ...(valid as unknown as Record<string, unknown>),
      gioi_tinh: normalizeGioiTinh(valid.gioi_tinh),
      cccd: normalizeOptionalString(valid.cccd),
      dien_thoai: normalizeOptionalString(valid.dien_thoai),
      email: normalizeOptionalString(valid.email),
      nam_tot_nghiep: normalizeOptionalNumber(valid.nam_tot_nghiep),
      ho_ten: buildHoTen(valid),
      trang_thai_ho_so: TrangThaiHoSo.ChoRaSoat,
      co_chung_chi_nvsp: valid.co_chung_chi_nvsp ?? 0,
      sbd: null,
      is_profile_locked: 0,
      locked_at: null,
      locked_by: null,
      ly_do_tu_choi: null,
      created_by: userId
    });

    const meta = baseMeta(session, 'thisinh', created.id);
    audit({ ...meta, action: 'CREATE_THISINH', payload: { thisinh: created } });

    return created;
  },

  async updateThiSinh(
    id: number,
    data: ThiSinhUpdate,
    session: Session
  ): Promise<ThiSinh> {
    requirePerm(session, 'hosso.update');
    const userId = getUserId(session);

    const before = hossoRepository.findById(id);
    if (!before) throw new NotFoundError(`Không tìm thấy thí sinh #${id}`);

    const updateData: ThiSinhUpdate = { ...data, updated_by: userId };

    // Validate CCCD nếu có thay đổi
    if (data.cccd !== undefined && data.cccd !== null && data.cccd !== before.cccd) {
      if (!CCCD_REGEX.test(data.cccd)) {
        throw new ValidationError('CCCD phải là 9 hoặc 12 chữ số');
      }

      // An toàn: nếu CCCD đã có lịch sử chỉnh sửa thì không cho sửa nữa
      if (hossoRepository.hasCccdHistory(id, 'cccd')) {
        throw new ValidationError('CCCD đã có lịch sử chỉnh sửa, không thể thay đổi');
      }

      const dup = hossoRepository.findByCccd(data.cccd, id);
      if (dup) {
        throw new ConflictError(`CCCD ${data.cccd} đã tồn tại (thí sinh #${dup.id})`);
      }
    }

    // Validate phone
    if (data.dien_thoai !== undefined && data.dien_thoai !== null) {
      if (!PHONE_REGEX.test(data.dien_thoai)) {
        throw new ValidationError('Số điện thoại không hợp lệ');
      }
    }

    // Validate tuổi
    if (data.ngay_sinh && data.ngay_sinh !== before.ngay_sinh) {
      const tuoi = calcTuoi(data.ngay_sinh);
      if (tuoi === null) throw new ValidationError('Ngày sinh không hợp lệ');
      if (tuoi < 18 || tuoi > 65) {
        throw new ValidationError('Tuổi thí sinh phải từ 18 đến 65');
      }
    }

    // Validate FK khi đổi
    if (data.vi_tri_dang_ky_id !== undefined && data.vi_tri_dang_ky_id !== before.vi_tri_dang_ky_id) {
      if (!hossoRepository.vitriExists(data.vi_tri_dang_ky_id, before.ky_tuyendung_id)) {
        throw new ValidationError('Vị trí tuyển dụng không tồn tại trong kỳ này');
      }
    }
    if (data.don_vi_du_tuyen_id !== undefined && data.don_vi_du_tuyen_id !== before.don_vi_du_tuyen_id) {
      if (!hossoRepository.donviExists(data.don_vi_du_tuyen_id, before.ky_tuyendung_id)) {
        throw new ValidationError('Đơn vị tuyển dụng không tồn tại trong kỳ này');
      }
    }

    // Recompute ho_ten nếu đổi ho/ten
    if ((data.ho !== undefined || data.ten !== undefined) && data.ho_ten === undefined) {
      updateData.ho_ten = buildHoTen({
        ho: data.ho ?? before.ho,
        ten: data.ten ?? before.ten
      });
    }

    // Không cho sửa nếu hồ sơ đã khóa
    if (before.is_profile_locked === 1) {
      throw new ConflictError('Hồ sơ đã khóa, không thể chỉnh sửa');
    }

    const after = hossoRepository.update(id, updateData);

    // Ghi lịch sử chỉnh sửa cho các trường thay đổi
    const trackedFields: Array<keyof ThiSinh> = [
      'ho',
      'ten',
      'ho_ten',
      'ngay_sinh',
      'gioi_tinh',
      'cccd',
      'dien_thoai',
      'email',
      'vi_tri_dang_ky_id',
      'don_vi_du_tuyen_id'
    ];
    for (const field of trackedFields) {
      const beforeVal = (before as unknown as Record<string, unknown>)[field];
      const afterVal = (after as unknown as Record<string, unknown>)[field];
      if (beforeVal !== afterVal) {
        hossoRepository.insertHistory({
          thisinh_id: id,
          truong: String(field),
          gia_tri_cu: beforeVal == null ? null : String(beforeVal),
          gia_tri_moi: afterVal == null ? null : String(afterVal),
          ly_do: null,
          nguoi_sua: userId
        });
      }
    }

    const meta = baseMeta(session, 'thisinh', id);
    audit({
      ...meta,
      action: 'UPDATE_THISINH',
      payload: { before, after }
    });

    return after;
  },

  async deleteThiSinh(id: number, session: Session): Promise<void> {
    requirePerm(session, 'hosso.delete');
    const before = hossoRepository.findById(id);
    if (!before) throw new NotFoundError(`Không tìm thấy thí sinh #${id}`);

    hossoRepository.delete(id);

    const meta = baseMeta(session, 'thisinh', id);
    audit({ ...meta, action: 'DELETE_THISINH', payload: { thisinh: before } });
  },

  async rasoatThiSinh(
    id: number,
    trangThaiMoi: ThiSinh['trang_thai_ho_so'],
    lyDo: string | null,
    session: Session
  ): Promise<ThiSinh> {
    requirePerm(session, 'hosso.rasoat');
    const userId = getUserId(session);

    const before = hossoRepository.findById(id);
    if (!before) throw new NotFoundError(`Không tìm thấy thí sinh #${id}`);

    // Không cho rà soát nếu hồ sơ đã khóa (trừ khi đang ở trạng thái cuối)
    if (before.is_profile_locked === 1) {
      throw new ConflictError('Hồ sơ đã khóa, không thể rà soát');
    }

    if (!isValidTransition(before.trang_thai_ho_so, trangThaiMoi)) {
      throw new ValidationError(
        `Chuyển trạng thái không hợp lệ: ${before.trang_thai_ho_so} → ${trangThaiMoi}`
      );
    }

    // Nếu chuyển sang KhongDuDieuKien mà chưa có lý do → bắt buộc nhập
    if (trangThaiMoi === TrangThaiHoSo.KhongDuDieuKien && !lyDo) {
      throw new ValidationError('Cần nhập lý do khi từ chối hồ sơ');
    }

    const after = hossoRepository.update(id, {
      trang_thai_ho_so: trangThaiMoi,
      ly_do_tu_choi: trangThaiMoi === TrangThaiHoSo.KhongDuDieuKien ? lyDo : null,
      updated_by: userId
    });

    // Ghi lịch sử chỉnh sửa
    hossoRepository.insertHistory({
      thisinh_id: id,
      truong: 'trang_thai_ho_so',
      gia_tri_cu: before.trang_thai_ho_so,
      gia_tri_moi: trangThaiMoi,
      ly_do: lyDo ?? null,
      nguoi_sua: userId
    });

    const meta = baseMeta(session, 'thisinh', id);
    audit({
      ...meta,
      action: 'RA_SOAT_HOSO',
      payload: {
        trang_thai_cu: before.trang_thai_ho_so,
        trang_thai_moi: trangThaiMoi,
        ly_do: lyDo
      }
    });

    return after;
  },

  async getStats(kyId: number, session: Session): Promise<ThiSinhStats> {
    requirePerm(session, 'hosso.view');
    const byTrangThai = hossoRepository.countByStatus(kyId);
    const tongSoHoSo = Object.values(byTrangThai).reduce((sum, n) => sum + n, 0);
    return { tongSoHoSo, byTrangThai };
  },

  async lockAllHopLe(kyId: number, session: Session): Promise<{ locked: number }> {
    requirePerm(session, 'hosso.khoa');
    const userId = getUserId(session);

    // Pre-check: tất cả hồ sơ trong kỳ phải khác ChoRaSoat
    const byStatus = hossoRepository.countByStatus(kyId);
    const choRaSoat = byStatus.ChoRaSoat ?? 0;
    if (choRaSoat > 0) {
      throw new ValidationError(`Vẫn còn ${choRaSoat} hồ sơ chờ rà soát`);
    }

    const locked = hossoRepository.lockAllHopLe(kyId, userId);

    audit({
      userId,
      username: session.username,
      action: 'KHOA_HO_SO',
      resourceType: 'ky_tuyendung',
      resourceId: kyId,
      payload: { locked, by_status: byStatus },
      result: 'SUCCESS'
    });

    return { locked };
  },

  async importFromExcel(
    rows: Array<Record<string, unknown>>,
    format: 'google-form' | 'ds-du-thi',
    kyId: number,
    session: Session
  ): Promise<ImportExcelResult> {
    requirePerm(session, 'hosso.create');
    const userId = getUserId(session);

    // Preload vitri + donvi để lookup theo tên (file mẫu không có ID)
    const vitriList = hossoRepository.listVitriByKy(kyId);
    const donViList = hossoRepository.listDonViByKy(kyId);

    const errors: ImportExcelResult['errors'] = [];
    let success = 0;

    rows.forEach((rawRow, index) => {
      const rowNum = index + 1;
      try {
        const validated = validateImportRow(rawRow, rowNum, kyId, vitriList, donViList, format);
        if (validated.status === 'error') {
          errors.push({ row: rowNum, message: validated.message ?? 'Lỗi không xác định' });
          return;
        }
        const { valid, viTri2Id, donVi2Id } = validated;

        const rawR = rawRow as Record<string, unknown>;
        const created = hossoRepository.create({
          ...(valid as unknown as Record<string, unknown>),
          gioi_tinh: normalizeGioiTinh(valid.gioi_tinh),
          cccd: normalizeOptionalString(valid.cccd),
          dien_thoai: normalizeOptionalString(valid.dien_thoai),
          email: normalizeOptionalString(valid.email),
          nam_tot_nghiep: normalizeOptionalNumber(valid.nam_tot_nghiep),
          ho_ten: buildHoTen(valid),
          trang_thai_ho_so: TrangThaiHoSo.ChoRaSoat,
          co_chung_chi_nvsp: valid.co_chung_chi_nvsp ?? 0,
          sbd: null,
          is_profile_locked: 0,
          locked_at: null,
          locked_by: null,
          ly_do_tu_choi: null,
          created_by: userId,
          // Field mới từ migration 0007
          ngay_nop_phieu: (rawR.ngay_nop_phieu as string | null) ?? null,
          ton_giao: (rawR.ton_giao as string | null) ?? null,
          suc_khoe: (rawR.suc_khoe as string | null) ?? null,
          chieu_cao: (rawR.chieu_cao as string | null) ?? null,
          can_nang: (rawR.can_nang as string | null) ?? null,
          cho_o_hien_nay: (rawR.cho_o_hien_nay as string | null) ?? null,
          trinh_do_van_hoa: (rawR.trinh_do_van_hoa as string | null) ?? null,
          so_hieu_van_bang: (rawR.so_hieu_van_bang as string | null) ?? null,
          hinh_thuc_dao_tao: (rawR.hinh_thuc_dao_tao as string | null) ?? null,
          nganh_dao_tao: (rawR.nganh_dao_tao as string | null) ?? null,
          ngay_cap_van_bang: (rawR.ngay_cap_van_bang as string | null) ?? null,
          ngoai_ngu: (rawR.ngoai_ngu as string | null) ?? null,
          ngoai_ngu_khac: (rawR.ngoai_ngu_khac as string | null) ?? null,
          mien_thi_nn: (rawR.mien_thi_nn as string | null) ?? null,
          cam_doan_thong_tin: (rawR.cam_doan_thong_tin as string | null) ?? null,
          co_dang_ky_nv2: (rawR.co_dang_ky_nv2 as number) ?? 0,
          vi_tri_dang_ky_id_2: viTri2Id,
          don_vi_du_tuyen_id_2: donVi2Id
        });
        success++;

        // Insert bảng phụ (chỉ với format Google Form — ds-du-thi không có dữ liệu)
        if (format === 'google-form') {
          insertChildTables(created.id, rawR);
        }
        // gắn id vào row để caller debug
        rawR.__imported_id = created.id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
        errors.push({ row: rowNum, message: msg });
      }
    });

    const meta = baseMeta(session, 'thisinh', undefined);
    audit({
      ...meta,
      action: 'IMPORT_EXCEL' as AuditAction,
      payload: {
        ky_id: kyId,
        total_rows: rows.length,
        success_rows: success,
        error_rows: errors.length
      }
    });

    return { success, errors };
  },

  /**
   * Dry-run: parse + validate, KHÔNG insert. Trả về preview rows để UI show.
   * Status:
   *  - 'ok'      : sẽ insert thành công
   *  - 'warning' : sẽ insert nhưng có cảnh báo (VD: CCCD null, đơn vị không khớp)
   *  - 'error'   : KHÔNG insert được
   */
  async previewFromExcel(
    rows: Array<Record<string, unknown>>,
    format: 'google-form' | 'ds-du-thi',
    kyId: number,
    _session: Session
  ): Promise<PreviewImportResult> {
    requirePerm(_session, 'hosso.create');
    const vitriList = hossoRepository.listVitriByKy(kyId);
    const donViList = hossoRepository.listDonViByKy(kyId);

    const previewRows: PreviewImportResult['rows'] = [];
    const summary = { ok: 0, warning: 0, error: 0 };

    rows.forEach((rawRow, index) => {
      const rowNum = index + 1;
      const validated = validateImportRow(rawRow, rowNum, kyId, vitriList, donViList, format);

      // Compute warnings bổ sung (không chặn import)
      const warnings: string[] = [];
      const rawR = rawRow as Record<string, unknown>;
      // Warning: CCCD trống → "cần bổ sung trước khi khóa hồ sơ"
      if (!rawR.cccd) warnings.push('CCCD trống — sẽ cần bổ sung trước khi khóa hồ sơ');
      // Warning: CCCD có 10-11 số → nghi ngờ mất số 0 đầu (Excel format Number strip 0)
      const cccdVal = rawR.cccd as string | null;
      if (cccdVal && (cccdVal.length === 10 || cccdVal.length === 11)) {
        warnings.push(`CCCD có ${cccdVal.length} số — có thể bị mất số 0 đầu; format cột CCCD thành Text trong Excel rồi nhập lại`);
      }
      // Warning: đơn vị dự tuyển không match DB
      const tenDonVi = rawR.ten_don_vi as string | null;
      if (tenDonVi && !donViList.some((d) => d.ten_don_vi.toLowerCase() === tenDonVi.toLowerCase())) {
        warnings.push(`Đơn vị "${tenDonVi}" không khớp DB — sẽ lưu don_vi_du_tuyen_id = NULL`);
      }
      // Warning: vị trí NV2 không match
      const viTri2Ten = rawR.vi_tri_ten_2 as string | null;
      if (viTri2Ten && !matchViTriByLabel(viTri2Ten, vitriList)) {
        warnings.push(`Vị trí NV2 "${viTri2Ten}" không khớp DB`);
      }

      // status
      let status: 'ok' | 'warning' | 'error' = validated.status;
      let message = validated.message;
      if (status === 'ok' && warnings.length > 0) {
        status = 'warning';
        message = warnings.join(' · ');
      } else if (status === 'error') {
        // errors chỉ lấy message
      }
      summary[status]++;

      // Đếm số bảng phụ (chỉ fill cho Google Form)
      let soNguoiThan = 0, soVanBang = 0, soQtc = 0;
      if (format === 'google-form') {
        for (const tu of [1, 2, 3] as const) {
          if (rawR[`nt_${tu}_moi_quan_he`] || rawR[`nt_${tu}_ho_ten`]) soNguoiThan++;
        }
        if (rawR.vb_2_ten_truong || rawR.vb_2_chuyen_nganh) soVanBang = 1;
        for (const tu of [1, 2] as const) {
          if (rawR[`qtc_${tu}_tu_ngay`] || rawR[`qtc_${tu}_co_quan`]) soQtc++;
        }
      }

      previewRows.push({
        row: rowNum,
        ho_ten: (rawR.ho_ten as string | null) ?? null,
        ho: (rawR.ho as string | null) ?? null,
        ten: (rawR.ten as string | null) ?? null,
        ngay_sinh: (rawR.ngay_sinh as string | null) ?? null,
        gioi_tinh: (rawR.gioi_tinh as string | null) ?? null,
        cccd: (rawR.cccd as string | null) ?? null,
        dien_thoai: (rawR.dien_thoai as string | null) ?? null,
        email: (rawR.email as string | null) ?? null,
        vi_tri_ten: (rawR.vi_tri_ten as string | null) ?? null,
        ten_don_vi: tenDonVi ?? null,
        co_dang_ky_nv2: (rawR.co_dang_ky_nv2 as number) ?? 0,
        so_nguoi_than: soNguoiThan,
        so_van_bang: soVanBang,
        so_qtc: soQtc,
        raw: rawR,
        status,
        message
      });
    });

    return {
      format,
      totalRows: rows.length,
      summary,
      rows: previewRows
    };
  }
};

// ============================================================================
// Internal helpers
// ============================================================================

function baseMeta(session: Session, resourceType: string, resourceId?: number) {
  return {
    userId: parseInt(session.sub, 10) || undefined,
    username: session.username,
    resourceType,
    resourceId
  };
}

function normalizeImportRow(
  raw: Record<string, unknown>,
  kyId: number,
  vitriList: Array<{ id: number; mon: string; cap_hoc: string; ma_vi_tri: string; loai_vi_tri: string }>,
  donViList: Array<{ id: number; ten_don_vi: string; ma_don_vi: string }>,
  _format: 'google-form' | 'ds-du-thi' = 'ds-du-thi'
): Record<string, unknown> {
  const get = (k: string): unknown => {
    const v = raw[k] ?? raw[k.toLowerCase()] ?? raw[k.toUpperCase()];
    if (v === undefined || v === null) return undefined;
    if (typeof v === 'string' && v.trim() === '') return null;
    return v;
  };

  const ho = (get('ho') as string | null) ?? '';
  const ten = (get('ten') as string | null) ?? '';
  const hoTen =
    (get('ho_ten') as string | null) ?? ((ho && ten) ? `${ho} ${ten}`.trim() : null);

  const ngaySinhRaw = get('ngay_sinh');
  let ngaySinh: string | null = null;
  if (typeof ngaySinhRaw === 'string') {
    ngaySinh = ngaySinhRaw;
  } else if (ngaySinhRaw instanceof Date) {
    ngaySinh = ngaySinhRaw.toISOString().slice(0, 10);
  }

  const gioiTinhRaw = (get('gioi_tinh') as string | null)?.toLowerCase().trim();
  const gioiTinh: 'Nam' | 'Nữ' | 'Khác' | null =
    gioiTinhRaw === 'nữ' || gioiTinhRaw === 'nu' || gioiTinhRaw === 'female'
      ? 'Nữ'
      : gioiTinhRaw === 'nam' || gioiTinhRaw === 'male'
        ? 'Nam'
        : gioiTinhRaw === 'khác' || gioiTinhRaw === 'khac' || gioiTinhRaw === 'other'
          ? 'Khác'
          : null;

  const nvspRaw = get('co_chung_chi_nvsp') ?? get('chung_chi_nvsp');
  const coChungChiNvsp =
    nvspRaw === true ||
    nvspRaw === 1 ||
    (typeof nvspRaw === 'string' && /nvsp/i.test(nvspRaw))
      ? 1
      : 0;

  // Lookup vi_tri_dang_ky_id: ưu tiên ID trực tiếp, fallback lookup theo tên đầy đủ
  let viTriId = numberOrNull(get('vi_tri_dang_ky_id') ?? get('vi_tri_id'));
  if (viTriId === null) {
    const viTriTen = (get('vi_tri_ten') as string | null)?.trim() ?? null;
    if (viTriTen) {
      viTriId = matchViTriByLabel(viTriTen, vitriList);
    }
  }

  // Lookup don_vi_du_tuyen_id: ưu tiên ID trực tiếp, fallback lookup theo tên
  let donViId = numberOrNull(get('don_vi_du_tuyen_id') ?? get('don_vi_id'));
  if (donViId === null) {
    const tenDonVi = (get('ten_don_vi') as string | null)?.trim() ?? null;
    if (tenDonVi && donViList.length > 0) {
      const exact = donViList.find(
        (d) => d.ten_don_vi.toLowerCase() === tenDonVi.toLowerCase()
      );
      const partial = exact ?? donViList.find(
        (d) =>
          tenDonVi.toLowerCase().includes(d.ten_don_vi.toLowerCase()) ||
          d.ten_don_vi.toLowerCase().includes(tenDonVi.toLowerCase()) ||
          tenDonVi.toLowerCase().includes(d.ma_don_vi.toLowerCase())
      );
      donViId = partial?.id ?? null;
    }
  }

  return {
    ky_tuyendung_id: kyId,
    vi_tri_dang_ky_id: viTriId,
    don_vi_du_tuyen_id: donViId,
    ho,
    ten,
    ho_ten: hoTen,
    ngay_sinh: ngaySinh,
    gioi_tinh: gioiTinh,
    dan_toc: get('dan_toc'),
    ho_khau_thuong_tru: get('ho_khau_thuong_tru'),
    cccd: get('cccd'),
    ngay_cap_cccd: get('ngay_cap_cccd'),
    noi_cap_cccd: get('noi_cap_cccd'),
    dien_thoai: get('dien_thoai'),
    email: get('email'),
    ten_truong_dao_tao: get('ten_truong_dao_tao'),
    trinh_do_chuyen_mon: get('trinh_do_chuyen_mon'),
    chuyen_nganh: get('chuyen_nganh'),
    nam_tot_nghiep: numberOrNull(get('nam_tot_nghiep')),
    co_chung_chi_nvsp: coChungChiNvsp,
    xep_loai_bang: get('xep_loai_bang'),
    doi_tuong_uu_tien: get('doi_tuong_uu_tien')
  };
}

function numberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

// ============================================================================
// Validate 1 row (dùng chung cho preview + import)
// ============================================================================
type VitriListItem = { id: number; mon: string; cap_hoc: string; ma_vi_tri: string; loai_vi_tri: string };
type DonViListItem = { id: number; ten_don_vi: string; ma_don_vi: string };

type ValidationResult =
  | { status: 'ok' | 'error'; message: string | null; valid: any; viTri2Id: number | null; donVi2Id: number | null };

function validateImportRow(
  rawRow: Record<string, unknown>,
  _rowNum: number,
  kyId: number,
  vitriList: VitriListItem[],
  donViList: DonViListItem[],
  format: 'google-form' | 'ds-du-thi'
): ValidationResult {
  const row = normalizeImportRow(rawRow, kyId, vitriList, donViList, format);

  // Collect tất cả errors (không return sớm) để user thấy đầy đủ vấn đề
  const errors: string[] = [];

  const parsed = thisinhCreateSchema.safeParse(row);
  if (!parsed.success) {
    if (process.env.DEBUG_IMPORT) {
      console.error('[validateImportRow] zod fail. row =', JSON.stringify(row, null, 2));
      console.error('[validateImportRow] errors =', JSON.stringify(parsed.error.errors, null, 2));
    }
    // Chỉ lấy error cho field chính (loại bỏ error cascade từ field optional)
    const zodErrors = parsed.error.errors.filter((e) => {
      const path = e.path.join('.');
      // Bỏ qua error "Expected number, received null" cho field optional (vi_tri, don_vi)
      if (path === 'vi_tri_dang_ky_id' || path === 'don_vi_du_tuyen_id') return false;
      return true;
    });
    if (zodErrors.length > 0) {
      errors.push(zodErrors[0].message);
    } else {
      errors.push('Dữ liệu không hợp lệ');
    }
  }
  const valid = parsed.success ? parsed.data : null;

  if (valid) {
    if (valid.cccd && !CCCD_REGEX.test(valid.cccd)) {
      const len = valid.cccd.length;
      const hint = (len === 10 || len === 11)
        ? ` (đang có ${len} số — có thể bị mất số 0 đầu do format cell CCCD là Number trong Excel; hãy format cột thành Text rồi nhập lại)`
        : '';
      errors.push(`CCCD phải là 9 hoặc 12 chữ số${hint}`);
    }
    if (valid.dien_thoai && !PHONE_REGEX.test(valid.dien_thoai)) {
      errors.push('Số điện thoại không hợp lệ');
    }
    const tuoi = calcTuoi(valid.ngay_sinh);
    if (tuoi === null || tuoi < 18 || tuoi > 65) {
      errors.push('Tuổi thí sinh phải từ 18 đến 65');
    }
    if (valid.cccd) {
      const dup = hossoRepository.findByCccd(valid.cccd);
      if (dup) {
        errors.push(`CCCD ${valid.cccd} đã tồn tại (TS #${dup.id})`);
      }
    }
  }

  // Lookup vị trí: nếu null → error
  if (row.vi_tri_dang_ky_id === null) {
    const tenVT = (rawRow as Record<string, unknown>).vi_tri_ten as string | null;
    errors.push(`Vị trí "${tenVT ?? '(rỗng)'}" không tồn tại trong DB kỳ này — cần tạo trước khi import`);
  }
  // Lookup đơn vị: cho phép null (sẽ lưu don_vi_du_tuyen_id = NULL) — chỉ warning, không error
  // (giữ nguyên logic cũ: đơn vị không match DB vẫn import được, warning)

  if (errors.length > 0) {
    return { status: 'error', message: errors.join(' · '), valid: null, viTri2Id: null, donVi2Id: null };
  }

  // Lookup NV2 (chỉ khi valid)
  let viTri2Id: number | null = null;
  let donVi2Id: number | null = null;
  const viTri2Ten = (rawRow as Record<string, unknown>).vi_tri_ten_2 as string | null;
  const donVi2Ten = (rawRow as Record<string, unknown>).ten_don_vi_2 as string | null;
  if (viTri2Ten) viTri2Id = matchViTriByLabel(viTri2Ten, vitriList);
  if (donVi2Ten) {
    const exact = donViList.find(
      (d) => d.ten_don_vi.toLowerCase() === donVi2Ten.toLowerCase()
    );
    donVi2Id = exact?.id ?? null;
  }

  return { status: 'ok', message: null, valid, viTri2Id, donVi2Id };
}

// ============================================================================
// Insert bảng phụ 1-N (chỉ dùng cho Google Form format)
// ============================================================================
function insertChildTables(thisinhId: number, row: Record<string, unknown>): void {
  // Người thân (1, 2, 3)
  const nguoiThan: Array<{ thu_tu: 1 | 2 | 3; moi_quan_he: string | null; ho_ten: string | null; ngay_sinh: string | null; thong_tin_khac: string | null }> = [];
  for (const tu of [1, 2, 3] as const) {
    const mqh = row[`nt_${tu}_moi_quan_he`] as string | null;
    const ht = row[`nt_${tu}_ho_ten`] as string | null;
    const ns = row[`nt_${tu}_ngay_sinh`] as string | null;
    const tt = row[`nt_${tu}_thong_tin`] as string | null;
    // Chỉ insert nếu có ít nhất 1 field non-null
    if (mqh || ht || ns || tt) {
      nguoiThan.push({ thu_tu: tu, moi_quan_he: mqh, ho_ten: ht, ngay_sinh: ns, thong_tin_khac: tt });
    }
  }
  if (nguoiThan.length > 0) {
    hossoRepository.insertNguoiThanBatch(thisinhId, nguoiThan);
  }

  // Văn bằng — luôn insert mục 1 (lưu trong thisinh) + mục 2 (nếu có)
  const vanBang: Array<{ thu_tu: 1 | 2; ten_truong: string | null; ngay_cap: string | null; trinh_do: string | null; so_hieu: string | null; chuyen_nganh: string | null; hinh_thuc: string | null; nganh: string | null; xep_loai: string | null }> = [];
  // Mục 2 (mục 1 đã lưu trong thisinh, không cần insert lại bảng phụ)
  const vb2Truong = row.vb_2_ten_truong as string | null;
  const vb2Ngay = row.vb_2_ngay_cap as string | null;
  const vb2TrinhDo = row.vb_2_trinh_do as string | null;
  const vb2SoHieu = row.vb_2_so_hieu as string | null;
  const vb2CN = row.vb_2_chuyen_nganh as string | null;
  const vb2HT = row.vb_2_hinh_thuc as string | null;
  const vb2Nganh = row.vb_2_nganh as string | null;
  const vb2XL = row.vb_2_xep_loai as string | null;
  if (vb2Truong || vb2Ngay || vb2TrinhDo || vb2SoHieu || vb2CN || vb2HT || vb2Nganh || vb2XL) {
    vanBang.push({
      thu_tu: 2,
      ten_truong: vb2Truong,
      ngay_cap: vb2Ngay,
      trinh_do: vb2TrinhDo,
      so_hieu: vb2SoHieu,
      chuyen_nganh: vb2CN,
      hinh_thuc: vb2HT,
      nganh: vb2Nganh,
      xep_loai: vb2XL
    });
  }
  if (vanBang.length > 0) {
    hossoRepository.insertVanBangBatch(thisinhId, vanBang);
  }

  // Quá trình công tác (1, 2)
  const qtc: Array<{ thu_tu: 1 | 2; tu_ngay: string | null; den_ngay: string | null; co_quan: string | null }> = [];
  for (const tu of [1, 2] as const) {
    const tuNgay = row[`qtc_${tu}_tu_ngay`] as string | null;
    const denNgay = row[`qtc_${tu}_den_ngay`] as string | null;
    const coQuan = row[`qtc_${tu}_co_quan`] as string | null;
    if (tuNgay || denNgay || coQuan) {
      qtc.push({ thu_tu: tu, tu_ngay: tuNgay, den_ngay: denNgay, co_quan: coQuan });
    }
  }
  if (qtc.length > 0) {
    hossoRepository.insertQtcBatch(thisinhId, qtc);
  }
}
