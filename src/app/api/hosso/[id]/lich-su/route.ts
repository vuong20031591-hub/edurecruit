/**
 * GET /api/hosso/[id]/lich-su - lịch sử chỉnh sửa hồ sơ
 * File: src/app/api/hosso/[id]/lich-su/route.ts
 */
import { NextRequest } from 'next/server';
import { getDb } from '@/db';
import { handleApiError, requireAuth, json } from '@/server/api';
import type { HistChinhSua } from '@/db/schema';

interface LichSuView extends HistChinhSua {
  nguoi_sua_ten?: string;
  truong_label?: string;
}

const TRUONG_LABELS: Record<string, string> = {
  ho: 'Họ',
  ten: 'Tên',
  ho_ten: 'Họ tên',
  ngay_sinh: 'Ngày sinh',
  gioi_tinh: 'Giới tính',
  cccd: 'CCCD',
  dien_thoai: 'SĐT',
  email: 'Email',
  vi_tri_dang_ky_id: 'Vị trí',
  don_vi_du_tuyen_id: 'Đơn vị',
  trang_thai_ho_so: 'Trạng thái',
  ten_truong_dao_tao: 'Trường ĐT',
  trinh_do_chuyen_mon: 'Trình độ',
  chuyen_nganh: 'Chuyên ngành',
  nam_tot_nghiep: 'Năm TN',
  co_chung_chi_nvsp: 'NVSP',
  xep_loai_bang: 'Xếp loại',
  doi_tuong_uu_tien: 'Đối tượng UT'
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const thisinhId = Number(id);

    const db = getDb();

    // Verify exists
    const ts = db.prepare('SELECT id FROM thisinh WHERE id = ?').get(thisinhId);
    if (!ts) return json({ error: 'Không tìm thấy thí sinh' }, { status: 404 });

    const rows = db.prepare(`
      SELECT h.*, u.ho_ten AS nguoi_sua_ten
      FROM hist_chinh_sua h
      LEFT JOIN users u ON h.nguoi_sua = u.id
      WHERE h.thisinh_id = ?
      ORDER BY h.ngay_sua DESC
      LIMIT 200
    `).all(thisinhId) as LichSuView[];

    const data = rows.map(r => ({
      ...r,
      truong_label: TRUONG_LABELS[r.truong] || r.truong
    }));

    return json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}
