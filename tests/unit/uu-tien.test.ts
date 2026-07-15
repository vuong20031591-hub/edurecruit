import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock @/db trước khi import module cần test
const dbGet = vi.fn();
vi.mock('@/db', () => ({
  getDb: () => ({
    prepare: () => ({
      get: (...args: unknown[]) => dbGet(...args),
    }),
  }),
}));

// Import sau khi mock
import { computeDiemUuTien, getUuTienMapping } from '../../src/modules/diemthi/uu-tien';

beforeEach(() => {
  vi.resetAllMocks();
  dbGet.mockReturnValue(undefined); // Mặc định: không có row trong system_config
});

describe('computeDiemUuTien - mapping mặc định (fallback khi không có config)', () => {

  it('trả về 0 khi không có đối tượng ưu tiên', () => {
    expect(computeDiemUuTien(null)).toBe(0);
    expect(computeDiemUuTien(undefined)).toBe(0);
    expect(computeDiemUuTien('')).toBe(0);
    expect(computeDiemUuTien('   ')).toBe(0);
  });

  it('trả về 0 khi không khớp keyword nào', () => {
    expect(computeDiemUuTien('không liên quan gì cả')).toBe(0);
    expect(computeDiemUuTien('sinh viên')).toBe(0);
  });

  it('match 7.5 điểm cho anh hùng / thương binh', () => {
    expect(computeDiemUuTien('anh hùng lực lượng vũ trang')).toBe(7.5);
    expect(computeDiemUuTien('thương binh hạng 4')).toBe(7.5);
    expect(computeDiemUuTien('người hưởng chính sách như thương binh')).toBe(7.5);
    expect(computeDiemUuTien('bệnh binh')).toBe(7.5);
  });

  it('match 5 điểm cho dân tộc thiểu số / con liệt sĩ / sĩ quan xuất ngũ', () => {
    expect(computeDiemUuTien('dân tộc thiểu số')).toBe(5);
    expect(computeDiemUuTien('con liệt sĩ')).toBe(5);
    expect(computeDiemUuTien('sĩ quan xuất ngũ')).toBe(5);
    expect(computeDiemUuTien('quân nhân xuất ngũ')).toBe(5);
    expect(computeDiemUuTien('chứng chỉ kỹ năng nghề bậc 4')).toBe(5);
    expect(computeDiemUuTien('làm việc 36 tháng')).toBe(5);
  });

  it('match 7.5 điểm cho các cụm từ con/thương binh vì rule 7.5 khớp trước', () => {
    expect(computeDiemUuTien('con thương binh')).toBe(7.5);
    expect(computeDiemUuTien('con bệnh binh')).toBe(7.5);
  });

  it('match 2.5 điểm cho nghĩa vụ quân sự / thanh niên xung phong', () => {
    expect(computeDiemUuTien('hoàn thành nghĩa vụ quân sự')).toBe(2.5);
    expect(computeDiemUuTien('nghĩa vụ công an')).toBe(2.5);
    expect(computeDiemUuTien('thanh niên xung phong')).toBe(2.5);
  });

  it('match 1.5 điểm cho cán bộ công đoàn', () => {
    expect(computeDiemUuTien('cán bộ công đoàn')).toBe(1.5);
  });

  it('lấy điểm cao nhất khi thuộc nhiều diện', () => {
    expect(computeDiemUuTien('dân tộc thiểu số, cán bộ công đoàn')).toBe(5);
    expect(computeDiemUuTien('thương binh, con liệt sĩ')).toBe(7.5);
    expect(computeDiemUuTien('thanh niên xung phong, cán bộ công đoàn')).toBe(2.5);
  });

  it('không phân biệt hoa/thường và khoảng trắng', () => {
    expect(computeDiemUuTien('DÂN TỘC THIỂU SỐ')).toBe(5);
    expect(computeDiemUuTien('  dân  tộc   thiểu  số  ')).toBe(5);
  });

  it('trả về 0 cho input không phải chuỗi', () => {
    expect(computeDiemUuTien(123 as unknown as string)).toBe(0);
    expect(computeDiemUuTien({} as unknown as string)).toBe(0);
  });
});

describe('computeDiemUuTien - đọc mapping từ system_config', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('dùng mapping custom từ DB khi có', () => {
    dbGet.mockReturnValue({
      value: JSON.stringify({
        combine: 'max',
        rules: [
          { score: 3.0, keywords: ['đặc cách'] },
        ],
      }),
    });
    expect(computeDiemUuTien('thí sinh đặc cách')).toBe(3.0);
  });

  it('combine = sum thì cộng tất cả', () => {
    dbGet.mockReturnValue({
      value: JSON.stringify({
        combine: 'sum',
        rules: [
          { score: 2.0, keywords: ['a'] },
          { score: 3.0, keywords: ['b'] },
        ],
      }),
    });
    expect(computeDiemUuTien('a và b')).toBe(5.0);
  });

  it('fallback về default khi JSON lỗi', () => {
    dbGet.mockReturnValue({ value: 'KHÔNG PHẢI JSON' });
    expect(computeDiemUuTien('dân tộc thiểu số')).toBe(5);
  });

  beforeEach(() => {
    vi.resetAllMocks();
    dbGet.mockReturnValue(undefined);
  });

  it('fallback về default khi config không có rules', () => {
    dbGet.mockReturnValue({ value: JSON.stringify({ combine: 'max', rules: [] }) });
    expect(computeDiemUuTien('dân tộc thiểu số')).toBe(5);
  });
});

describe('getUuTienMapping', () => {
  it('trả về mapping mặc định khi không có config', () => {
    dbGet.mockReturnValue(undefined);
    const m = getUuTienMapping();
    expect(m.combine).toBe('max');
    expect(m.rules.length).toBeGreaterThan(0);
    expect(m.rules[0].score).toBe(7.5);
  });

  it('parse mapping từ DB', () => {
    dbGet.mockReturnValue({
      value: JSON.stringify({
        combine: 'sum',
        rules: [{ score: 1.0, keywords: ['x'] }],
      }),
    });
    const m = getUuTienMapping();
    expect(m.combine).toBe('sum');
    expect(m.rules).toEqual([{ score: 1.0, keywords: ['x'] }]);
  });
});
