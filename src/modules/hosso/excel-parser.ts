/**
 * hosso module - excel parser
 * Parse file Excel mẫu thành rows[] chuẩn hoá theo domain model.
 *
 * Hỗ trợ 2 format:
 *  - "Phiếu đăng ký dự tuyển (Google Form)" — sheet name có chứa
 *    "Câu trả lời biểu mẫu" hoặc header A1 = "Dấu thời gian".
 *  - "DS DU THI" (Sở GDĐT format cũ) — group-header based.
 *
 * File: src/modules/hosso/excel-parser.ts
 */
import ExcelJS from 'exceljs';

// ============================================================================
// Public types
// ============================================================================

export interface ImportRow {
  // Thông tin cá nhân
  ho: string | null;
  ten: string | null;
  ho_ten: string | null;
  ngay_sinh: string | null;       // yyyy-MM-dd
  gioi_tinh: string | null;       // 'Nam' | 'Nu' | 'Khac' (đã normalize, không dấu)
  dan_toc: string | null;
  ton_giao: string | null;
  suc_khoe: string | null;
  chieu_cao: string | null;
  can_nang: string | null;
  cccd: string | null;
  ngay_cap_cccd: string | null;
  noi_cap_cccd: string | null;
  dien_thoai: string | null;
  email: string | null;
  ho_khau_thuong_tru: string | null;
  cho_o_hien_nay: string | null;
  trinh_do_van_hoa: string | null;
  // Đào tạo
  trinh_do_chuyen_mon: string | null;
  ten_truong_dao_tao: string | null;
  chuyen_nganh: string | null;
  nganh_dao_tao: string | null;
  hinh_thuc_dao_tao: string | null;
  so_hieu_van_bang: string | null;
  ngay_cap_van_bang: string | null;
  nam_tot_nghiep: number | null;   // derived từ ngay_cap_van_bang
  xep_loai_bang: string | null;
  co_chung_chi_nvsp: number;       // 0/1
  // Quá trình công tác (raw; sẽ split thành bảng phụ ở service)
  qtc_1_tu_ngay: string | null;
  qtc_1_den_ngay: string | null;
  qtc_1_co_quan: string | null;
  qtc_2_tu_ngay: string | null;
  qtc_2_den_ngay: string | null;
  qtc_2_co_quan: string | null;
  // Người thân (raw; sẽ split thành bảng phụ ở service)
  nt_1_moi_quan_he: string | null;
  nt_1_ho_ten: string | null;
  nt_1_ngay_sinh: string | null;
  nt_1_thong_tin: string | null;
  nt_2_moi_quan_he: string | null;
  nt_2_ho_ten: string | null;
  nt_2_ngay_sinh: string | null;
  nt_2_thong_tin: string | null;
  nt_3_moi_quan_he: string | null;
  nt_3_ho_ten: string | null;
  nt_3_ngay_sinh: string | null;
  nt_3_thong_tin: string | null;
  // Văn bằng 2 (raw; sẽ split thành bảng phụ ở service)
  vb_2_ten_truong: string | null;
  vb_2_ngay_cap: string | null;
  vb_2_trinh_do: string | null;
  vb_2_so_hieu: string | null;
  vb_2_chuyen_nganh: string | null;
  vb_2_hinh_thuc: string | null;
  vb_2_nganh: string | null;
  vb_2_xep_loai: string | null;
  // Đăng ký
  vi_tri_ten: string | null;       // Tên vị trí NV1 — service lookup sang id
  ten_don_vi: string | null;       // Tên đơn vị NV1 — service lookup sang id
  co_dang_ky_nv2: number;          // 0/1
  vi_tri_ten_2: string | null;
  ten_don_vi_2: string | null;
  // Khác
  ngoai_ngu: string | null;
  ngoai_ngu_khac: string | null;
  mien_thi_nn: string | null;
  doi_tuong_uu_tien: string | null;
  cam_doan_thong_tin: string | null;
  ngay_nop_phieu: string | null;   // ISO date — Dấu thời gian Google Form
}

export type ImportFormat = 'google-form' | 'ds-du-thi' | 'unknown';
export type ImportFormatKnown = 'google-form' | 'ds-du-thi';

