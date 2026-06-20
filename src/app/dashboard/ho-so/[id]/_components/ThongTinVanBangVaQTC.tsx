/**
 * Văn bằng 2 (Mục 2) + Quá trình công tác — read-only từ bảng phụ
 * File: src/app/dashboard/ho-so/[id]/_components/ThongTinVanBangVaQTC.tsx
 */
'use client';
import { GraduationCap, Clock } from 'lucide-react';
import type { VanBangItem, QtcItem } from '../form-types';

interface Props {
  vanBang: VanBangItem[];
  qtc: QtcItem[];
}

const VB_FIELDS: Array<{ key: keyof Omit<VanBangItem, 'thu_tu'>; label: string }> = [
  { key: 'ten_truong', label: 'Tên trường' },
  { key: 'ngay_cap', label: 'Ngày cấp' },
  { key: 'trinh_do', label: 'Trình độ' },
  { key: 'so_hieu', label: 'Số hiệu' },
  { key: 'chuyen_nganh', label: 'Chuyên ngành' },
  { key: 'hinh_thuc', label: 'Hình thức' },
  { key: 'nganh', label: 'Ngành' },
  { key: 'xep_loai', label: 'Xếp loại' }
];

const QTC_FIELDS: Array<{ key: keyof Omit<QtcItem, 'thu_tu'>; label: string }> = [
  { key: 'tu_ngay', label: 'Từ ngày' },
  { key: 'den_ngay', label: 'Đến ngày' },
  { key: 'co_quan', label: 'Cơ quan / Đơn vị công tác' }
];

export function ThongTinVanBangVaQTC({ vanBang, qtc }: Props) {
  return (
    <div className="space-y-4">
      {/* Văn bằng 2 */}
      <div>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <GraduationCap size={14} /> Văn bằng 2 (Mục 2)
        </h4>
        {vanBang.length === 0 ? (
          <p className="text-sm italic text-slate-400">Không có văn bằng 2</p>
        ) : (
          <div className="space-y-2">
            {vanBang.map((vb) => (
              <div key={vb.thu_tu} className="rounded-md border border-slate-200 bg-white p-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {VB_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex flex-col">
                      <span className="text-xs font-medium text-slate-500">{label}</span>
                      <span className="break-words text-sm text-slate-800">
                        {vb[key] || <span className="text-slate-400">—</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quá trình công tác */}
      <div>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Clock size={14} /> Quá trình công tác
        </h4>
        {qtc.length === 0 ? (
          <p className="text-sm italic text-slate-400">Chưa có quá trình công tác</p>
        ) : (
          <div className="space-y-2">
            {qtc.map((q) => (
              <div key={q.thu_tu} className="rounded-md border border-slate-200 bg-white p-3">
                <div className="mb-1 text-xs font-semibold text-slate-600">Lần {q.thu_tu}</div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {QTC_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex flex-col">
                      <span className="text-xs font-medium text-slate-500">{label}</span>
                      <span className="break-words text-sm text-slate-800">
                        {q[key] || <span className="text-slate-400">—</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
