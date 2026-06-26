import { phongthiRepository } from './repository';
import { ValidationError, NotFoundError, ConflictError } from '@/server/api';
import type { Session } from '@/server/auth';
import { audit } from '@/server/audit';
import type { PhongThiCreate, PhongThiFilter, PhongThiStats, PhongThiUpdate, PhongThiView, SapXepResult } from './types';
import type { PhongThi } from '@/db/schema';

function actorId(session: Session): number { return parseInt(session.sub, 10); }

export const phongthiService = {
  async list(filter: PhongThiFilter, _session: Session): Promise<PhongThiView[]> {
    return phongthiRepository.list(filter);
  },

  async getById(id: number, _session: Session): Promise<PhongThiView> {
    const item = phongthiRepository.findById(id);
    if (!item) throw new NotFoundError(`Phòng thi #${id} không tồn tại`);
    return item;
  },

  async getStats(kyId: number, _session: Session): Promise<PhongThiStats> {
    return phongthiRepository.getStats(kyId);
  },

  async create(data: PhongThiCreate, session: Session): Promise<PhongThi> {
    if (!data.ma_phong?.trim()) throw new ValidationError('Mã phòng không được để trống');
    if (!data.suc_chua || data.suc_chua <= 0) throw new ValidationError('Sức chứa phải > 0');
    if (!data.ngay_thi) throw new ValidationError('Ngày thi không được để trống');
    if (!data.gio_thi) throw new ValidationError('Giờ thi không được để trống');
    if (!phongthiRepository.kyExists(data.ky_tuyendung_id)) throw new ValidationError('Kỳ tuyển dụng không tồn tại');
    if (!phongthiRepository.vitriExists(data.vi_tri_dang_ky_id, data.ky_tuyendung_id)) throw new ValidationError('Vị trí tuyển dụng không tồn tại trong kỳ này');
    try {
      const created = phongthiRepository.create(data);
      audit({ action: 'XEP_PHONG', userId: actorId(session), username: session.username, resourceType: 'phongthi', resourceId: created.id, result: 'SUCCESS' });
      return created;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('UNIQUE')) throw new ConflictError(`Mã phòng "${data.ma_phong}" đã tồn tại trong kỳ này`);
      throw err;
    }
  },

  async update(id: number, data: PhongThiUpdate, session: Session): Promise<PhongThi> {
    if (!phongthiRepository.exists(id)) throw new NotFoundError(`Phòng thi #${id} không tồn tại`);
    if (data.suc_chua !== undefined && data.suc_chua <= 0) throw new ValidationError('Sức chứa phải > 0');
    try {
      const updated = phongthiRepository.update(id, data);
      audit({ action: 'XEP_PHONG', userId: actorId(session), username: session.username, resourceType: 'phongthi', resourceId: id, result: 'SUCCESS' });
      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('UNIQUE')) throw new ConflictError('Mã phòng đã tồn tại trong kỳ này');
      throw err;
    }
  },

  async delete(id: number, session: Session): Promise<void> {
    if (!phongthiRepository.exists(id)) throw new NotFoundError(`Phòng thi #${id} không tồn tại`);
    const count = phongthiRepository.countThiSinhInPhong(id);
    if (count > 0) throw new ConflictError(`Không thể xóa: phòng đang có ${count} thí sinh được xếp`);
    phongthiRepository.delete(id);
    audit({ action: 'XEP_PHONG', userId: actorId(session), username: session.username, resourceType: 'phongthi', resourceId: id, result: 'SUCCESS' });
  },

  async sapXepTuDong(kyId: number, session: Session): Promise<SapXepResult> {
    if (!phongthiRepository.kyExists(kyId)) throw new ValidationError('Kỳ tuyển dụng không tồn tại');

    // Pre-check 1: phải có ít nhất 1 phòng thi
    const rooms = phongthiRepository.list({ ky_tuyendung_id: kyId });
    if (rooms.length === 0) throw new ValidationError('Chưa có phòng thi trong kỳ');

    // Pre-check 2: phải có ít nhất 1 vitri_donvi với chỉ tiêu > 0
    const hasChiTieu = phongthiRepository.hasViTriDonViWithChiTieu(kyId);
    if (!hasChiTieu) throw new ValidationError('Chưa có vị trí-đơn vị nào được gán chỉ tiêu');

    // Pre-check 3: tất cả TS HopLe phải đã khóa hồ sơ
    const unlockedHopLe = phongthiRepository.countUnlockedHopLe(kyId);
    if (unlockedHopLe > 0) {
      throw new ValidationError(`Còn ${unlockedHopLe} thí sinh hợp lệ chưa khóa hồ sơ`);
    }

    const result = phongthiRepository.autoSapXep(kyId);
    audit({ action: 'XEP_PHONG', userId: actorId(session), username: session.username, resourceType: 'ky_tuyendung', resourceId: kyId, payload: { assigned: result.assigned, skipped: result.skipped, warnings: result.warnings }, result: 'SUCCESS' });
    return result;
  },

  async previewSapXep(kyId: number, _session: Session): Promise<{ eligible: number; rooms: number; totalCapacity: number; warnings: string[] }> {
    if (!phongthiRepository.kyExists(kyId)) throw new ValidationError('Kỳ tuyển dụng không tồn tại');
    return phongthiRepository.previewSapXep(kyId);
  },

  async chuyenPhong(tsIds: number[], phongMoiId: number, session: Session): Promise<{ moved: number; skipped: number; warnings: string[] }> {
    if (!Array.isArray(tsIds) || tsIds.length === 0) throw new ValidationError('Chưa chọn thí sinh');
    if (!phongthiRepository.exists(phongMoiId)) throw new NotFoundError('Phòng đích không tồn tại');

    const result = phongthiRepository.chuyenPhong(tsIds, phongMoiId);
    audit({ action: 'XEP_PHONG', userId: actorId(session), username: session.username, resourceType: 'phongthi', resourceId: phongMoiId, payload: { tsIds, ...result }, result: 'SUCCESS' });
    return result;
  },
};