export interface ParseResult {
  format: ImportFormat;
  rows: ImportRow[];
  totalSheetRows: number;
  skippedHeaderRows: number;
  warnings: string[];
}

// ============================================================================
// Format detection
// ============================================================================

/**
 * Detect format dựa trên:
 *  1. Sheet name chứa "Câu trả lời biểu mẫu" (case-insensitive)
 *  2. Cell A1 = "Dấu thời gian" (signature của Google Form export)
 *  3. Sheet name "DS DU THI" hoặc row 8-10 chứa cụm "STT" "Họ" "Tên" (legacy)
 */
export function detectFormat(worksheet: ExcelJS.Worksheet): ImportFormat {
  const sheetName = (worksheet.name ?? '').toLowerCase();
  if (sheetName.includes('câu trả lời biểu mẫu') || sheetName.includes('cau tra loi bieu mau')) {
    return 'google-form';
  }
  const a1 = getCellText(worksheet.getRow(1).getCell(1));
  if (a1 && /^dấu thời gian$/i.test(a1.trim())) {
    return 'google-form';
  }
  // Legacy: check header ở row 8-10
  for (let r = 8; r <= 10; r++) {
    const c2 = getCellText(worksheet.getRow(r).getCell(2));
    const c3 = getCellText(worksheet.getRow(r).getCell(3));
    if (c3 && /^họ$/i.test(c3.trim()) && c2 && /^stt$/i.test(c2.trim())) {
      return 'ds-du-thi';
    }
  }
  // Last fallback: nếu col A1 rỗng nhưng col C1 bắt đầu bằng "Họ và tên" → Google Form
  const c1 = getCellText(worksheet.getRow(1).getCell(3));
  if (c1 && /họ và tên/i.test(c1)) return 'google-form';
  return 'unknown';
}

// ============================================================================
// Public API
// ============================================================================

export function parseWorksheet(worksheet: ExcelJS.Worksheet): ParseResult {
  const format = detectFormat(worksheet);
  if (format === 'google-form') return parseGoogleForm(worksheet);
  if (format === 'ds-du-thi') return parseDsDuThi(worksheet);
  return {
    format: 'unknown',
    rows: [],
    totalSheetRows: worksheet.actualRowCount,
    skippedHeaderRows: 0,
    warnings: [
      `Không nhận diện được định dạng file. Sheet "${worksheet.name}" không phải "Phiếu đăng ký (Google Form)" lẫn "DS DU THI" (Sở GDĐT). Hãy dùng đúng file mẫu.`
    ]
  };
}

// ============================================================================
// Google Form parser
// ============================================================================

/**
 * Sheet "Câu trả lời biểu mẫu 1" — 63 cột, row 1 = header, row 2+ = data.
 * Mỗi row là 1 thí sinh, có sẵn Vị trí (BB) + Đơn vị (BC) trong từng dòng.
 */
