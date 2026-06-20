import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json, ValidationError, NotFoundError } from '@/server/api';
import { getDb } from '@/db';
import { audit } from '@/server/audit';
import type { KyTuyenDung } from '@/db/schema';

type Params = { params: Promise<{ id: string }> };

// GET /api/ky-tuyendung/[id]
export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requirePerm(req, 'config.view');
    const { id } = await params;
    const db = getDb();
    const row = db.prepare(
      'SELECT id, ten_ky, nam, ngay_bat_dau, ngay_ket_thuc, trang_thai, mo_ta FROM ky_tuyendung WHERE id = ?'
    ).get(Number(id)) as Omit<KyTuyenDung, 'created_at' | 'updated_at'> | undefined;

    if (!row) throw new NotFoundError('Kỳ tuyển dụng không tồn tại');
    return json({ data: row });
  } catch (err) {
    return handleApiError(err);
  }
}

// PUT /api/ky-tuyendung/[id]
// Body: { ten_ky?, ngay_bat_dau?, ngay_ket_thuc?, mo_ta? }
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePerm(req, 'config.update');
    const { id } = await params;
    const kyId = Number(id);
    const db = getDb();

    const existing = db.prepare('SELECT * FROM ky_tuyendung WHERE id = ?').get(kyId) as KyTuyenDung | undefined;
    if (!existing) throw new NotFoundError('Kỳ tuyển dụng không tồn tại');

    const body = await req.json();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (body.ten_ky !== undefined) {
      if (!body.ten_ky?.trim()) throw new ValidationError('Tên kỳ không được trống');
      sets.push('ten_ky = ?');
      values.push(body.ten_ky.trim());
    }
    if (body.ngay_bat_dau !== undefined) {
      sets.push('ngay_bat_dau = ?');
      values.push(body.ngay_bat_dau || null);
    }
    if (body.ngay_ket_thuc !== undefined) {
      sets.push('ngay_ket_thuc = ?');
      values.push(body.ngay_ket_thuc || null);
    }
    if (body.mo_ta !== undefined) {
      sets.push('mo_ta = ?');
      values.push(body.mo_ta || null);
    }

    if (sets.length === 0) throw new ValidationError('Không có trường nào để cập nhật');

    sets.push("updated_at = datetime('now')");
    values.push(kyId);

    db.prepare(`UPDATE ky_tuyendung SET ${sets.join(', ')} WHERE id = ?`).run(...values);

    audit({
      action: 'CONFIG_UPDATE',
      userId: Number(session.sub),
      username: session.username,
      resourceType: 'ky_tuyendung',
      resourceId: kyId,
      payload: { before: existing, changes: body },
      result: 'SUCCESS',
    });

    const updated = db.prepare(
      'SELECT id, ten_ky, nam, ngay_bat_dau, ngay_ket_thuc, trang_thai, mo_ta FROM ky_tuyendung WHERE id = ?'
    ).get(kyId) as Omit<KyTuyenDung, 'created_at' | 'updated_at'>;

    return json({ data: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
