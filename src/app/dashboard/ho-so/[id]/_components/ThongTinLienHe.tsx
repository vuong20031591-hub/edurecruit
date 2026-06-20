'use client';
import { Input, DateInput } from '@/shared/components';
import type { FormValues } from '../form-types';

interface Props {
  form: FormValues;
  onChange: (patch: Partial<FormValues>) => void;
  editing: boolean;
}

export function ThongTinLienHe({ form, onChange, editing }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Input
        label="Số CCCD"
        value={form.cccd}
        disabled={!editing}
        placeholder="12 chữ số"
        maxLength={12}
        onChange={e => onChange({ cccd: e.target.value })}
      />
      <DateInput
        label="Ngày cấp CCCD"
        value={form.ngay_cap_cccd}
        disabled={!editing}
        onChange={v => onChange({ ngay_cap_cccd: v })}
      />
      <div className="md:col-span-2">
        <Input
          label="Nơi cấp CCCD"
          value={form.noi_cap_cccd}
          disabled={!editing}
          placeholder="Công an tỉnh/thành phố..."
          onChange={e => onChange({ noi_cap_cccd: e.target.value })}
        />
      </div>
      <Input
        label="Số điện thoại"
        value={form.dien_thoai}
        disabled={!editing}
        required
        placeholder="VD: 0368711389"
        onChange={e => onChange({ dien_thoai: e.target.value })}
      />
      <Input
        label="Email"
        type="email"
        value={form.email}
        disabled={!editing}
        placeholder="VD: example@gmail.com"
        onChange={e => onChange({ email: e.target.value })}
      />
    </div>
  );
}
