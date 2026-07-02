/**
 * Rà soát tự động Bước 2 — Rules engine
 * File: src/modules/hosso/ra-soat-rules.ts
 *
 * Kiểm tra 1 hồ sơ theo bộ rules (validation Bước 1 + nghiệp vụ Hội đồng thi).
 * Trả về:
 *   - score: 0-100 (điểm ưu tiên, cao = ít vấn đề)
 *   - issues: danh sách vấn đề phát hiện
 *   - trang_thai: Dat / CanhBao / KhongDat
 */
import type { TrangThaiRaSoat } from '@/db/schema';

export interface RaSoatIssue {
  code: string;
  field: string;
  message: string;
  severity: 'critical' | 'warning';
  /** Điểm bị trừ (dương) */
  diemTru: number;
}

export interface RaSoatThiSinhInput {
  id: number;
  cccd: string | null;
  dien_thoai: string | null;
  email: string | null;
  ngay_sinh: string;
  gioi_tinh: string;
  vi_tri_dang_ky_id: number;
  chuyen_nganh: string | null;
  trinh_do_chuyen_mon: string | null;
  ten_truong_dao_tao: string | null;
  co_chung_chi_nvsp: number;
  loai_vi_tri?: string | null;
  mon?: string | null;
  /** PRD Bước 2: cần cho NĐ 179/2024 đối tượng ưu tiên */
  dan_toc: string | null;
  /** Ngày nộp hồ sơ (ISO date) — null = chưa có, bị tính critical */
  ngay_nop_ho_so: string | null;
}

export interface DuplicateSet {
  cccdMap: Map<string, number[]>;
  sdtMap: Map<string, number[]>;
  emailMap: Map<string, number[]>;
}

export interface RaSoatResult {
  thisinh_id: number;
  trang_thai: TrangThaiRaSoat;
  diem_uu_tien: number; // 0-100
  issues: RaSoatIssue[];
}

/**
 * Check 1 thí sinh với context trùng lặp (đã được query sẵn cho cả kỳ)
 * + optional isWhitelistedMon để check whitelist môn-chuyên ngành từ DB.
 */
