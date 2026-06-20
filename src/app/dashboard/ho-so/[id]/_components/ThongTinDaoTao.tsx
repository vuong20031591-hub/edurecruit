'use client';
import { Input, Select, SelectWithOther, DateInput } from '@/shared/components';
import { DoiTuongUuTienList } from '@/shared/constants/enums';
import { cn } from '@/shared/lib/cn';
import type { FormValues } from '../form-types';

interface Props {
  form: FormValues;
  onChange: (patch: Partial<FormValues>) => void;
  editing: boolean;
}

const XEP_LOAI_OPTIONS = ['Trung bình', 'TB Khá', 'Khá', 'Giỏi', 'Xuất sắc'];

// Trình độ chuyên môn — theo Luật GD nghề nghiệp 2014 + Luật GDĐH 2012
const TRINH_DO_CHUYEN_MON_OPTIONS = [
  'Sơ cấp',
  'Trung cấp',
  'Cao đẳng',
  'Đại học (Cử nhân)',
  'Đại học (Kỹ sư)',
  'Đại học (Bác sĩ)',
  'Đại học (Dược sĩ)',
  'Thạc sĩ',
  'Tiến sĩ'
];

export function ThongTinDaoTao({ form, onChange, editing }: Props) {
  function toggleUuTien(value: string) {
    const next = form.doi_tuong_uu_tien.includes(value)
      ? form.doi_tuong_uu_tien.filter(v => v !== value)
      : [...form.doi_tuong_uu_tien, value];
    onChange({ doi_tuong_uu_tien: next });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Input
            label="Tên trường đào tạo (Mục 1)"
            value={form.ten_truong_dao_tao}
            disabled={!editing}
            onChange={e => onChange({ ten_truong_dao_tao: e.target.value })}
          />
        </div>
        <SelectWithOther
          label="Trình độ chuyên môn"
          value={form.trinh_do_chuyen_mon}
          disabled={!editing}
          options={TRINH_DO_CHUYEN_MON_OPTIONS}
          placeholder="VD: Cử nhân Sư phạm Toán / Kỹ sư phần mềm"
          onChange={v => onChange({ trinh_do_chuyen_mon: v })}
        />
        <Input
          label="Chuyên ngành"
          value={form.chuyen_nganh}
          disabled={!editing}
          onChange={e => onChange({ chuyen_nganh: e.target.value })}
        />
        <Input
          label="Số hiệu văn bằng"
          value={form.so_hieu_van_bang}
          disabled={!editing}
          onChange={e => onChange({ so_hieu_van_bang: e.target.value })}
        />
        <DateInput
          label="Ngày cấp văn bằng"
          value={form.ngay_cap_van_bang}
          disabled={!editing}
          onChange={v => onChange({ ngay_cap_van_bang: v })}
        />
        <Input
          label="Hình thức đào tạo"
          value={form.hinh_thuc_dao_tao}
          disabled={!editing}
          placeholder="Chính quy / Vừa làm vừa học / Tại chức..."
          onChange={e => onChange({ hinh_thuc_dao_tao: e.target.value })}
        />
        <Input
          label="Ngành đào tạo"
          value={form.nganh_dao_tao}
          disabled={!editing}
          onChange={e => onChange({ nganh_dao_tao: e.target.value })}
        />
        <Input
          label="Năm tốt nghiệp"
          type="number"
          min={1970}
          max={2100}
          value={form.nam_tot_nghiep}
          disabled={!editing}
          onChange={e => onChange({ nam_tot_nghiep: e.target.value })}
        />
        <Select
          label="Xếp loại bằng"
          value={form.xep_loai_bang}
          disabled={!editing}
          onChange={e => onChange({ xep_loai_bang: e.target.value })}
        >
          <option value="">-- Chọn --</option>
          {XEP_LOAI_OPTIONS.map(v => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>
      </div>

      <label
        className={cn(
          'flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700',
          !editing && 'cursor-not-allowed opacity-60'
        )}
      >
        <input
          type="checkbox"
          checked={form.co_chung_chi_nvsp}
          disabled={!editing}
          onChange={e => onChange({ co_chung_chi_nvsp: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <span>Có chứng chỉ NVSP (Nghiệp vụ sư phạm)</span>
      </label>

      <div>
        <span className="mb-2 block text-sm font-medium text-slate-700">Đối tượng ưu tiên</span>
        <div className="flex flex-wrap gap-2">
          {DoiTuongUuTienList.map(opt => {
            const active = form.doi_tuong_uu_tien.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                disabled={!editing}
                onClick={() => toggleUuTien(opt.value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                  !editing && 'cursor-not-allowed opacity-60'
                )}
              >
                {opt.label}
              </button>
            );
          })}
          {form.doi_tuong_uu_tien.length === 0 && (
            <span className="text-xs italic text-slate-400">Chưa chọn đối tượng ưu tiên</span>
          )}
        </div>
      </div>
    </div>
  );
}