function parseGoogleForm(worksheet: ExcelJS.Worksheet): ParseResult {
  const warnings: string[] = [];
  const rows: ImportRow[] = [];

  // Build header map: headerText -> column index (1-based).
  // Dùng Map với key là FULL header (case-insensitive) — không conflict vì
  // "Vị trí việc làm dự tuyển" và "...dự tuyển 2" là 2 key khác nhau.
  // Normalize: strip ":" ở cuối key vì header Google Form có thể có hoặc không có ":"
  // (file thực tế ExcelJS trả "Họ và tên" — không có ":" — dù MCP Spreadsheet hiển thị có ":")
  const headerMap = new Map<string, number>();
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const text = getCellText(cell);
    if (text) {
      const key = text.trim().replace(/:$/, '').trim();
      // Nếu conflict, ưu tiên col đầu tiên (NV1 sẽ match trước NV2 nếu header gốc trùng exact)
      if (!headerMap.has(key)) headerMap.set(key, colNumber);
    }
  });
  // (get được define bên trong for loop, capture row)

  if (!headerMap.has('Họ và tên')) {
    warnings.push('Không tìm thấy cột "Họ và tên" ở row 1 — file có thể không phải mẫu Google Form chuẩn.');
  }

  // For each data row
  const totalRows = worksheet.actualRowCount;
  for (let r = 2; r <= totalRows; r++) {
    const row = worksheet.getRow(r);
    // Skip empty row
    if (rowIsEmpty(row)) continue;

    const get = (headerName: string): string | null => {
      const norm = headerName.trim().replace(/:$/, '').trim();
      const idx = headerMap.get(norm);
      if (idx == null) return null;
      return getCellText(row.getCell(idx));
    };

    const hoTen = get('Họ và tên:');
    const { ho, ten } = splitHoTen(hoTen);

    const ngaySinhRaw = get('Ngày, tháng, năm sinh:');
    const ngaySinh = normalizeDate(ngaySinhRaw);

    const gioiTinhRaw = get('Giới tính:');
    const gioiTinh = normalizeGioiTinh(gioiTinhRaw);

    const ngayCapCCCDRaw = get('Ngày cấp:');
    const ngayCapCCCD = normalizeDate(ngayCapCCCDRaw);

    const ngayCapVBRaw = get('Ngày cấp văn bằng/chứng chỉ - Mục 1');
    const ngayCapVB = normalizeDate(ngayCapVBRaw);
    const namTotNghiep = ngayCapVB ? extractYear(ngayCapVB) : null;

    const ngaySinhNT1 = normalizeDate(get('Ngày, tháng, năm sinh - Người thân 1:'));
    const ngaySinhNT2 = normalizeDate(get('Ngày, tháng, năm sinh - Người thân 2:'));
    const ngaySinhNT3 = normalizeDate(get('Ngày, tháng, năm sinh - Người thân 3:'));
    const ngayCapVB2 = normalizeDate(get('Ngày cấp văn bằng/chứng chỉ - Mục 2'));

    const coDangKyNV2Raw = get('Có đăng ký nguyện vọng 2 không?');
    const coDangKyNV2 = coDangKyNV2Raw && /có|có$|yes|^x$/i.test(coDangKyNV2Raw.trim()) ? 1 : 0;

    const ngayNopPhieuRaw = get('Dấu thời gian');
    const ngayNopPhieu = normalizeDate(ngayNopPhieuRaw);

    rows.push({
      // Cá nhân
      ho,
      ten,
      ho_ten: hoTen,
      ngay_sinh: ngaySinh,
      gioi_tinh: gioiTinh,
      dan_toc: get('Dân tộc:'),
      ton_giao: get('Tôn giáo:'),
      suc_khoe: get('Tình trạng sức khỏe:'),
      chieu_cao: get('Chiều cao:'),
      can_nang: get('Cân nặng:'),
      cccd: get('Số CMND hoặc Thẻ căn cước công dân:'),
      ngay_cap_cccd: ngayCapCCCD,
      noi_cap_cccd: get('Nơi cấp:'),
      dien_thoai: get('Số điện thoại di động:'),
      email: get('Địa chỉ email'),
      ho_khau_thuong_tru: get('Quê quán:'),
      cho_o_hien_nay: get('Chỗ ở hiện nay (để báo tin):'),
      trinh_do_van_hoa: get('Trình độ văn hóa:'),
      // Đào tạo
      trinh_do_chuyen_mon: get('Trình độ chuyên môn:'),
      ten_truong_dao_tao: get('Tên trường/cơ sở đào tạo cấp - Mục 1'),
      chuyen_nganh: get('Chuyên ngành đào tạo - Mục 1'),
      nganh_dao_tao: get('Ngành đào tạo - Mục 1'),
      hinh_thuc_dao_tao: get('Hình thức đào tạo - Mục 1'),
      so_hieu_van_bang: get('Số hiệu văn bằng/chứng chỉ - Mục 1'),
      ngay_cap_van_bang: ngayCapVB,
      nam_tot_nghiep: namTotNghiep,
      xep_loai_bang: get('Xếp loại bằng/chứng chỉ - Mục 1'),
      co_chung_chi_nvsp: 0,  // Không có trong form mẫu
      // QTC
      qtc_1_tu_ngay: normalizeDate(get('Từ ngày - Quá trình công tác 1')),
      qtc_1_den_ngay: normalizeDate(get('Đến ngày - Quá trình công tác 1')),
      qtc_1_co_quan: get('Cơ quan, tổ chức, đơn vị công tác - Mục 1'),
      qtc_2_tu_ngay: normalizeDate(get('Từ ngày - Quá trình công tác 2')),
      qtc_2_den_ngay: normalizeDate(get('Đến ngày - Quá trình công tác 2')),
      qtc_2_co_quan: get('Cơ quan, tổ chức, đơn vị công tác - Mục 2'),
      // Người thân
      nt_1_moi_quan_he: get('Mối quan hệ - Người thân 1:'),
      nt_1_ho_ten: get('Họ và tên - Người thân 1:'),
      nt_1_ngay_sinh: ngaySinhNT1,
      nt_1_thong_tin: get('Quê quán, nghề nghiệp, chức danh, chức vụ, đơn vị công tác/học tập, nơi ở, tổ chức chính trị - xã hội - Người thân 1:'),
      nt_2_moi_quan_he: get('Mối quan hệ - Người thân 2:'),
      nt_2_ho_ten: get('Họ và tên - Người thân 2:'),
      nt_2_ngay_sinh: ngaySinhNT2,
      nt_2_thong_tin: get('Quê quán, nghề nghiệp, chức danh, chức vụ, đơn vị công tác/học tập, nơi ở, tổ chức chính trị - xã hội - Người thân 2:'),
      nt_3_moi_quan_he: get('Mối quan hệ - Người thân 3:'),
      nt_3_ho_ten: get('Họ và tên - Người thân 3:'),
      nt_3_ngay_sinh: ngaySinhNT3,
      nt_3_thong_tin: get('Quê quán, nghề nghiệp, chức danh, chức vụ, đơn vị công tác/học tập, nơi ở, tổ chức chính trị - xã hội - Người thân 3:'),
      // Văn bằng 2
      vb_2_ten_truong: get('Tên trường/cơ sở đào tạo cấp - Mục 2'),
      vb_2_ngay_cap: ngayCapVB2,
      vb_2_trinh_do: get('Trình độ văn bằng/chứng chỉ - Mục 2'),
      vb_2_so_hieu: get('Số hiệu văn bằng/chứng chỉ - Mục 2'),
      vb_2_chuyen_nganh: get('Chuyên ngành đào tạo - Mục 2'),
      vb_2_hinh_thuc: get('Hình thức đào tạo - Mục 2'),
      vb_2_nganh: get('Ngành đào tạo - Mục 2'),
      vb_2_xep_loai: get('Xếp loại bằng/chứng chỉ - Mục 2'),
      // Đăng ký
      vi_tri_ten: get('Vị trí việc làm dự tuyển'),
      ten_don_vi: get('Đơn vị dự tuyển'),
      co_dang_ky_nv2: coDangKyNV2,
      vi_tri_ten_2: get('Vị trí việc làm dự tuyển 2'),
      ten_don_vi_2: get('Đơn vị dự tuyển 2'),
      // Khác
      ngoai_ngu: get('Đăng ký dự thi ngoại ngữ'),
      ngoai_ngu_khac: get('Ngoại ngữ khác theo yêu cầu vị trí việc làm'),
      mien_thi_nn: get('Miễn thi ngoại ngữ do (nếu có)'),
      doi_tuong_uu_tien: get('Đối tượng ưu tiên (nếu có)'),
      cam_doan_thong_tin: get('Tôi cam đoan thông tin cung cấp trong phiếu đăng ký dự tuyển là đúng sự thật và chịu trách nhiệm trước pháp luật'),
      ngay_nop_phieu: ngayNopPhieu
    });
  }

  return {
    format: 'google-form',
    rows,
    totalSheetRows: totalRows,
    skippedHeaderRows: 1,
    warnings
  };
}