export function evaluateThiSinh(
  ts: RaSoatThiSinhInput,
  dup: DuplicateSet,
  isWhitelistedMon?: (mon: string, chuyenNganh: string) => boolean
): RaSoatResult {
  const issues: RaSoatIssue[] = [];

  // 1. Field bắt buộc (40đ/loại) — nghiêm trọng
  if (!ts.cccd || ts.cccd.trim() === '') {
    issues.push({
      code: 'MISSING_CCCD', field: 'cccd',
      message: 'Thiếu số CCCD', severity: 'critical', diemTru: 40
    });
  }
  if (!ts.dien_thoai || ts.dien_thoai.trim() === '') {
    issues.push({
      code: 'MISSING_SDT', field: 'dien_thoai',
      message: 'Thiếu số điện thoại', severity: 'critical', diemTru: 20
    });
  }
  if (!ts.ngay_sinh) {
    issues.push({
      code: 'MISSING_NGAY_SINH', field: 'ngay_sinh',
      message: 'Thiếu ngày sinh', severity: 'critical', diemTru: 30
    });
  }
  if (!ts.vi_tri_dang_ky_id) {
    issues.push({
      code: 'MISSING_VI_TRI', field: 'vi_tri_dang_ky_id',
      message: 'Chưa chọn vị trí ứng tuyển', severity: 'critical', diemTru: 40
    });
  }

  // 2. Format (20đ/loại) — cảnh báo
  if (ts.cccd && !/^\d{9,12}$/.test(ts.cccd.trim())) {
    issues.push({
      code: 'INVALID_CCCD_FORMAT', field: 'cccd',
      message: `CCCD "${ts.cccd}" không đúng định dạng (9-12 số)`,
      severity: 'warning', diemTru: 20
    });
  }
  if (ts.dien_thoai && !/^0\d{9,10}$/.test(ts.dien_thoai.trim().replace(/[\s.+-]/g, ''))) {
    issues.push({
      code: 'INVALID_SDT_FORMAT', field: 'dien_thoai',
      message: `SĐT "${ts.dien_thoai}" không đúng định dạng (10-11 số, bắt đầu bằng 0)`,
      severity: 'warning', diemTru: 15
    });
  }
  if (ts.email && ts.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ts.email.trim())) {
    issues.push({
      code: 'INVALID_EMAIL_FORMAT', field: 'email',
      message: `Email "${ts.email}" không đúng định dạng`,
      severity: 'warning', diemTru: 10
    });
  }

  // 3. Trùng lặp (30đ/loại) — cảnh báo cao
  if (ts.cccd) {
    const dupArr = dup.cccdMap.get(ts.cccd.trim());
    if (dupArr && dupArr.length > 1) {
      issues.push({
        code: 'DUPLICATE_CCCD', field: 'cccd',
        message: `CCCD trùng với ${dupArr.length - 1} hồ sơ khác trong kỳ`,
        severity: 'warning', diemTru: 30
      });
    }
  }
  if (ts.dien_thoai) {
    const sdt = ts.dien_thoai.trim().replace(/[\s.+-]/g, '');
    const dupArr = dup.sdtMap.get(sdt);
    if (dupArr && dupArr.length > 1) {
      issues.push({
        code: 'DUPLICATE_SDT', field: 'dien_thoai',
        message: `SĐT trùng với ${dupArr.length - 1} hồ sơ khác trong kỳ`,
        severity: 'warning', diemTru: 25
      });
    }
  }
  if (ts.email) {
    const email = ts.email.trim().toLowerCase();
    const dupArr = dup.emailMap.get(email);
    if (dupArr && dupArr.length > 1) {
      issues.push({
        code: 'DUPLICATE_EMAIL', field: 'email',
        message: `Email trùng với ${dupArr.length - 1} hồ sơ khác trong kỳ`,
        severity: 'warning', diemTru: 20
      });
    }
  }

  // 4. Chuyên môn (25đ) — cảnh báo nếu vị trí giáo viên mà thiếu NVSP hoặc thiếu chuyên ngành
  const isGiaoVien = (ts.loai_vi_tri ?? '').toLowerCase() === 'giaovien'
    || ts.loai_vi_tri === 'GiaoVien';
  if (isGiaoVien) {
    if (ts.co_chung_chi_nvsp !== 1) {
      issues.push({
        code: 'MISSING_NVSP', field: 'co_chung_chi_nvsp',
        message: 'Vị trí giáo viên nhưng chưa có chứng chỉ NVSP',
        severity: 'warning', diemTru: 25
      });
    }
    if (!ts.chuyen_nganh || ts.chuyen_nganh.trim() === '') {
      issues.push({
        code: 'MISSING_CHUYEN_NGANH', field: 'chuyen_nganh',
        message: 'Vị trí giáo viên nhưng chưa nhập chuyên ngành đào tạo',
        severity: 'warning', diemTru: 15
      });
    }
    if (!ts.ten_truong_dao_tao || ts.ten_truong_dao_tao.trim() === '') {
      issues.push({
        code: 'MISSING_TRUONG', field: 'ten_truong_dao_tao',
        message: 'Chưa nhập tên trường đào tạo',
        severity: 'warning', diemTru: 10
      });
    }
  }

  // 5. Dân tộc (10đ) — cần cho NĐ 179/2024 xét đối tượng ưu tiên
  if (!ts.dan_toc || ts.dan_toc.trim() === '') {
    issues.push({
      code: 'MISSING_DAN_TOC', field: 'dan_toc',
      message: 'Thiếu thông tin dân tộc (cần cho NĐ 179/2024)',
      severity: 'warning', diemTru: 10
    });
  }

  // 6. Ngày nộp hồ sơ (30đ) — nghiêm trọng vì ảnh hưởng deadline
  if (!ts.ngay_nop_ho_so || ts.ngay_nop_ho_so.trim() === '') {
    issues.push({
      code: 'MISSING_NGAY_NOP', field: 'ngay_nop_ho_so',
      message: 'Thiếu ngày nộp hồ sơ',
      severity: 'critical', diemTru: 30
    });
  }

  // 7. Chuyên ngành khớp môn vị trí (5đ) — 2 lớp check:
  //   Lớp 1: whitelist trong DB (table mon_chuyen_nganh_map) do admin cấu hình
  //   Lớp 2: fallback keyword match (substring) — giữ để bắt case chưa được admin thêm
  if (isGiaoVien && ts.chuyen_nganh && ts.mon) {
    // Kiểm tra whitelist trong DB trước
    const isInWhitelist = isWhitelistedMon?.(ts.mon, ts.chuyen_nganh) ?? false;

    if (!isInWhitelist) {
      // Fallback: keyword match
      const monKeywords = (ts.mon || '')
        .toLowerCase()
        .split(/[\s,/()\-]+/)
        .filter(w => w.length >= 3);
      const cnKeywords = (ts.chuyen_nganh || '')
        .toLowerCase()
        .split(/[\s,/()\-]+/)
        .filter(w => w.length >= 3);
      const hasOverlap = monKeywords.some(k => cnKeywords.some(c => c.includes(k) || k.includes(c)));
      if (!hasOverlap) {
        issues.push({
          code: 'CHUYEN_NGANH_KHONG_KHOP', field: 'chuyen_nganh',
          message: `Chuyên ngành "${ts.chuyen_nganh}" có thể không khớp môn vị trí "${ts.mon}". Có thể thêm vào whitelist ở Cài đặt > Môn - Chuyên ngành.`,
          severity: 'warning', diemTru: 5
        });
      }
    }
  }

  // Tính điểm
  const diemTru = issues.reduce((s, i) => s + i.diemTru, 0);
  const diem_uu_tien = Math.max(0, 100 - diemTru);

  // Phân loại
  const hasCritical = issues.some(i => i.severity === 'critical');
  const trang_thai: TrangThaiRaSoat = hasCritical
    ? 'KhongDat'
    : diem_uu_tien >= 80
      ? 'Dat'
      : 'CanhBao';

  return { thisinh_id: ts.id, trang_thai, diem_uu_tien, issues };
}

