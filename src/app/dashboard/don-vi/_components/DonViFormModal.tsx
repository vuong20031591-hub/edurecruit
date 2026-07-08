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
  so_chi_tieu: string;
}

interface ViTriOption {
  id: number;
  ma_vi_tri: string;
  mon: string;
  cap_hoc: CapHocType;
}

const EMPTY_FORM: FormState = {
  ma_don_vi: '',
  ten_don_vi: '',
  cap_hoc: '',
  dia_chi: '',
  so_dien_thoai: '',
  nguoi_lien_he: '',
  ghi_chu: '',
  so_chi_tieu: '0'
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

  const [allViTri, setAllViTri] = useState<ViTriOption[]>([]);
  const [subjectTargets, setSubjectTargets] = useState<Record<number, number>>({});
  const [isImported, setIsImported] = useState(false);

  useEffect(() => {
    if (open) {
      if (kyId) {
        fetch(`/api/vitri?all=true&ky_tuyendung_id=${kyId}`)
          .then((res) => res.json())
          .then((resData) => {
            const list = resData && Array.isArray(resData.data) ? resData.data : [];
            setAllViTri(list);
          })
          .catch((err) => console.error('Lỗi khi tải danh sách vị trí:', err));
      }

      if (editing) {
        // Tải chi tiết đơn vị để lấy mappings
        fetch(`/api/donvi/${editing.id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && Array.isArray(data.mappings)) {
              const targets: Record<number, number> = {};
              data.mappings.forEach((m: { vitri_tuyendung_id: number; so_luong_phan_bo: number }) => {
                targets[m.vitri_tuyendung_id] = m.so_luong_phan_bo;
              });
              setSubjectTargets(targets);
              setIsImported(data.mappings.length > 0);
            }
          })
          .catch((err) => console.error('Lỗi khi tải chi tiết đơn vị:', err));

        setForm({
          ma_don_vi: editing.ma_don_vi,
          ten_don_vi: editing.ten_don_vi,
          cap_hoc: editing.cap_hoc,
          dia_chi: editing.dia_chi ?? '',
          so_dien_thoai: editing.so_dien_thoai ?? '',
          nguoi_lien_he: editing.nguoi_lien_he ?? '',
          ghi_chu: editing.ghi_chu ?? '',
          so_chi_tieu: String(editing.so_chi_tieu ?? 0)
        });
      } else {
        setForm(EMPTY_FORM);
        setSubjectTargets({});
      }
      setErrors({});
    }
  }, [open, editing, kyId]);

  const filteredViTri = allViTri.filter((vt) => vt.cap_hoc === form.cap_hoc);

  // Tự động tính tổng chỉ tiêu dựa trên các môn của cấp học đang chọn
  useEffect(() => {
    if (form.cap_hoc) {
      const filtered = allViTri.filter((vt) => vt.cap_hoc === form.cap_hoc);
      const total = filtered.reduce((sum, vt) => sum + (subjectTargets[vt.id] || 0), 0);
      setForm((f) => {
        if (f.so_chi_tieu !== String(total)) {
          return { ...f, so_chi_tieu: String(total) };
        }
        return f;
      });
    } else {
      setForm((f) => {
        if (f.so_chi_tieu !== '0') {
          return { ...f, so_chi_tieu: '0' };
        }
        return f;
      });
    }
  }, [subjectTargets, form.cap_hoc, allViTri]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function handleTargetChange(vitriId: number, val: string) {
    const num = Math.max(0, parseInt(val) || 0);
    setSubjectTargets((prev) => ({ ...prev, [vitriId]: num }));
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
      const mappings = filteredViTri
        .map((vt) => ({
          vitri_tuyendung_id: vt.id,
          so_luong_phan_bo: subjectTargets[vt.id] || 0
        }))
        .filter((m) => m.so_luong_phan_bo > 0);

      const payload = {
        ky_tuyendung_id: kyId,
        ma_don_vi: form.ma_don_vi.trim(),
        ten_don_vi: form.ten_don_vi.trim(),
        cap_hoc: form.cap_hoc as CapHocType,
        dia_chi: form.dia_chi.trim() || null,
        so_dien_thoai: form.so_dien_thoai.trim() || null,
        nguoi_lien_he: form.nguoi_lien_he.trim() || null,
        ghi_chu: form.ghi_chu.trim() || null,
        so_chi_tieu: Number(form.so_chi_tieu) || 0,
        mappings
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Số chỉ tiêu"
                type="number"
                disabled
                value={form.so_chi_tieu}
                onChange={(e) => update('so_chi_tieu', e.target.value)}
                error={errors.so_chi_tieu}
                placeholder="0"
                hint="Tự động tính từ chỉ tiêu môn"
              />
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

            {form.cap_hoc ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">Chỉ tiêu theo môn học</h4>
                  {isImported && (
                    <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                      Dữ liệu được nạp qua Import chỉ tiêu
                    </span>
                  )}
                </div>
                {filteredViTri.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Không có vị trí tuyển dụng nào được cấu hình cho cấp học này trong kỳ hiện tại.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-1">
                    {filteredViTri.map((vt) => (
                      <div
                        key={vt.id}
                        className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                      >
                        <label className="text-xs font-medium text-slate-700 truncate" title={vt.mon}>
                          {vt.mon}
                        </label>
                        <input
                          type="number"
                          min={0}
                          disabled={isImported}
                          className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                          value={subjectTargets[vt.id] ?? ''}
                          onChange={(e) => handleTargetChange(vt.id, e.target.value)}
                          placeholder="0"
                          inputMode="numeric"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-200 p-4 text-center">
                <p className="text-xs text-slate-500">Vui lòng chọn cấp học để cấu hình chỉ tiêu theo môn học</p>
              </div>
            )}

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
