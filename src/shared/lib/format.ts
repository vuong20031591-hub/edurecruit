/**
 * Common formatting helpers
 * File: src/shared/lib/format.ts
 */
import { format, parseISO, parse, isValid } from 'date-fns';

export function formatDate(value: string | Date | null | undefined, pattern = 'dd/MM/yyyy'): string {
  if (!value) return '';
  const d = typeof value === 'string' ? parseISO(value) : value;
  if (!isValid(d)) return String(value);
  return format(d, pattern);
}

/**
 * Convert ISO date (yyyy-MM-dd) → dd/MM/yyyy cho input hiển thị
 */
export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return formatDate(iso, 'dd/MM/yyyy');
}

/**
 * Parse dd/MM/yyyy (hoặc yyyy-MM-dd fallback) → ISO yyyy-MM-dd để lưu DB.
 * Trả null nếu input rỗng hoặc không hợp lệ.
 */
export function fromDateInput(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Thử dd/MM/yyyy trước
  const d1 = parse(trimmed, 'dd/MM/yyyy', new Date());
  if (isValid(d1)) return format(d1, 'yyyy-MM-dd');
  // Fallback: yyyy-MM-dd
  const d2 = parseISO(trimmed);
  if (isValid(d2)) return format(d2, 'yyyy-MM-dd');
  return null;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, 'dd/MM/yyyy HH:mm');
}

export function formatNumber(value: number | string | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  if (isNaN(n)) return String(value);
  return n.toFixed(decimals).replace(/\.?0+$/, m => (m.includes('.') ? '' : m));
}

export function formatVietnameseNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0';
  const n = Number(value);
  if (isNaN(n)) return '0';
  return n.toLocaleString('vi-VN');
}

export function upperFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function truncate(s: string, max = 50): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export function initials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Build tên đầy đủ vị trí tuyển dụng theo format file mẫu Sở GDĐT.
 * Ví dụ: loai_vi_tri="GiaoVien", mon="Toán", cap_hoc="THPT"
 *   → "Giáo viên giảng dạy môn Toán THPT"
 *
 * Dùng cho cả export Excel (group header) và import lookup (reverse-match).
 */
export function buildViTriLabel(vitri: {
  loai_vi_tri: string;
  mon: string;
  cap_hoc: string;
}): string {
  const { loai_vi_tri, mon, cap_hoc } = vitri;
  const loai = (loai_vi_tri ?? '').trim().toLowerCase();

  if (loai === 'giaovien') {
    if (cap_hoc === 'MN') return `Giáo viên mầm non`;
    if (cap_hoc === 'GDTX') return `Giáo viên giảng dạy môn ${mon} (GDTX)`;
    // TH, THCS, THPT, THCS&THPT, DNTTHPT
    return `Giáo viên giảng dạy môn ${mon} ${cap_hoc}`;
  }
  if (loai === 'quanly') {
    return `Cán bộ quản lý ${cap_hoc}`;
  }
  // Fallback
  return `${mon} ${cap_hoc}`.trim();
}

/**
 * Tìm vitri trong danh sách theo tên đầy đủ từ file Excel.
 * Hỗ trợ exact match và partial match.
 *
 * Hỗ trợ cả 2 format nhãn:
 *  - "Giáo viên giảng dạy môn Toán THPT" (buildViTriLabel mặc định)
 *  - "Giáo viên giảng dạy môn Toán cấp THPT" (Google Form mẫu)
 */
export function matchViTriByLabel(
  label: string,
  list: Array<{ id: number; mon: string; cap_hoc: string; loai_vi_tri: string; ma_vi_tri: string }>
): number | null {
  if (!label || !list.length) return null;
  const norm = label.toLowerCase().trim();

  // Strip "cấp " trong nhãn input để so sánh cả 2 format
  // VD: "giáo viên giảng dạy môn ngữ văn cấp thpt" → "giáo viên giảng dạy môn ngữ văn thpt"
  const normStripped = norm.replace(/\s+cấp\s+/g, ' ');

  // Exact match với tên đầy đủ (cả 2 format)
  for (const v of list) {
    const full = buildViTriLabel(v).toLowerCase();
    if (full === norm || full === normStripped) return v.id;
  }

  // Partial: tên đầy đủ chứa label hoặc label chứa tên đầy đủ
  for (const v of list) {
    const full = buildViTriLabel(v).toLowerCase();
    if (norm.includes(full) || full.includes(norm) || normStripped.includes(full) || full.includes(normStripped)) {
      return v.id;
    }
  }

  // Fallback: label chứa mon + cap_hoc (ưu tiên exact cap_hoc, sau đó mới contains)
  // Thử tìm match với cả mon + cap_hoc trước
  for (const v of list) {
    const monLower = v.mon.toLowerCase();
    const capLower = v.cap_hoc.toLowerCase();
    if (norm.includes(monLower) && norm.includes(capLower)) return v.id;
  }
  // Cuối cùng: chỉ cần mon match (kém chính xác, tránh dùng nếu đã có kết quả ở trên)
  // → không làm, trả null để tránh sai

  return null;
}