// ============================================================================
// DS DU THI parser (legacy — Sở GDĐT)
// ============================================================================

/**
 * Sheet "DS DU THI" — group-header based.
 * Row 1-10: header, Row 11+: data (xen kẽ group header)
 *  col2=STT | col3=Họ | col4=Tên | col5=Ngày sinh | col6=Giới tính
 *  col7=Dân tộc | col8=Hộ khẩu | col9=Trường | col10=Trình độ
 *  col11=Chuyên ngành | col12=Chứng chỉ NVSP | col13=Xếp loại bằng
 *  col15=Đối tượng ưu tiên | col16=Điện thoại | col17=Đơn vị dự tuyển
 * Group header row: col2 = tên vị trí (text, không phải số)
 */
function parseDsDuThi(worksheet: ExcelJS.Worksheet): ParseResult {
  const warnings: string[] = [];
  const rows: ImportRow[] = [];
  const totalRows = worksheet.actualRowCount;
  let currentViTri: string | null = null;
  let skippedHeader = 0;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 10) {
      skippedHeader = rowNumber;
      return;
    }
    if (isGroupHeaderRow(row)) {
      currentViTri = getCellText(row.getCell(2));
      return;
    }
    if (!isDataRow(row)) return;

    const ngaySinhRaw = getCellText(row.getCell(5));
    const ngaySinh = normalizeDate(ngaySinhRaw);

    const gioiTinhRaw = getCellText(row.getCell(6));
    const gioiTinh = normalizeGioiTinh(gioiTinhRaw);

    const ho = getCellText(row.getCell(3));
    const ten = getCellText(row.getCell(4));
    const hoTen = ho && ten ? `${ho} ${ten}`.trim() : (ho ?? ten);

    const nvspRaw = getCellText(row.getCell(12));
    const coNvsp = nvspRaw != null && /nvsp/i.test(nvspRaw) ? 1 : 0;

    rows.push({
      ho,
      ten,
      ho_ten: hoTen,
      ngay_sinh: ngaySinh,
      gioi_tinh: gioiTinh,
      dan_toc: getCellText(row.getCell(7)),
      ton_giao: null,
      suc_khoe: null,
      chieu_cao: null,
      can_nang: null,
      cccd: null,
      ngay_cap_cccd: null,
      noi_cap_cccd: null,
      dien_thoai: getCellText(row.getCell(16)),
      email: null,
      ho_khau_thuong_tru: getCellText(row.getCell(8)),
      cho_o_hien_nay: null,
      trinh_do_van_hoa: null,
      trinh_do_chuyen_mon: getCellText(row.getCell(10)),
      ten_truong_dao_tao: getCellText(row.getCell(9)),
      chuyen_nganh: getCellText(row.getCell(11)),
      nganh_dao_tao: null,
      hinh_thuc_dao_tao: null,
      so_hieu_van_bang: null,
      ngay_cap_van_bang: null,
      nam_tot_nghiep: null,
      xep_loai_bang: getCellText(row.getCell(13)),
      co_chung_chi_nvsp: coNvsp,
      qtc_1_tu_ngay: null,
      qtc_1_den_ngay: null,
      qtc_1_co_quan: null,
      qtc_2_tu_ngay: null,
      qtc_2_den_ngay: null,
      qtc_2_co_quan: null,
      nt_1_moi_quan_he: null,
      nt_1_ho_ten: null,
      nt_1_ngay_sinh: null,
      nt_1_thong_tin: null,
      nt_2_moi_quan_he: null,
      nt_2_ho_ten: null,
      nt_2_ngay_sinh: null,
      nt_2_thong_tin: null,
      nt_3_moi_quan_he: null,
      nt_3_ho_ten: null,
      nt_3_ngay_sinh: null,
      nt_3_thong_tin: null,
      vb_2_ten_truong: null,
      vb_2_ngay_cap: null,
      vb_2_trinh_do: null,
      vb_2_so_hieu: null,
      vb_2_chuyen_nganh: null,
      vb_2_hinh_thuc: null,
      vb_2_nganh: null,
      vb_2_xep_loai: null,
      vi_tri_ten: currentViTri,
      ten_don_vi: getCellText(row.getCell(17)),
      co_dang_ky_nv2: 0,
      vi_tri_ten_2: null,
      ten_don_vi_2: null,
      ngoai_ngu: null,
      ngoai_ngu_khac: null,
      mien_thi_nn: null,
      doi_tuong_uu_tien: getCellText(row.getCell(15)),
      cam_doan_thong_tin: null,
      ngay_nop_phieu: null
    });
  });

  return {
    format: 'ds-du-thi',
    rows,
    totalSheetRows: totalRows,
    skippedHeaderRows: skippedHeader,
    warnings
  };
}

