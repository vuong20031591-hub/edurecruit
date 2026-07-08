import { getDb } from '@/db';

export function notify(input: {
  userId: number;
  loai: 'HoSo' | 'XetTuyen' | 'ChiTieu' | 'HeThong';
  tieuDe: string;
  noiDung?: string;
  lienKet?: string;
}): void {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO thong_bao (user_id, loai, tieu_de, noi_dung, lien_ket)
       VALUES (?, ?, ?, ?, ?)`
    ).run(input.userId, input.loai, input.tieuDe, input.noiDung ?? null, input.lienKet ?? null);
  } catch {
    // ponytail: silent — notifications must not interrupt the main flow
  }
}