/**
 * Build duplicate maps từ danh sách thí sinh trong kỳ (gọi 1 lần trước khi loop).
 * Tối  ưu: không query N lần, chỉ 1 lần.
 */
export function buildDuplicateSets(
  thisinhs: Array<Pick<RaSoatThiSinhInput, 'id' | 'cccd' | 'dien_thoai' | 'email'>>
): DuplicateSet {
  const cccdMap = new Map<string, number[]>();
  const sdtMap = new Map<string, number[]>();
  const emailMap = new Map<string, number[]>();

  for (const ts of thisinhs) {
    if (ts.cccd) {
      const k = ts.cccd.trim();
      if (k) cccdMap.set(k, [...(cccdMap.get(k) ?? []), ts.id]);
    }
    if (ts.dien_thoai) {
      const k = ts.dien_thoai.trim().replace(/[\s.+-]/g, '');
      if (k) sdtMap.set(k, [...(sdtMap.get(k) ?? []), ts.id]);
    }
    if (ts.email) {
      const k = ts.email.trim().toLowerCase();
      if (k) emailMap.set(k, [...(emailMap.get(k) ?? []), ts.id]);
    }
  }

  return { cccdMap, sdtMap, emailMap };
}

/**
 * Summary cho toàn kỳ — dùng cho modal preview.
 */
export interface RaSoatSummary {
  tong: number;
  dat: number;
  canhBao: number;
  khongDat: number;
}

export function summarize(results: RaSoatResult[]): RaSoatSummary {
  return results.reduce<RaSoatSummary>(
    (acc, r) => {
      acc.tong++;
      if (r.trang_thai === 'Dat') acc.dat++;
      else if (r.trang_thai === 'CanhBao') acc.canhBao++;
      else acc.khongDat++;
      return acc;
    },
    { tong: 0, dat: 0, canhBao: 0, khongDat: 0 }
  );
}
