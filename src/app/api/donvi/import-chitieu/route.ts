import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { handleApiError, requirePerm, json, ValidationError } from '@/server/api';
import { getDb } from '@/db';
import { notify } from '@/server/notify';

export const dynamic = 'force-dynamic';

function cellNum(cell: ExcelJS.Cell): number {
  const v = cell.value;
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'object' && 'result' in v ? (v as { result?: unknown }).result : v;
  return Number(n) || 0;
}

function cellStr(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  const n = typeof v === 'object' && 'result' in v ? (v as { result?: unknown }).result : v;
  return String(n).trim();
}

function capHocFromName(name: string): string {
  const n = name.toUpperCase();
  if (n.includes('MẦM NON') || /\bMN\b/.test(n)) return 'MN';
  if (n.includes('GDTX')) return 'GDTX';
  if (n.includes('THCS') && n.includes('THPT')) return 'THCS_THPT';
  if (n.includes('THCS') && (n.includes('TIỂU HỌC') || /\bTH\b/.test(n))) return 'TH_THCS';
  if (n.includes('THPT')) return 'THPT';
  if (n.includes('THCS')) return 'THCS';
  if (n.includes('TIỂU HỌC') || /\bTH\b/.test(n)) return 'TH';
  return 'THPT';
}

function toSlug(str: string): string {
  return str
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-z0-9\s-]/gi, '')
    .trim().replace(/\s+/g, '-')
    .toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'donvi.create');
    void session;
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    const kyIdRaw = fd.get('ky_tuyendung_id');

    if (!file) throw new ValidationError('Thiếu file');
    const kyId = Number(kyIdRaw);
    if (!kyId || !Number.isInteger(kyId)) throw new ValidationError('ky_tuyendung_id không hợp lệ');

    const buf = Buffer.from(new Uint8Array(await file.arrayBuffer()));
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);

    const ws = wb.worksheets[0];
    if (!ws) throw new ValidationError('File Excel không có sheet nào');

    const db = getDb();

    // Load alias map từ DB một lần
    const aliasRows = db.prepare('SELECT alias, canonical FROM subject_aliases').all() as { alias: string; canonical: string }[];
    const aliasMap = new Map(aliasRows.map(r => [r.alias.toLowerCase(), r.canonical]));

    // Row 5: xác định loai_vi_tri cho từng cột
    const groupRow = ws.getRow(5);
    // Row 6: tên môn
    const subjectRow = ws.getRow(6);

    type ColMeta = { col: number; mon: string; loaiViTri: 'GiaoVien' | 'NhanVien' };
    const cols: ColMeta[] = [];

    let currentGroup: 'GiaoVien' | 'NhanVien' = 'GiaoVien';
    for (let c = 4; c <= ws.columnCount; c++) {
      const grp = cellStr(groupRow.getCell(c)).replace(/\r?\n/g, ' ').trim();
      if (grp) {
        currentGroup = grp.toLowerCase().includes('nhân viên') ? 'NhanVien' : 'GiaoVien';
      }
      const subj = cellStr(subjectRow.getCell(c)).replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
      if (!subj || subj.startsWith('Tổng')) continue;

      const canonical = aliasMap.get(subj.toLowerCase()) ?? subj;
      cols.push({ col: c, mon: canonical, loaiViTri: currentGroup });
    }

    if (cols.length === 0) throw new ValidationError('Không đọc được cột môn học từ file');

    // Parse rows
    type ParsedRow = {
      tenDonVi: string;
      capHoc: string;
      maDonVi: string;
      subjects: Array<{ mon: string; loaiViTri: string; soLuong: number }>;
      total: number;
    };
    const parsed: ParsedRow[] = [];

    for (let r = 7; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const tenDonVi = cellStr(row.getCell(2));
      if (!tenDonVi || tenDonVi === 'Tổng') break;

      const capHoc = capHocFromName(tenDonVi);
      const maDonVi = toSlug(tenDonVi).slice(0, 50) || `donvi-${r}`;

      const subjects = cols
        .map(c => ({ mon: c.mon, loaiViTri: c.loaiViTri, soLuong: cellNum(row.getCell(c.col)) }))
        .filter(s => s.soLuong > 0);

      const total = subjects.reduce((s, x) => s + x.soLuong, 0);
      parsed.push({ tenDonVi, capHoc, maDonVi, subjects, total });
    }

    if (parsed.length === 0) throw new ValidationError('File không có dữ liệu đơn vị nào');

    // Deduplicate cols by mon+loaiViTri (keep first occurrence)
    const seenCols = new Set<string>();
    const uniqueCols = cols.filter(c => {
      const key = `${c.mon}__${c.loaiViTri}`;
      if (seenCols.has(key)) return false;
      seenCols.add(key);
      return true;
    });

    const subjectMeta = uniqueCols.map(c => ({ mon: c.mon, loaiViTri: c.loaiViTri }));

    const isDryRun = fd.get('dry_run') === 'true';
    if (isDryRun) {
      return json({
        preview: parsed.map(r => ({
          tenDonVi: r.tenDonVi,
          capHoc: r.capHoc,
          total: r.total,
          subjects: r.subjects,
        })),
        subjectMeta,
        matchedSubjects: subjectMeta.map(s => s.mon),
        unmatchedSubjects: [],
        skipped: [],
      });
    }

    // Upsert transaction
    const upsertDonVi = db.prepare(
      `INSERT OR IGNORE INTO don_vi_tuyen_dung
         (ky_tuyendung_id, ma_don_vi, ten_don_vi, cap_hoc, so_chi_tieu, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
    );
    const updateDonViCapHoc = db.prepare(
      `UPDATE don_vi_tuyen_dung SET cap_hoc = ?, ten_don_vi = ?, updated_at = datetime('now')
       WHERE ky_tuyendung_id = ? AND ma_don_vi = ? AND cap_hoc != ?`
    );
    const getDonViId = db.prepare(
      `SELECT id FROM don_vi_tuyen_dung WHERE ky_tuyendung_id = ? AND ma_don_vi = ?`
    );
    const updateChiTieu = db.prepare(
      `UPDATE don_vi_tuyen_dung SET so_chi_tieu = ?, updated_at = datetime('now') WHERE id = ?`
    );
    const upsertViTri = db.prepare(
      `INSERT OR IGNORE INTO vitri_tuyendung
         (ky_tuyendung_id, ma_vi_tri, mon, cap_hoc, loai_vi_tri, so_luong, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`
    );
    const getViTriId = db.prepare(
      `SELECT id FROM vitri_tuyendung WHERE ky_tuyendung_id = ? AND mon = ? AND cap_hoc = ? AND loai_vi_tri = ?`
    );
    const upsertVitriDonvi = db.prepare(
      `INSERT OR REPLACE INTO vitri_donvi (vitri_tuyendung_id, don_vi_tuyen_dung_id, so_luong_phan_bo, created_at)
       VALUES (?, ?, ?, datetime('now'))`
    );

    db.transaction(() => {
      for (const row of parsed) {
        upsertDonVi.run(kyId, row.maDonVi, row.tenDonVi, row.capHoc);
        updateDonViCapHoc.run(row.capHoc, row.tenDonVi, kyId, row.maDonVi, row.capHoc);
        const dv = getDonViId.get(kyId, row.maDonVi) as { id: number };

        for (const s of row.subjects) {
          const maViTri = `${s.loaiViTri === 'GiaoVien' ? 'GV' : 'NV'}_${toSlug(s.mon).replace(/-/g, '_').toUpperCase()}_${row.capHoc}`.slice(0, 50);
          upsertViTri.run(kyId, maViTri, s.mon, row.capHoc, s.loaiViTri);
          const vt = getViTriId.get(kyId, s.mon, row.capHoc, s.loaiViTri) as { id: number };
          upsertVitriDonvi.run(vt.id, dv.id, s.soLuong);
        }

        updateChiTieu.run(row.total, dv.id);
      }
    })();

    const userId = Number(session.sub);
    notify({ userId, loai: 'ChiTieu', tieuDe: `Import chỉ tiêu hoàn tất (${parsed.length} đơn vị)`, lienKet: '/dashboard/chi-tieu' });

    return json({
      imported: parsed.length,
      skipped: [],
      matchedSubjects: [...new Set(cols.map(c => c.mon))],
      unmatchedSubjects: [],
    });
  } catch (err) {
    return handleApiError(err);
  }
}
