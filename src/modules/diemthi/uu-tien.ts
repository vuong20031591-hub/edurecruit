/**
 * Tính điểm ưu tiên từ trường đối tượng ưu tiên trong hồ sơ đăng ký.
 * Quy tắc mặc định theo Nghị định 179/2024 / quy định của Hội đồng tuyển dụng:
 *   - 7.5 điểm: Anh hùng, thương binh, người hưởng chính sách như thương binh.
 *   - 5.0 điểm: Dân tộc thiểu số, sĩ quan/quân nhân xuất ngũ, con liệt sĩ/thương binh/bệnh binh,
 *               chứng chỉ kỹ năng nghề bậc 4 trở lên, kinh nghiệm 36 tháng trở lên.
 *   - 2.5 điểm: Hoàn thành nghĩa vụ quân sự/công an, thanh niên xung phong.
 *   - 1.5 điểm: Cán bộ công đoàn.
 * Nếu thí sinh thuộc nhiều diện, lấy điểm cao nhất.
 *
 * Mapping được lưu trong system_config key `diemthi.uu_tien.mapping` dạng JSON.
 * Nếu chưa có config thì dùng giá trị mặc định ở trên (không hardcode rải rác trong code).
 */
import { getDb } from '@/db';

export interface UuTienRule {
  score: number;
  keywords: string[];
}

export interface UuTienMapping {
  rules: UuTienRule[];
  combine: 'max' | 'sum';
}

const DEFAULT_MAPPING: UuTienMapping = {
  combine: 'max',
  rules: [
    {
      score: 7.5,
      keywords: [
        'anh hùng',
        'thương binh',
        'hưởng chính sách như thương binh',
        'bệnh binh',
      ],
    },
    {
      score: 5.0,
      keywords: [
        'dân tộc thiểu số',
        'sĩ quan xuất ngũ',
        'quân nhân xuất ngũ',
        'con liệt sĩ',
        'con thương binh',
        'con bệnh binh',
        'chứng chỉ kỹ năng nghề bậc 4',
        '36 tháng',
      ],
    },
    {
      score: 2.5,
      keywords: [
        'hoàn thành nghĩa vụ quân sự',
        'nghĩa vụ công an',
        'thanh niên xung phong',
      ],
    },
    {
      score: 1.5,
      keywords: ['cán bộ công đoàn'],
    },
  ],
};

const CONFIG_KEY = 'diemthi.uu_tien.mapping';

export function getUuTienMapping(): UuTienMapping {
  try {
    const row = getDb()
      .prepare('SELECT value FROM system_config WHERE key = ?')
      .get(CONFIG_KEY) as { value: string } | undefined;
    if (row?.value) {
      const parsed = JSON.parse(row.value) as UuTienMapping;
      if (Array.isArray(parsed.rules) && parsed.rules.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback về default nếu JSON lỗi hoặc DB chưa có key.
  }
  return DEFAULT_MAPPING;
}

export function computeDiemUuTien(doiTuongUuTien: string | null | undefined): number {
  if (!doiTuongUuTien || typeof doiTuongUuTien !== 'string') return 0;
  // Chuẩn hóa: lowercase + gom nhiều khoảng trắng thành 1 dấu cách + trim
  const normalized = doiTuongUuTien.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!normalized) return 0;
  const mapping = getUuTienMapping();
  const matchedScores: number[] = [];

  for (const rule of mapping.rules) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        matchedScores.push(rule.score);
        break;
      }
    }
  }

  if (matchedScores.length === 0) return 0;
  return mapping.combine === 'sum'
    ? matchedScores.reduce((a, b) => a + b, 0)
    : Math.max(...matchedScores);
}