// ============================================================================
// Helpers
// ============================================================================

function getCellText(cell: ExcelJS.Cell): string | null {
  let val: unknown = cell.value;
  if (val === null || val === undefined) return null;
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === 'object' && 'richText' in (val as Record<string, unknown>)) {
    const rt = (val as { richText: Array<{ text: string }> }).richText
      .map((r) => r.text)
      .join('')
      .trim();
    return rt || null;
  }
  if (typeof val === 'object' && 'text' in (val as Record<string, unknown>)) {
    const t = String((val as { text: unknown }).text).trim();
    return t || null;
  }
  if (typeof val === 'object' && 'result' in (val as Record<string, unknown>)) {
    const r = (val as { result: unknown }).result;
    if (r instanceof Date) return r.toISOString().slice(0, 10);
    if (r == null) return null;
    const t = String(r).trim();
    return t || null;
  }
  if (typeof val === 'number') {
    return Number.isFinite(val) ? String(val) : null;
  }
  const s = String(val).trim();
  return s || null;
}

function rowIsEmpty(row: ExcelJS.Row): boolean {
  // Empty if A..E all null/empty (heuristic — file mẫu có tới 63 cột)
  for (let c = 1; c <= Math.min(5, (row.cellCount || 5)); c++) {
    const v = getCellText(row.getCell(c));
    if (v) return false;
  }
  return true;
}

