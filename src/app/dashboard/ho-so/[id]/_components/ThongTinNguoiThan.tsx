/**
 * Thông tin người thân (bảng phụ 1-N) — read-only
 * File: src/app/dashboard/ho-so/[id]/_components/ThongTinNguoiThan.tsx
 */
'use client';
import { Users } from 'lucide-react';
import type { NguoiThanItem } from '../form-types';

interface Props {
  items: NguoiThanItem[];
}

const empty = (tu: 1 | 2 | 3): NguoiThanItem => ({
  thu_tu: tu, moi_quan_he: '', ho_ten: '', ngay_sinh: '', thong_tin_khac: ''
});

const FIELD_LABELS: Array<{ key: keyof Omit<NguoiThanItem, 'thu_tu'>; label: string }> = [
  { key: 'moi_quan_he', label: 'Mối quan hệ' },
  { key: 'ho_ten', label: 'Họ và tên' },
  { key: 'ngay_sinh', label: 'Ngày sinh' },
  { key: 'thong_tin_khac', label: 'Quê quán / Nghề nghiệp / Chức danh / Đơn vị / Nơi ở' }
];

export function ThongTinNguoiThan({ items }: Props) {
  // Luôn hiển thị 3 ô (1, 2, 3) — nếu không có data thì để trống
  const byThuTu = new Map<number, NguoiThanItem>();
  for (const it of items) byThuTu.set(it.thu_tu, it);
  const rows: NguoiThanItem[] = [1, 2, 3].map((tu) => byThuTu.get(tu) ?? empty(tu as 1 | 2 | 3));

  const hasAny = items.length > 0;

  return (
    <div className="space-y-3">
      {!hasAny && (
        <p className="text-sm italic text-slate-400">Chưa có thông tin người thân</p>
      )}
      {rows.map((row, idx) => {
        const empty = !row.ho_ten && !row.moi_quan_he && !row.ngay_sinh && !row.thong_tin_khac;
        return (
          <div
            key={row.thu_tu}
            className={`rounded-md border p-3 ${empty ? 'border-slate-200 bg-slate-50/50' : 'border-slate-200 bg-white'}`}
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Users size={14} />
              Người thân {row.thu_tu}
              {empty && <span className="text-xs font-normal italic text-slate-400">(trống)</span>}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {FIELD_LABELS.map(({ key, label }) => (
                <div key={key} className="flex flex-col">
                  <span className="text-xs font-medium text-slate-500">{label}</span>
                  <span className="break-words text-sm text-slate-800">
                    {row[key] || <span className="text-slate-400">—</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
