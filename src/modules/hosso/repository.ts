/**
 * hosso module - repository
 * File: src/modules/hosso/repository.ts
 */
import { getDb } from '@/db';
import type { ThiSinh, ThiSinhCreate, ThiSinhUpdate } from '@/db/schema';
import { TrangThaiHoSo } from '@/shared/constants/enums';
import type { PaginatedThiSinh, ThiSinhFilter, ThiSinhView } from './types';

// ============================================================================
// Constants
// ============================================================================

const SORTABLE_COLUMNS = {
  id: 't.id',
  ho_ten: 't.ho_ten',
  ngay_nop_ho_so: 't.ngay_nop_ho_so',
  trang_thai_ho_so: 't.trang_thai_ho_so'
} as const;

// ============================================================================
// SQL fragments
// ============================================================================

const SELECT_THISINH_VIEW = `
  SELECT
    t.*,
    v.id  AS vt_id,  v.ma_vi_tri AS vt_ma_vi_tri,  v.mon  AS vt_mon,  v.cap_hoc AS vt_cap_hoc,  v.loai_vi_tri AS vt_loai_vi_tri,
    d.id  AS dv_id,  d.ma_don_vi AS dv_ma_don_vi,  d.ten_don_vi AS dv_ten_don_vi,  d.cap_hoc AS dv_cap_hoc,
    dt.diem_thi_giang  AS dt_diem_thi_giang, dt.trang_thai_nhap AS dt_trang_thai_nhap,
    p.id  AS pt_id,  p.ma_phong  AS pt_ma_phong,  p.ngay_thi AS pt_ngay_thi, p.gio_thi AS pt_gio_thi
  FROM thisinh t
  LEFT JOIN vitri_tuyendung    v  ON v.id  = t.vi_tri_dang_ky_id
  LEFT JOIN don_vi_tuyen_dung  d  ON d.id  = t.don_vi_du_tuyen_id
  LEFT JOIN diemthi            dt ON dt.thisinh_id = t.id
  LEFT JOIN phongthi           p  ON p.id  = dt.phongthi_id
`;

// ============================================================================
// Row mappers
// ============================================================================

interface RawThiSinhViewRow {
  // thisinh columns (t.*)
  id: number;
  ky_tuyendung_id: number;
  vi_tri_dang_ky_id: number;
  don_vi_du_tuyen_id: number;
  ho: string;
  ten: string;
  ho_ten: string;
  ngay_sinh: string;
  gioi_tinh: ThiSinh['gioi_tinh'];
  dan_toc: string | null;
  ho_khau_thuong_tru: string | null;
  cccd: string | null;
  ngay_cap_cccd: string | null;
  noi_cap_cccd: string | null;
  dien_thoai: string | null;
  email: string | null;
  ten_truong_dao_tao: string | null;
  trinh_do_chuyen_mon: string | null;
  chuyen_nganh: string | null;
  nam_tot_nghiep: number | null;
  co_chung_chi_nvsp: number;
  xep_loai_bang: string | null;
  doi_tuong_uu_tien: string | null;
  trang_thai_ho_so: ThiSinh['trang_thai_ho_so'];
  ma_ho_so: string | null;
  sbd: string | null;
  is_profile_locked: number;
  locked_at: string | null;
  locked_by: number | null;
  ly_do_tu_choi: string | null;
  ngay_nop_ho_so: string;
  // ----- Field mới từ migration 0007 -----
  ngay_nop_phieu: string | null;
  ton_giao: string | null;
  suc_khoe: string | null;
  chieu_cao: string | null;
  can_nang: string | null;
  cho_o_hien_nay: string | null;
  trinh_do_van_hoa: string | null;
  so_hieu_van_bang: string | null;
  hinh_thuc_dao_tao: string | null;
  nganh_dao_tao: string | null;
  ngay_cap_van_bang: string | null;
  ngoai_ngu: string | null;
  ngoai_ngu_khac: string | null;
  mien_thi_nn: string | null;
  cam_doan_thong_tin: string | null;
  co_dang_ky_nv2: number;
  vi_tri_dang_ky_id_2: number | null;
  don_vi_du_tuyen_id_2: number | null;
  // -----
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
  // join columns
  vt_id: number | null;
  vt_ma_vi_tri: string | null;
  vt_mon: string | null;
  vt_cap_hoc: string | null;
  vt_loai_vi_tri: string | null;
  dv_id: number | null;
  dv_ma_don_vi: string | null;
  dv_ten_don_vi: string | null;
  dv_cap_hoc: string | null;
  dt_diem_thi_giang: number | null;
  dt_trang_thai_nhap: string | null;
  pt_id: number | null;
  pt_ma_phong: string | null;
  pt_ngay_thi: string | null;
  pt_gio_thi: string | null;
}

