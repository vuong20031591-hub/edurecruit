import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json, ValidationError } from '@/server/api';
import { getDb } from '@/db';
import { audit } from '@/server/audit';
import type { KyTuyenDung } from '@/db/schema';

export const dynamic = 'force-dynamic';

// GET /api/ky-tuyendung — list all
export async function GET(req: NextRequest) {
  try {
    await requirePerm(req, 'config.view');
    const db = getDb();
    const rows = db.prepare(
      'SELECT id, ten_ky, nam, ngay_bat_dau, ngay_ket_thuc, trang_thai, mo_ta FROM ky_tuyendung ORDER BY nam DESC, id DESC'
    ).all() as Omit<KyTuyenDung, 'created_at' | 'updated_at'>[];
    return json({ data: rows });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/ky-tuyendung — create
// Body: { ten_ky, nam, ngay_bat_dau?, ngay_ket_thuc?, mo_ta? }
export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'config.update');
    const body = await req.json();

    if (!body.ten_ky?.trim()) throw new ValidationError('Tên kỳ không được trống');
    const nam = Number(body.nam);
    if (!nam || !Number.isInteger(nam) || nam < 2000 || nam > 2100) {
      throw new ValidationError('Năm không hợp lệ');
    }

    const db = getDb();
    const result = db.prepare(
      `INSERT INTO ky_tuyendung (ten_ky, nam, ngay_bat_dau, ngay_ket_thuc, trang_thai, mo_ta, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'Mo', ?, datetime('now'), datetime('now'))`
    ).run(
      body.ten_ky.trim(),
      nam,
      body.ngay_bat_dau || `${nam}-01-01`,
      body.ngay_ket_thuc || `${nam}-12-31`,
      body.mo_ta || null
    );

    const created = db.prepare(
      'SELECT id, ten_ky, nam, ngay_bat_dau, ngay_ket_thuc, trang_thai, mo_ta FROM ky_tuyendung WHERE id = ?'
    ).get(result.lastInsertRowid) as Omit<KyTuyenDung, 'created_at' | 'updated_at'>;

    audit({
      action: 'CONFIG_UPDATE',
      userId: Number(session.sub),
      username: session.username,
      resourceType: 'ky_tuyendung',
      resourceId: Number(result.lastInsertRowid),
      payload: { created },
      result: 'SUCCESS',
    });

    return json({ data: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
