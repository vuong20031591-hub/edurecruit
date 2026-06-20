import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json, ValidationError, NotFoundError } from '@/server/api';
import { getDb } from '@/db';
import { audit } from '@/server/audit';

// PUT /api/diemthi/uu-tien — upsert diem_uu_tien vào bảng ketqua
// Body: { thisinh_id: number; diem_uu_tien: number }
export async function PUT(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'diemthi.nhap');
    const body = await req.json();

    const { thisinh_id, diem_uu_tien } = body;
    if (thisinh_id == null || typeof thisinh_id !== 'number') {
      throw new ValidationError('Thiếu thisinh_id');
    }
    if (diem_uu_tien == null || typeof diem_uu_tien !== 'number' || diem_uu_tien < 0) {
      throw new ValidationError('diem_uu_tien phải là số >= 0');
    }

    const db = getDb();

    // Kiểm tra thisinh tồn tại
    const ts = db.prepare('SELECT id FROM thisinh WHERE id = ?').get(thisinh_id);
    if (!ts) throw new NotFoundError(`Thí sinh #${thisinh_id} không tồn tại`);

    // Lấy diem_thi_giang hiện tại từ diemthi
    const dt = db.prepare('SELECT diem_thi_giang FROM diemthi WHERE thisinh_id = ?').get(thisinh_id) as
      { diem_thi_giang: number | null } | undefined;
    const diemThiGiang = dt?.diem_thi_giang ?? null;
    const diemTong = (diemThiGiang ?? 0) + diem_uu_tien;

    const userId = parseInt(session.sub, 10);

    // Upsert ketqua
    const existing = db.prepare('SELECT id FROM ketqua WHERE thisinh_id = ?').get(thisinh_id);
    if (!existing) {
      db.prepare(`
        INSERT INTO ketqua (thisinh_id, diem_thi_giang, diem_uu_tien, diem_tong, ket_qua, ngay_chay, nguoi_chay)
        VALUES (?, ?, ?, ?, 'ChoXuLy', datetime('now'), ?)
      `).run(thisinh_id, diemThiGiang, diem_uu_tien, diemTong, userId);
    } else {
      db.prepare(`
        UPDATE ketqua SET diem_uu_tien = ?, diem_tong = ?, updated_at = datetime('now')
        WHERE thisinh_id = ?
      `).run(diem_uu_tien, diemTong, thisinh_id);
    }

    const result = db.prepare('SELECT * FROM ketqua WHERE thisinh_id = ?').get(thisinh_id);

    audit({
      action: 'NHAP_DIEM_UU_TIEN',
      userId,
      username: session.username,
      resourceType: 'ketqua',
      resourceId: thisinh_id,
      payload: { thisinh_id, diem_uu_tien },
      result: 'SUCCESS',
    });

    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