function mapRowToView(row: RawThiSinhViewRow): ThiSinhView {
  const view: ThiSinhView = {
    id: row.id,
    ky_tuyendung_id: row.ky_tuyendung_id,
    vi_tri_dang_ky_id: row.vi_tri_dang_ky_id,
    don_vi_du_tuyen_id: row.don_vi_du_tuyen_id,
    ho: row.ho,
    ten: row.ten,
    ho_ten: row.ho_ten,
    ngay_sinh: row.ngay_sinh,
    gioi_tinh: row.gioi_tinh,
    dan_toc: row.dan_toc,
    ho_khau_thuong_tru: row.ho_khau_thuong_tru,
    cccd: row.cccd,
    ngay_cap_cccd: row.ngay_cap_cccd,
    noi_cap_cccd: row.noi_cap_cccd,
    dien_thoai: row.dien_thoai,
    email: row.email,
    ten_truong_dao_tao: row.ten_truong_dao_tao,
    trinh_do_chuyen_mon: row.trinh_do_chuyen_mon,
    chuyen_nganh: row.chuyen_nganh,
    nam_tot_nghiep: row.nam_tot_nghiep,
    co_chung_chi_nvsp: row.co_chung_chi_nvsp,
    xep_loai_bang: row.xep_loai_bang,
    doi_tuong_uu_tien: row.doi_tuong_uu_tien,
    trang_thai_ho_so: row.trang_thai_ho_so,
    ma_ho_so: row.ma_ho_so,
    sbd: row.sbd,
    is_profile_locked: row.is_profile_locked,
    locked_at: row.locked_at,
    locked_by: row.locked_by,
    ly_do_tu_choi: row.ly_do_tu_choi,
    ngay_nop_ho_so: row.ngay_nop_ho_so,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    updated_by: row.updated_by,
    viTri: row.vt_id
      ? { id: row.vt_id, ma_vi_tri: row.vt_ma_vi_tri ?? '', mon: row.vt_mon ?? '', cap_hoc: row.vt_cap_hoc ?? '', loai_vi_tri: row.vt_loai_vi_tri ?? '' }
      : null,
    donVi: row.dv_id
      ? {
          id: row.dv_id,
          ma_don_vi: row.dv_ma_don_vi ?? '',
          ten_don_vi: row.dv_ten_don_vi ?? '',
          cap_hoc: row.dv_cap_hoc ?? ''
        }
      : null,
    diemThi:
      row.dt_diem_thi_giang !== null || row.dt_trang_thai_nhap !== null
        ? { diem_thi_giang: row.dt_diem_thi_giang, trang_thai_nhap: row.dt_trang_thai_nhap ?? '' }
        : null,
    phongThi: row.pt_id
      ? {
          id: row.pt_id,
          ma_phong: row.pt_ma_phong ?? '',
          ngay_thi: row.pt_ngay_thi ?? '',
          gio_thi: row.pt_gio_thi ?? ''
        }
      : null,
    da_xep_phong: row.pt_id !== null,
    // Field mới từ migration 0007 — RawThiSinhViewRow dùng SELECT *, nên có sẵn
    ngay_nop_phieu: row.ngay_nop_phieu ?? null,
    ton_giao: row.ton_giao ?? null,
    suc_khoe: row.suc_khoe ?? null,
    chieu_cao: row.chieu_cao ?? null,
    can_nang: row.can_nang ?? null,
    cho_o_hien_nay: row.cho_o_hien_nay ?? null,
    trinh_do_van_hoa: row.trinh_do_van_hoa ?? null,
    so_hieu_van_bang: row.so_hieu_van_bang ?? null,
    hinh_thuc_dao_tao: row.hinh_thuc_dao_tao ?? null,
    nganh_dao_tao: row.nganh_dao_tao ?? null,
    ngay_cap_van_bang: row.ngay_cap_van_bang ?? null,
    ngoai_ngu: row.ngoai_ngu ?? null,
    ngoai_ngu_khac: row.ngoai_ngu_khac ?? null,
    mien_thi_nn: row.mien_thi_nn ?? null,
    cam_doan_thong_tin: row.cam_doan_thong_tin ?? null,
    co_dang_ky_nv2: row.co_dang_ky_nv2 ?? 0,
    vi_tri_dang_ky_id_2: row.vi_tri_dang_ky_id_2 ?? null,
    don_vi_du_tuyen_id_2: row.don_vi_du_tuyen_id_2 ?? null
  };
  return view;
}

