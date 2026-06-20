'use client';
import { useEffect, useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Save } from 'lucide-react';
import { Button, Input, Select, Textarea, toast } from '@/shared/components';
import { CapHoc, CapHocLabel } from '@/shared/constants/enums';
import type { CapHoc as CapHocType } from '@/db/schema';
import type { DonViView } from '@/modules/donvi/types';

interface DonViFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kyId: number;
  editing: DonViView | null;
  onSaved: (donvi: DonViView) => void;
}

interface FormState {
  ma_don_vi: string;
  ten_don_vi: string;
  cap_hoc: CapHocType | '';
  dia_chi: string;
  so_dien_thoai: string;
  nguoi_lien_he: string;
  ghi_chu: string;
}

const EMPTY_FORM: FormState = {
  ma_don_vi: '',
  ten_don_vi: '',
  cap_hoc: '',
  dia_chi: '',
  so_dien_thoai: '',
  nguoi_lien_he: '',
  ghi_chu: ''
};

const CAP_HOC_OPTIONS: { value: CapHocType; label: string }[] = (Object.keys(CapHoc) as CapHocType[]).map((k) => ({
  value: k,
  label: CapHocLabel[k] ?? k
}));

export function DonViFormModal({ open, onOpenChange, kyId, editing, onSaved }: DonViFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!editing;

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          ma_don_vi: editing.ma_don_vi,
          ten_don_vi: editing.ten_don_vi,
          cap_hoc: editing.cap_hoc,
          dia_chi: editing.dia_chi ?? '',
          so_dien_thoai: editing.so_dien_thoai ?? '',
          nguoi_lien_he: editing.nguoi_lien_he ?? '',
          ghi_chu: editing.ghi_chu ?? ''
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setErrors({});
    }
  }, [open, editing]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.ma_don_vi.trim()) next.ma_don_vi = 'Mã đơn vị không được để trống';
    else if (form.ma_don_vi.length > 50) next.ma_don_vi = 'Mã đơn vị tối đa 50 ký tự';
    if (!form.ten_don_vi.trim()) next.ten_don_vi = 'Tên đơn vị không được để trống';
    if (!form.cap_hoc) next.cap_hoc = 'Vui lòng chọn cấp học';
    if (form.so_dien_thoai.trim()) {
      const phone = form.so_dien_thoai.replace(/[\s.-]/g, '');
      if (!/^\+?\d{9,12}$/.test(phone)) next.so_dien_thoai = 'Số điện thoại không hợp lệ';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        ky_tuyendung_id: kyId,
        ma_don_vi: form.ma_don_vi.trim(),
        ten_don_vi: form.ten_don_vi.trim(),
        cap_hoc: form.cap_hoc as CapHocType,
        dia_chi: form.dia_chi.trim() || null,
        so_dien_thoai: form.so_dien_thoai.trim() || null,
        nguoi_lien_he: form.nguoi_lien_he.trim() || null,
        ghi_chu: form.ghi_chu.trim() || null
      };

      const url = isEdit ? `/api/donvi/${editing!.id}` : '/api/donvi';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const result: DonViView = await res.json();
      toast.success(isEdit ? 'Cập nhật đơn vị thành công' : 'Tạo đơn vị thành công');
      onSaved(result);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu đơn vị');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl focus:outline-none">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-slate-900">
                {isEdit ? 'Sửa đơn vị tuyển dụng' : 'Thêm đơn vị tuyển dụng'}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-slate-500">
                {isEdit ? 'Cập nhật thông tin đơn vị' : 'Tạo đơn vị mới trong kỳ hiện tại'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Mã đơn vị"
                required
                value={form.ma_don_vi}
                onChange={(e) => update('ma_don_vi', e.target.value)}
                error={errors.ma_don_vi}
                placeholder="VD: THPT-LS-01"
                maxLength={50}
              />
              <Select
                label="Cấp học"
                required
                value={form.cap_hoc}
                onChange={(e) => update('cap_hoc', e.target.value as CapHocType | '')}
                error={errors.cap_hoc}
              >
                <option value="">-- Chọn cấp học --</option>
                {CAP_HOC_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <Input
              label="Tên đơn vị"
              required
              value={form.ten_don_vi}
              onChange={(e) => update('ten_don_vi', e.target.value)}
              error={errors.ten_don_vi}
              placeholder="VD: Trường THPT Lạng Sơn"
            />

            <Input
              label="Địa chỉ"
              value={form.dia_chi}
              onChange={(e) => update('dia_chi', e.target.value)}
              placeholder="Số nhà, đường, phường/xã, tỉnh"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Số điện thoại"
                value={form.so_dien_thoai}
                onChange={(e) => update('so_dien_thoai', e.target.value)}
                error={errors.so_dien_thoai}
                placeholder="VD: 0205381234"
                inputMode="tel"
              />
              <Input
                label="Người liên hệ"
                value={form.nguoi_lien_he}
                onChange={(e) => update('nguoi_lien_he', e.target.value)}
                placeholder="Họ tên người phụ trách"
              />
            </div>

            <Textarea
              label="Ghi chú"
              value={form.ghi_chu}
              onChange={(e) => update('ghi_chu', e.target.value)}
              placeholder="Ghi chú thêm (nếu có)"
              rows={3}
            />

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Hủy
              </Button>
              <Button type="submit" loading={submitting} leftIcon={<Save size={14} />}>
                {isEdit ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