function isGroupHeaderRow(row: ExcelJS.Row): boolean {
  const col2 = getCellText(row.getCell(2));
  if (!col2) return false;
  if (/^\d+$/.test(col2)) return false;
  const col3 = getCellText(row.getCell(3));
  return col3 === col2;
}

function isDataRow(row: ExcelJS.Row): boolean {
  const col2 = getCellText(row.getCell(2));
  if (!col2) return false;
  return /^\d+$/.test(col2);
}

/**
 * Split "Nguyễn Văn A" → { ho: "Nguyễn Văn", ten: "A" }.
 * Nếu 1 từ → { ho: "", ten: "Nguyễn" }.
 * Nếu rỗng → { ho: null, ten: null }.
 */
function splitHoTen(hoTen: string | null): { ho: string | null; ten: string | null } {
  if (!hoTen) return { ho: null, ten: null };
  const trimmed = hoTen.trim().replace(/\s+/g, ' ');
  if (!trimmed) return { ho: null, ten: null };
  const parts = trimmed.split(' ');
  if (parts.length === 1) return { ho: '', ten: parts[0] };
  const ten = parts[parts.length - 1];
  const ho = parts.slice(0, -1).join(' ');
  return { ho, ten };
}

/**
 * Normalize ngày tháng về yyyy-MM-dd.
 * Input có thể là:
 *  - "2000-02-03" (ISO) → giữ nguyên
 *  - "03/02/2000" (DD/MM/YYYY) → "2000-02-03"
 *  - "3/2/2000" (D/M/YYYY)    → "2000-02-03"
 *  - "" / null → null
 */
function normalizeDate(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  // ISO yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // DD/MM/YYYY or D/M/YYYY
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    return `${m[3]}-${mo}-${d}`;
  }
  return null;
}

function extractYear(iso: string): number | null {
  const m = iso.match(/^(\d{4})/);
  if (!m) return null;
  const y = Number(m[1]);
  return Number.isFinite(y) && y >= 1970 && y <= 2100 ? y : null;
}

/**
 * Normalize giới tính từ Google Form text sang DB schema (không dấu).
 * DB CHECK: gioi_tinh IN ('Nam','Nu','Khac')
 */
function normalizeGioiTinh(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === 'nam' || v === 'male') return 'Nam';
  if (v === 'nữ' || v === 'nu' || v === 'female') return 'Nu';
  if (v === 'khác' || v === 'khac' || v === 'other') return 'Khac';
  return null;
}
