/**
 * diemthi module - service
 * File: src/modules/diemthi/service.ts
 */
import { diemthiRepository } from './repository';
import { ValidationError, NotFoundError, ConflictError } from '@/server/api';
import type { Session } from '@/server/auth';
import { audit } from '@/server/audit';
import type { DiemThiFilter, DiemThiStats, DiemThiUpsert, DiemThiView, KhoaDiemPayload, KhoaDiemResult } from './types';

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

    // Validate điểm range 0–10
    if (data.diem_gk1 != null && (data.diem_gk1 < 0 || data.diem_gk1 > 10)) {
      throw new ValidationError('Điểm GK1 phải từ 0 đến 10');
    }
    if (data.diem_gk2 != null && (data.diem_gk2 < 0 || data.diem_gk2 > 10)) {
      throw new ValidationError('Điểm GK2 phải từ 0 đến 10');
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
};
