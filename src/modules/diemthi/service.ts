/**
 * diemthi module - service
 * File: src/modules/diemthi/service.ts
 */
import { diemthiRepository } from './repository';
import { computeDiemUuTien } from './uu-tien';
import { ValidationError, NotFoundError, ConflictError } from '@/server/api';
import type { Session } from '@/server/auth';
import { audit } from '@/server/audit';
import type {
  DiemThiCompletionSummary,
  DiemThiFilter,
  DiemThiStats,
  DiemThiUpsert,
  DiemThiView,
  KhoaDiemPayload,
  KhoaDiemResult
} from './types';

function actorId(session: Session): number { return parseInt(session.sub, 10); }

export const diemthiService = {

  async list(filter: DiemThiFilter, _session: Session): Promise<DiemThiView[]> {
    if (!filter.ky_tuyendung_id && !filter.phongthi_id) {
      throw new ValidationError('Cần cung cấp ky_tuyendung_id hoặc phongthi_id');
    }
    return diemthiRepository.list(filter);
  },

  async getStats(filter: DiemThiFilter, _session: Session): Promise<DiemThiStats> {
    if (!filter.ky_tuyendung_id && !filter.phongthi_id) {
      throw new ValidationError('Cần cung cấp ky_tuyendung_id hoặc phongthi_id');
    }
    return diemthiRepository.getStats(filter);
  },

  async upsert(data: DiemThiUpsert, session: Session) {
    if (data.thisinh_id == null || typeof data.thisinh_id !== 'number') {
      throw new ValidationError('Thiếu thisinh_id');
    }
    if (!diemthiRepository.thisinh_exists(data.thisinh_id)) {
      throw new NotFoundError(`Thí sinh #${data.thisinh_id} không tồn tại`);
    }
    if (diemthiRepository.is_locked(data.thisinh_id)) {
      throw new ConflictError('Điểm đã khóa, không thể chỉnh sửa');
    }

    // Validate điểm range 0–100
    if (data.diem_gk1 != null && (data.diem_gk1 < 0 || data.diem_gk1 > 100)) {
      throw new ValidationError('Điểm GK1 phải từ 0 đến 100');
    }
    if (data.diem_gk2 != null && (data.diem_gk2 < 0 || data.diem_gk2 > 100)) {
      throw new ValidationError('Điểm GK2 phải từ 0 đến 100');
    }
    if (data.diem_dan_toc != null && (data.diem_dan_toc < 0 || data.diem_dan_toc > 100)) {
      throw new ValidationError('Điểm cộng dân tộc phải từ 0 đến 100');
    }

    const result = diemthiRepository.upsert(data, actorId(session));
    audit({
      action: 'NHAP_DIEM',
      userId: actorId(session),
      username: session.username,
      resourceType: 'diemthi',
      resourceId: result.id,
      result: 'SUCCESS',
    });
    return result;
  },

  async khoaDiem(payload: KhoaDiemPayload, session: Session): Promise<KhoaDiemResult> {
    if (!payload.phongthi_id) throw new ValidationError('Thiếu phongthi_id');
    if (!diemthiRepository.phongthi_exists(payload.phongthi_id)) {
      throw new NotFoundError(`Phòng thi #${payload.phongthi_id} không tồn tại`);
    }

    const result = diemthiRepository.khoaDiem(payload.phongthi_id, actorId(session));
    audit({
      action: 'KHOA_DIEM',
      userId: actorId(session),
      username: session.username,
      resourceType: 'phongthi',
      resourceId: payload.phongthi_id,
      payload: result,
      result: 'SUCCESS',
    });
    return result;
  },

  /**
   * Tự động điền điểm ưu tiên từ trường doi_tuong_uu_tien của hồ sơ đăng ký
   * cho các thí sinh trong một phòng chưa có điểm ưu tiên.
   * Idempotent: chỉ chạm các bản ghi chưa có.
   */
  async prefillUuTienForPhong(
    phongthi_id: number,
    session: Session
  ): Promise<{ updated: number; skipped: number }> {
    if (!phongthi_id) throw new ValidationError('Thiếu phongthi_id');
    if (!diemthiRepository.phongthi_exists(phongthi_id)) {
      throw new NotFoundError(`Phòng thi #${phongthi_id} không tồn tại`);
    }
    const rows = diemthiRepository.listMissingUuTien(phongthi_id);
    const userId = actorId(session);
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const diem = computeDiemUuTien(row.doi_tuong_uu_tien);
      if (diem <= 0) {
        skipped++;
        continue;
      }
      diemthiRepository.upsertKetquaUuTien(row.thisinh_id, diem, userId);
      updated++;
    }

    if (updated > 0) {
      audit({
        action: 'PREFILL_DIEM_UU_TIEN',
        userId,
        username: session.username,
        resourceType: 'phongthi',
        resourceId: phongthi_id,
        payload: { updated, skipped },
        result: 'SUCCESS',
      });
    }
    return { updated, skipped };
  },

  /**
   * Lấy tổng hợp trạng thái nhập điểm toàn kỳ: theo phòng và tổng số.
   */
  async getCompletionSummary(
    ky_tuyendung_id: number,
    _session: Session
  ): Promise<DiemThiCompletionSummary> {
    if (!ky_tuyendung_id) throw new ValidationError('Thiếu ky_tuyendung_id');
    return diemthiRepository.getCompletionSummaryByKy(ky_tuyendung_id);
  },
};
