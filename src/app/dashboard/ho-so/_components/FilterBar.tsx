'use client';
import { Search, X, RotateCcw } from 'lucide-react';
import { SelectDropdown, type SelectOption } from '@/shared/components/SelectDropdown';
import type { ThiSinhFilter } from '@/modules/hosso/types';
import { TrangThaiHoSo, TrangThaiHoSoLabel, type TrangThaiHoSoValue } from '@/shared/constants/enums';
import { buildViTriLabel } from '@/shared/lib/format';

export interface ViTriOption { id: number; mon: string; cap_hoc: string; loai_vi_tri?: string; }
export interface DonViOption { id: number; ten_don_vi: string; cap_hoc: string; }

export interface KyOption { id: number; ten_ky: string; nam: number; }

interface FilterBarProps {
  filter: ThiSinhFilter;
  onChange: (filter: ThiSinhFilter) => void;
  onReset: () => void;
  viTriList: ViTriOption[];
  donViList: DonViOption[];
  kyList: KyOption[];
  selectedKyId: number | null;
  onKyChange: (id: number | null) => void;
}

const TRANG_THAI_OPTIONS: SelectOption[] = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: TrangThaiHoSo.ChoRaSoat, label: TrangThaiHoSoLabel.ChoRaSoat },
  { value: TrangThaiHoSo.HopLe, label: TrangThaiHoSoLabel.HopLe },
  { value: TrangThaiHoSo.CanBoSung, label: TrangThaiHoSoLabel.CanBoSung },
  { value: TrangThaiHoSo.KhongDuDieuKien, label: TrangThaiHoSoLabel.KhongDuDieuKien },
  { value: TrangThaiHoSo.DaChinhSua, label: TrangThaiHoSoLabel.DaChinhSua },
];

export function FilterBar({
  filter,
  onChange,
  onReset,
  viTriList,
  donViList,
  kyList,
  selectedKyId,
  onKyChange,
}: FilterBarProps) {
  function update(patch: Partial<ThiSinhFilter>) {
    onChange({ ...filter, ...patch, page: 1 });
  }

  const viTriOptions: SelectOption[] = [
    { value: '', label: 'Tất cả vị trí' },
    ...viTriList.map(v => ({
      value: v.id,
      label: buildViTriLabel({
        loai_vi_tri: v.loai_vi_tri ?? 'GiaoVien',
        mon: v.mon,
        cap_hoc: v.cap_hoc
      }),
    })),
  ];

  const donViOptions: SelectOption[] = [
    { value: '', label: 'Tất cả đơn vị' },
    ...donViList.map(d => ({ value: d.id, label: d.ten_don_vi })),
  ];

  const kyOptions: SelectOption[] = [
    { value: '', label: 'Chọn năm tuyển dụng' },
    ...kyList.map(k => ({
      value: k.id,
      label: `Năm ${k.nam - 1}–${k.nam}`,
    })),
  ];

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={filter.search ?? ''}
          onChange={(e) => update({ search: e.target.value || undefined })}
          placeholder="Tìm theo CCCD / Họ tên / Mã hồ sơ..."
          className="block w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        {filter.search && (
          <button
            type="button"
            onClick={() => update({ search: undefined })}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Xóa tìm kiếm"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter dropdowns */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SelectDropdown
          value={selectedKyId ?? ''}
          onChange={(v) => onKyChange(v ? Number(v) : null)}
          options={kyOptions}
          aria-label="Lọc theo năm tuyển dụng"
        />

        <SelectDropdown
          value={(filter.trang_thai as string) ?? ''}
          onChange={(v) => update({ trang_thai: (v || undefined) as ThiSinhFilter['trang_thai'] })}
          options={TRANG_THAI_OPTIONS}
          aria-label="Lọc theo trạng thái"
        />

        <SelectDropdown
          value={filter.vi_tri_id ?? ''}
          onChange={(v) => update({ vi_tri_id: v ? Number(v) : undefined })}
          options={viTriOptions}
          aria-label="Lọc theo vị trí"
        />

        <SelectDropdown
          value={filter.don_vi_id ?? ''}
          onChange={(v) => update({ don_vi_id: v ? Number(v) : undefined })}
          options={donViOptions}
          aria-label="Lọc theo đơn vị"
        />

        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 transition-colors hover:bg-slate-50"
        >
          <RotateCcw size={14} />
          Đặt lại
        </button>
      </div>
    </div>
  );
}