// ============================================================================
// Filter helpers
// ============================================================================

function buildWhere(filter: ThiSinhFilter | undefined): { sql: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (!filter) return { sql: '', params };

  if (filter.ky_tuyendung_id != null) {
    conditions.push('t.ky_tuyendung_id = ?');
    params.push(filter.ky_tuyendung_id);
  }
  if (filter.vi_tri_id != null) {
    conditions.push('t.vi_tri_dang_ky_id = ?');
    params.push(filter.vi_tri_id);
  }
  if (filter.don_vi_id != null) {
    conditions.push('t.don_vi_du_tuyen_id = ?');
    params.push(filter.don_vi_id);
  }
  if (filter.trang_thai != null) {
    if (Array.isArray(filter.trang_thai)) {
      if (filter.trang_thai.length === 0) {
        // skip
      } else {
        const placeholders = filter.trang_thai.map(() => '?').join(',');
        conditions.push(`t.trang_thai_ho_so IN (${placeholders})`);
        params.push(...filter.trang_thai);
      }
    } else {
      conditions.push('t.trang_thai_ho_so = ?');
      params.push(filter.trang_thai);
    }
  }
  if (filter.ngay_nop_from) {
    conditions.push('t.ngay_nop_ho_so >= ?');
    params.push(filter.ngay_nop_from);
  }
  if (filter.ngay_nop_to) {
    conditions.push('t.ngay_nop_ho_so <= ?');
    params.push(filter.ngay_nop_to);
  }
  if (filter.search && filter.search.trim()) {
    const kw = `%${filter.search.trim()}%`;
    conditions.push('(t.ho_ten LIKE ? OR t.cccd LIKE ? OR t.email LIKE ?)');
    params.push(kw, kw, kw);
  }

  return {
    sql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

function resolveOrderBy(filter: ThiSinhFilter | undefined): string {
  const sortBy = filter?.sortBy ?? null;
  const sortDir = filter?.sortDir === 'desc' ? 'DESC' : 'ASC';
  if (sortBy && sortBy in SORTABLE_COLUMNS) {
    return `${SORTABLE_COLUMNS[sortBy]} ${sortDir}, t.id DESC`;
  }
  // Default per PRD Bước 4: sort theo ten (first name) ASC
  return 't.ten ASC, t.ho ASC, t.id DESC';
}

// ============================================================================
// Insert types for child tables (1-N)
// ============================================================================
type NguoiThanInsert = {
  thisinh_id: number;
  thu_tu: 1 | 2 | 3;
  moi_quan_he: string | null;
  ho_ten: string | null;
  ngay_sinh: string | null;
  thong_tin_khac: string | null;
};
type VanBangInsert = {
  thisinh_id: number;
  thu_tu: 1 | 2;
  ten_truong: string | null;
  ngay_cap: string | null;
  trinh_do: string | null;
  so_hieu: string | null;
  chuyen_nganh: string | null;
  hinh_thuc: string | null;
  nganh: string | null;
  xep_loai: string | null;
};
type QtcInsert = {
  thisinh_id: number;
  thu_tu: 1 | 2;
  tu_ngay: string | null;
  den_ngay: string | null;
  co_quan: string | null;
};

// ============================================================================
// Repository
// ============================================================================

export const hossoRepository = {
  findById(id: number): ThiSinh | null {
    const row = getDb()
      .prepare('SELECT * FROM thisinh WHERE id = ?')
      .get(id) as ThiSinh | undefined;
    return row ?? null;
  },

  findByIdWithJoins(id: number): ThiSinhView | null {
    const row = getDb()
      .prepare(`${SELECT_THISINH_VIEW} WHERE t.id = ?`)
      .get(id) as RawThiSinhViewRow | undefined;
    return row ? mapRowToView(row) : null;
  },

  // ----- Bảng phụ 1-N (read) -----
  listNguoiThan(thisinhId: number) {
    return getDb()
      .prepare('SELECT * FROM thisinh_nguoi_than WHERE thisinh_id = ? ORDER BY thu_tu')
      .all(thisinhId);
  },
  listVanBang(thisinhId: number) {
    return getDb()
      .prepare('SELECT * FROM thisinh_van_bang WHERE thisinh_id = ? ORDER BY thu_tu')
      .all(thisinhId);
  },
  listQtc(thisinhId: number) {
    return getDb()
      .prepare('SELECT * FROM thisinh_qtc WHERE thisinh_id = ? ORDER BY thu_tu')
      .all(thisinhId);
  },

  list(filter: ThiSinhFilter): PaginatedThiSinh {
    const db = getDb();
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(500, Math.max(1, filter.pageSize ?? 50));
    const offset = (page - 1) * pageSize;

    const { sql: where, params } = buildWhere(filter);
    const orderBy = resolveOrderBy(filter);

    const countRow = db
      .prepare(`SELECT COUNT(*) AS c FROM thisinh t ${where}`)
      .get(...params) as { c: number };
    const total = countRow.c;

    const rows = db
      .prepare(`${SELECT_THISINH_VIEW} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
      .all(...params, pageSize, offset) as RawThiSinhViewRow[];

    return {
      data: rows.map(mapRowToView),
      total,
      page,
      pageSize
    };
  },

  count(filter?: ThiSinhFilter): number {
    const db = getDb();
    const { sql: where, params } = buildWhere(filter);
    const row = db
      .prepare(`SELECT COUNT(*) AS c FROM thisinh t ${where}`)
      .get(...params) as { c: number };
    return row.c;
  },

  countByStatus(kyId: number): Record<ThiSinh['trang_thai_ho_so'], number> {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT trang_thai_ho_so AS s, COUNT(*) AS c
         FROM thisinh
         WHERE ky_tuyendung_id = ?
         GROUP BY trang_thai_ho_so`
      )
      .all(kyId) as Array<{ s: ThiSinh['trang_thai_ho_so']; c: number }>;

    const result: Record<ThiSinh['trang_thai_ho_so'], number> = {
      ChoRaSoat: 0,
      HopLe: 0,
      CanBoSung: 0,
      KhongDuDieuKien: 0,
      DaChinhSua: 0
    };
    for (const r of rows) {
      if (r.s in result) result[r.s] = r.c;
    }
    return result;
  },

  create(data: Record<string, unknown>): ThiSinh {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO thisinh (
        ky_tuyendung_id, vi_tri_dang_ky_id, don_vi_du_tuyen_id,
        ho, ten, ho_ten,
        ngay_sinh, gioi_tinh,
        dan_toc, ho_khau_thuong_tru,
        cccd, ngay_cap_cccd, noi_cap_cccd,
        dien_thoai, email,
        ten_truong_dao_tao, trinh_do_chuyen_mon, chuyen_nganh,
        nam_tot_nghiep, co_chung_chi_nvsp, xep_loai_bang,
        doi_tuong_uu_tien,
        trang_thai_ho_so, ngay_nop_ho_so,
        -- Bổ sung từ Google Form (migration 0007)
        ngay_nop_phieu, ton_giao, suc_khoe, chieu_cao, can_nang,
        cho_o_hien_nay, trinh_do_van_hoa,
        so_hieu_van_bang, hinh_thuc_dao_tao, nganh_dao_tao, ngay_cap_van_bang,
        ngoai_ngu, ngoai_ngu_khac, mien_thi_nn, cam_doan_thong_tin,
        co_dang_ky_nv2, vi_tri_dang_ky_id_2, don_vi_du_tuyen_id_2,
        created_by, updated_by
      ) VALUES (
        @ky_tuyendung_id, @vi_tri_dang_ky_id, @don_vi_du_tuyen_id,
        @ho, @ten, @ho_ten,
        @ngay_sinh, @gioi_tinh,
        @dan_toc, @ho_khau_thuong_tru,
        @cccd, @ngay_cap_cccd, @noi_cap_cccd,
        @dien_thoai, @email,
        @ten_truong_dao_tao, @trinh_do_chuyen_mon, @chuyen_nganh,
        @nam_tot_nghiep, @co_chung_chi_nvsp, @xep_loai_bang,
        @doi_tuong_uu_tien,
        @trang_thai_ho_so, COALESCE(@ngay_nop_ho_so, datetime('now')),
        @ngay_nop_phieu, @ton_giao, @suc_khoe, @chieu_cao, @can_nang,
        @cho_o_hien_nay, @trinh_do_van_hoa,
        @so_hieu_van_bang, @hinh_thuc_dao_tao, @nganh_dao_tao, @ngay_cap_van_bang,
        @ngoai_ngu, @ngoai_ngu_khac, @mien_thi_nn, @cam_doan_thong_tin,
        @co_dang_ky_nv2, @vi_tri_dang_ky_id_2, @don_vi_du_tuyen_id_2,
        @created_by, @updated_by
      )
    `);
    const payload: Record<string, unknown> = {
      ...data,
      co_chung_chi_nvsp: data.co_chung_chi_nvsp ?? 0,
      trang_thai_ho_so: data.trang_thai_ho_so ?? TrangThaiHoSo.ChoRaSoat,
      ngay_nop_ho_so: null,
      updated_by: data.created_by ?? null,
      // Defaults cho field mới (nếu service không truyền)
      ngay_nop_phieu: data.ngay_nop_phieu ?? null,
      ton_giao: data.ton_giao ?? null,
      suc_khoe: data.suc_khoe ?? null,
      chieu_cao: data.chieu_cao ?? null,
      can_nang: data.can_nang ?? null,
      cho_o_hien_nay: data.cho_o_hien_nay ?? null,
      trinh_do_van_hoa: data.trinh_do_van_hoa ?? null,
      so_hieu_van_bang: data.so_hieu_van_bang ?? null,
      hinh_thuc_dao_tao: data.hinh_thuc_dao_tao ?? null,
      nganh_dao_tao: data.nganh_dao_tao ?? null,
      ngay_cap_van_bang: data.ngay_cap_van_bang ?? null,
      ngoai_ngu: data.ngoai_ngu ?? null,
      ngoai_ngu_khac: data.ngoai_ngu_khac ?? null,
      mien_thi_nn: data.mien_thi_nn ?? null,
      cam_doan_thong_tin: data.cam_doan_thong_tin ?? null,
      co_dang_ky_nv2: data.co_dang_ky_nv2 ?? 0,
      vi_tri_dang_ky_id_2: data.vi_tri_dang_ky_id_2 ?? null,
      don_vi_du_tuyen_id_2: data.don_vi_du_tuyen_id_2 ?? null
    };
    const info = stmt.run(payload);
    const row = db
      .prepare('SELECT * FROM thisinh WHERE id = ?')
      .get(info.lastInsertRowid) as ThiSinh;
    return row;
  },

  // ----- Bảng phụ 1-N (migration 0007) -----
  insertNguoiThanBatch(thisinhId: number, items: Array<Omit<NguoiThanInsert, 'thisinh_id'>>): void {
    if (items.length === 0) return;
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO thisinh_nguoi_than (thisinh_id, thu_tu, moi_quan_he, ho_ten, ngay_sinh, thong_tin_khac)
      VALUES (@thisinh_id, @thu_tu, @moi_quan_he, @ho_ten, @ngay_sinh, @thong_tin_khac)
    `);
    const tx = db.transaction((rows: typeof items) => {
      for (const r of rows) {
        stmt.run({ thisinh_id: thisinhId, ...r });
      }
    });
    tx(items);
  },

  insertVanBangBatch(thisinhId: number, items: Array<Omit<VanBangInsert, 'thisinh_id'>>): void {
    if (items.length === 0) return;
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO thisinh_van_bang (thisinh_id, thu_tu, ten_truong, ngay_cap, trinh_do, so_hieu, chuyen_nganh, hinh_thuc, nganh, xep_loai)
      VALUES (@thisinh_id, @thu_tu, @ten_truong, @ngay_cap, @trinh_do, @so_hieu, @chuyen_nganh, @hinh_thuc, @nganh, @xep_loai)
    `);
    const tx = db.transaction((rows: typeof items) => {
      for (const r of rows) {
        stmt.run({ thisinh_id: thisinhId, ...r });
      }
    });
    tx(items);
  },

  insertQtcBatch(thisinhId: number, items: Array<Omit<QtcInsert, 'thisinh_id'>>): void {
    if (items.length === 0) return;
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO thisinh_qtc (thisinh_id, thu_tu, tu_ngay, den_ngay, co_quan)
      VALUES (@thisinh_id, @thu_tu, @tu_ngay, @den_ngay, @co_quan)
    `);
    const tx = db.transaction((rows: typeof items) => {
      for (const r of rows) {
        stmt.run({ thisinh_id: thisinhId, ...r });
      }
    });
    tx(items);
  },

  update(id: number, data: ThiSinhUpdate): ThiSinh {
    const db = getDb();
    const fields: string[] = [];
    const params: unknown[] = [];

    const updatable: Array<keyof ThiSinhUpdate> = [
      'vi_tri_dang_ky_id',
      'don_vi_du_tuyen_id',
      'ho',
      'ten',
      'ho_ten',
      'ngay_sinh',
      'gioi_tinh',
      'dan_toc',
      'ho_khau_thuong_tru',
      'cccd',
      'ngay_cap_cccd',
      'noi_cap_cccd',
      'dien_thoai',
      'email',
      'ten_truong_dao_tao',
      'trinh_do_chuyen_mon',
      'chuyen_nganh',
      'nam_tot_nghiep',
      'co_chung_chi_nvsp',
      'xep_loai_bang',
      'doi_tuong_uu_tien',
      'trang_thai_ho_so',
      'sbd',
      'is_profile_locked',
      'locked_at',
      'locked_by',
      'ly_do_tu_choi',
      'updated_by'
    ];

    for (const key of updatable) {
      if (key in data) {
        const value = (data as Record<string, unknown>)[key];
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          params.push(value);
        }
      }
    }

    if (fields.length === 0) {
      const existing = db.prepare('SELECT * FROM thisinh WHERE id = ?').get(id) as ThiSinh | undefined;
      if (!existing) throw new Error(`thisinh ${id} not found`);
      return existing;
    }

    fields.push("updated_at = datetime('now')");
    params.push(id);

    const sql = `UPDATE thisinh SET ${fields.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...params);

    const row = db.prepare('SELECT * FROM thisinh WHERE id = ?').get(id) as ThiSinh;
    return row;
  },

  delete(id: number): void {
    getDb().prepare('DELETE FROM thisinh WHERE id = ?').run(id);
  },

  findByCccd(cccd: string, excludeId?: number): ThiSinh | null {
    const db = getDb();
    const row = excludeId
      ? (db
          .prepare('SELECT * FROM thisinh WHERE cccd = ? AND id != ?')
          .get(cccd, excludeId) as ThiSinh | undefined)
      : (db.prepare('SELECT * FROM thisinh WHERE cccd = ?').get(cccd) as ThiSinh | undefined);
    return row ?? null;
  },

  hasCccdHistory(thisinhId: number, truong: string): boolean {
    const row = getDb()
      .prepare('SELECT COUNT(*) AS c FROM hist_chinh_sua WHERE thisinh_id = ? AND truong = ?')
      .get(thisinhId, truong) as { c: number };
    return row.c > 0;
  },

  insertHistory(input: {
    thisinh_id: number;
    truong: string;
    gia_tri_cu: string | null;
    gia_tri_moi: string | null;
    ly_do: string | null;
    nguoi_sua: number;
  }): void {
    getDb()
      .prepare(
        `INSERT INTO hist_chinh_sua (thisinh_id, truong, gia_tri_cu, gia_tri_moi, ly_do, nguoi_sua)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.thisinh_id,
        input.truong,
        input.gia_tri_cu,
        input.gia_tri_moi,
        input.ly_do,
        input.nguoi_sua
      );
  },

  vitriExists(id: number, kyId: number): boolean {
    const row = getDb()
      .prepare('SELECT id FROM vitri_tuyendung WHERE id = ? AND ky_tuyendung_id = ?')
      .get(id, kyId) as { id: number } | undefined;
    return !!row;
  },

  donviExists(id: number, kyId: number): boolean {
    const row = getDb()
      .prepare('SELECT id FROM don_vi_tuyen_dung WHERE id = ? AND ky_tuyendung_id = ?')
      .get(id, kyId) as { id: number } | undefined;
    return !!row;
  },

  lockAllHopLe(kyId: number, userId: number): number {
    const db = getDb();
    const result = db.prepare(`
      UPDATE thisinh
      SET is_profile_locked = 1,
          locked_at = datetime('now'),
          locked_by = ?,
          updated_at = datetime('now')
      WHERE ky_tuyendung_id = ?
        AND trang_thai_ho_so = 'HopLe'
        AND is_profile_locked = 0
    `).run(userId, kyId);
    return result.changes;
  },

  listVitriByKy(kyId: number): Array<{ id: number; mon: string; cap_hoc: string; ma_vi_tri: string; loai_vi_tri: string }> {
    return getDb()
      .prepare('SELECT id, mon, cap_hoc, ma_vi_tri, loai_vi_tri FROM vitri_tuyendung WHERE ky_tuyendung_id = ?')
      .all(kyId) as Array<{ id: number; mon: string; cap_hoc: string; ma_vi_tri: string; loai_vi_tri: string }>;
  },

  listDonViByKy(kyId: number): Array<{ id: number; ten_don_vi: string; ma_don_vi: string }> {
    return getDb()
      .prepare('SELECT id, ten_don_vi, ma_don_vi FROM don_vi_tuyen_dung WHERE ky_tuyendung_id = ?')
      .all(kyId) as Array<{ id: number; ten_don_vi: string; ma_don_vi: string }>;
  }
};
