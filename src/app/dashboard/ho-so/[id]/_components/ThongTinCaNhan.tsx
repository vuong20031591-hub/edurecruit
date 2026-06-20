'use client';
import { Input, Select, SelectWithOther, DateInput } from '@/shared/components';
import { GioiTinhLabel } from '@/shared/constants/enums';
import type { GioiTinh } from '@/db/schema';
import type { FormValues } from '../form-types';

interface Props {
  form: FormValues;
  onChange: (patch: Partial<FormValues>) => void;
  editing: boolean;
}

const GIOI_TINH_OPTIONS: GioiTinh[] = ['Nam', 'Nu', 'Khac'];

// Trình độ văn hóa — theo Mẫu TT 15/2024/TT-BNV (phiếu dự tuyển viên chức):
// X/Y — X = số lớp đã học, Y = tổng số lớp cấp học (12 = GDPT 12 năm mới, 11 = hệ cũ THPT 4 năm, 9 = hệ cũ TH 5 năm)
const TRINH_DO_VAN_HOA_OPTIONS = [
  '12/12', '12/11', '12/10',
  '11/12', '11/11', '11/10',
  '10/12', '10/11', '10/10',
  '9/12', '9/11', '9/10', '9/9',
  '8/12', '8/11', '8/10',
  '7/12', '7/11', '7/10', '7/9',
  '6/12', '6/11', '6/10',
  '5/12', '5/11', '5/10', '5/9',
  '4/12', '4/11', '4/10', '4/9',
  '3/12', '3/11', '3/10', '3/9',
  '2/12', '2/11', '2/10', '2/9',
  '1/12', '1/11', '1/10', '1/9'
];

export function ThongTinCaNhan({ form, onChange, editing }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Input
        label="Họ"
        value={form.ho}
        disabled={!editing}
        required
        onChange={e => onChange({ ho: e.target.value })}
      />
      <Input
        label="Tên"
        value={form.ten}
        disabled={!editing}
        required
        onChange={e => {
          const ten = e.target.value;
          onChange({ ten, ho_ten: `${form.ho} ${ten}`.trim() });
        }}
      />
      <Input
        label="Họ và tên (tự động)"
        value={form.ho_ten}
        disabled
        hint="Tự động ghép từ Họ + Tên"
        onChange={() => undefined}
      />
      <DateInput
        label="Ngày sinh"
        value={form.ngay_sinh}
        disabled={!editing}
        required
        onChange={v => onChange({ ngay_sinh: v })}
      />
      <Select
        label="Giới tính"
        value={form.gioi_tinh}
        disabled={!editing}
        required
        onChange={e => onChange({ gioi_tinh: e.target.value as GioiTinh })}
      >
        <option value="">-- Chọn --</option>
        {GIOI_TINH_OPTIONS.map(v => (
          <option key={v} value={v}>
            {GioiTinhLabel[v]}
          </option>
        ))}
      </Select>
      <Input
        label="Dân tộc"
        value={form.dan_toc}
        disabled={!editing}
        onChange={e => onChange({ dan_toc: e.target.value })}
      />
      <Input
        label="Tôn giáo"
        value={form.ton_giao}
        disabled={!editing}
        onChange={e => onChange({ ton_giao: e.target.value })}
      />
      <Input
        label="Sức khỏe"
        value={form.suc_khoe}
        disabled={!editing}
        placeholder="Tốt / Trung bình / Yếu..."
        onChange={e => onChange({ suc_khoe: e.target.value })}
      />
      <Input
        label="Chiều cao (cm)"
        value={form.chieu_cao}
        disabled={!editing}
        onChange={e => onChange({ chieu_cao: e.target.value })}
      />
      <Input
        label="Cân nặng (kg)"
        value={form.can_nang}
        disabled={!editing}
        onChange={e => onChange({ can_nang: e.target.value })}
      />
      <SelectWithOther
        label="Trình độ văn hóa"
        value={form.trinh_do_van_hoa}
        disabled={!editing}
        options={TRINH_DO_VAN_HOA_OPTIONS}
        placeholder="VD: 8/12 (bỏ học từ lớp 8)"
        onChange={v => onChange({ trinh_do_van_hoa: v })}
      />
      <div className="md:col-span-2">
        <Input
          label="Hộ khẩu thường trú"
          value={form.ho_khau_thuong_tru}
          disabled={!editing}
          placeholder="Xã/Huyện - Tỉnh"
          onChange={e => onChange({ ho_khau_thuong_tru: e.target.value })}
        />
      </div>
      <div className="md:col-span-2">
        <Input
          label="Chỗ ở hiện nay (để báo tin)"
          value={form.cho_o_hien_nay}
          disabled={!editing}
          onChange={e => onChange({ cho_o_hien_nay: e.target.value })}
        />
      </div>
    </div>
  );
}
