'use client';
import { useEffect, useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2 } from 'lucide-react';
import { Button, Input, Select, Textarea, toast } from '@/shared/components';
import { CapHoc, CapHocLabel, HinhThucThi, HinhThucThiLabel } from '@/shared/constants/enums';
import type { CapHoc as CapHocT, HinhThucThi as HinhThucThiT } from '@/db/schema';

export interface ViTriView {
  id: number;
  ky_tuyendung_id: number;
  ma_vi_tri: string;
  mon: string;
  cap_hoc: CapHocT;
  loai_vi_tri: string;
  so_luong: number;
  hinh_thuc_thi: HinhThucThiT;
  diem_chuan: number | null;
  thu_tu_uu_tien_dong_diem: string | null;
  ghi_chu: string | null;
  sbd_prefix: string | null;
  soThiSinh?: number;
  donViCount?: number;
  kyTen?: string;
}

interface ViTriFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: ViTriView | null;
  kyId: number;
  onSaved: () => void;
}

interface FormState {
  ma_vi_tri: string;
  mon: string;
  cap_hoc: CapHocT;
  loai_vi_tri: string;
  so_luong: string;
  hinh_thuc_thi: HinhThucThiT;
  diem_chuan: string;
  sbd_prefix: string;
  ghi_chu: string;
  thu_tu_uu_tien_dong_diem: string[];
}

const DEFAULT_PRIORITY_ORDER = ['diem_thi_giang', 'doi_tuong_uu_tien', 'xep_loai_bang', 'ngay_nop_ho_so'];

const EMPTY_FORM: FormState = {
  ma_vi_tri: '',
  mon: '',
  cap_hoc: 'THPT',
  loai_vi_tri: 'GiaoVien',
  so_luong: '1',
  hinh_thuc_thi: 'Viet',
  diem_chuan: '',
  sbd_prefix: '',
  ghi_chu: '',
  thu_tu_uu_tien_dong_diem: DEFAULT_PRIORITY_ORDER
};

export function ViTriFormModal({ open, onClose, editing, kyId, onSaved }: ViTriFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (editing) {
        let priorities = DEFAULT_PRIORITY_ORDER;
        if (editing.thu_tu_uu_tien_dong_diem) {
          try {
            priorities = JSON.parse(editing.thu_tu_uu_tien_dong_diem);
          } catch (e) {
            priorities = DEFAULT_PRIORITY_ORDER;
          }
        }
        setForm({
          ma_vi_tri: editing.ma_vi_tri,
          mon: editing.mon,
          cap_hoc: editing.cap_hoc,
          loai_vi_tri: editing.loai_vi_tri || 'GiaoVien',
          so_luong: String(editing.so_luong ?? 1),
          hinh_thuc_thi: editing.hinh_thuc_thi,
          diem_chuan: editing.diem_chuan === null || editing.diem_chuan === undefined ? '' : String(editing.diem_chuan),
          sbd_prefix: editing.sbd_prefix ?? '',
          ghi_chu: editing.ghi_chu ?? '',
          thu_tu_uu_tien_dong_diem: priorities
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setFieldErrors({});
    }
  }, [open, editing]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => {
      if (!e[key]) return e;
      const { [key]: _, ...rest } = e;
      return rest;
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.ma_vi_tri.trim()) errors.ma_vi_tri = 'Mã vị trí không được để trống';
    if (!form.mon.trim()) errors.mon = 'Môn không được để trống';
    const soLuongNum = Number(form.so_luong);
    if (!Number.isFinite(soLuongNum) || soLuongNum <= 0) {
      errors.so_luong = 'Tổng số chỉ tiêu phải > 0';
    }
    if (form.diem_chuan.trim() !== '') {
      const d = Number(form.diem_chuan);
      if (!Number.isFinite(d) || d < 0 || d > 10) {
        errors.diem_chuan = 'Điểm chuẩn phải trong khoảng [0, 10]';
      }
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        ma_vi_tri: form.ma_vi_tri.trim(),
        mon: form.mon.trim(),
        cap_hoc: form.cap_hoc,
        loai_vi_tri: form.loai_vi_tri.trim() || 'GiaoVien',
        so_luong: soLuongNum,
        hinh_thuc_thi: form.hinh_thuc_thi,
        diem_chuan: form.diem_chuan.trim() === '' ? null : Number(form.diem_chuan),
        ghi_chu: form.ghi_chu.trim() || null,
        thu_tu_uu_tien_dong_diem: JSON.stringify(form.thu_tu_uu_tien_dong_diem),
        sbd_prefix: form.sbd_prefix.trim() || null
      };
      if (!editing) {
        payload.ky_tuyendung_id = kyId;
      }

      const url = editing ? `/api/vitri/${editing.id}` : '/api/vitri';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      toast.success(editing ? 'Đã cập nhật vị trí' : 'Đã tạo vị trí mới');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi lưu vị trí');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white shadow-xl focus:outline-none"
          aria-describedby={undefined}
        >
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <Dialog.Title className="text-base font-semibold text-slate-900">
                {editing ? 'Sửa vị trí tuyển dụng' : 'Thêm vị trí tuyển dụng'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-3 px-5 py-4 max-h-[70vh] overflow-y-auto">
              <Input
                label="Mã vị trí"
                required
                value={form.ma_vi_tri}
                onChange={(e) => update('ma_vi_tri', e.target.value)}
                error={fieldErrors.ma_vi_tri}
                placeholder="VD: VT-TOAN-THPT-01"
                disabled={submitting}
              />
              <Input
                label="Môn"
                required
                value={form.mon}
                onChange={(e) => update('mon', e.target.value)}
                error={fieldErrors.mon}
                placeholder="VD: Toán, Ngữ văn, Vật lý..."
                disabled={submitting}
              />
              <Input
                label="Mã prefix SBD (2 chữ số)"
                value={form.sbd_prefix}
                onChange={(e) => update('sbd_prefix', e.target.value.replace(/\D/g, '').slice(0, 2))}
                error={fieldErrors.sbd_prefix}
                placeholder="VD: 05, 08"
                hint="Prefix đầu số báo danh, VD: 05 → 05.001, 05.002..."
                maxLength={2}
                disabled={submitting}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Cấp học"
                  required
                  value={form.cap_hoc}
                  onChange={(e) => update('cap_hoc', e.target.value as CapHocT)}
                  disabled={submitting}
                >
                  {Object.values(CapHoc).map((c) => (
                    <option key={c} value={c}>
                      {CapHocLabel[c] ?? c}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Loại vị trí"
                  value={form.loai_vi_tri}
                  onChange={(e) => update('loai_vi_tri', e.target.value)}
                  placeholder="GiaoVien"
                  disabled={submitting}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Tổng số chỉ tiêu"
                  type="number"
                  min={1}
                  required
                  value={form.so_luong}
                  onChange={(e) => update('so_luong', e.target.value)}
                  error={fieldErrors.so_luong}
                  disabled={submitting}
                />
                <Select
                  label="Hình thức thi"
                  required
                  value={form.hinh_thuc_thi}
                  onChange={(e) => update('hinh_thuc_thi', e.target.value as HinhThucThiT)}
                  disabled={submitting}
                >
                  {Object.values(HinhThucThi).map((h) => (
                    <option key={h} value={h}>
                      {HinhThucThiLabel[h] ?? h}
                    </option>
                  ))}
                </Select>
              </div>
              <Input
                label="Điểm chuẩn"
                type="number"
                min={0}
                max={10}
                step="0.1"
                value={form.diem_chuan}
                onChange={(e) => update('diem_chuan', e.target.value)}
                error={fieldErrors.diem_chuan}
                hint="Để trống nếu chưa xác định (0-10)"
                disabled={submitting}
              />
              <div className="space-y-1.5">
                <span className="block text-sm font-medium text-slate-700">
                  Thứ tự ưu tiên xử lý đồng điểm (từ trên xuống dưới)
                </span>
                <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
                  {form.thu_tu_uu_tien_dong_diem.map((item, index) => {
                    let label = '';
                    if (item === 'diem_thi_giang') label = '1. Điểm thi giảng';
                    else if (item === 'doi_tuong_uu_tien') label = '2. Đối tượng ưu tiên';
                    else if (item === 'xep_loai_bang') label = '3. Xếp loại bằng';
                    else if (item === 'ngay_nop_ho_so') label = '4. Thời gian nộp hồ sơ';

                    return (
                      <div key={item} className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                        <span className="text-xs font-semibold text-slate-700">{label}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={index === 0 || submitting}
                            onClick={() => {
                              const next = [...form.thu_tu_uu_tien_dong_diem];
                              const temp = next[index];
                              next[index] = next[index - 1];
                              next[index - 1] = temp;
                              update('thu_tu_uu_tien_dong_diem', next);
                            }}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 text-xs font-bold font-mono"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={index === form.thu_tu_uu_tien_dong_diem.length - 1 || submitting}
                            onClick={() => {
                              const next = [...form.thu_tu_uu_tien_dong_diem];
                              const temp = next[index];
                              next[index] = next[index + 1];
                              next[index + 1] = temp;
                              update('thu_tu_uu_tien_dong_diem', next);
                            }}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 text-xs font-bold font-mono"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Textarea
                label="Ghi chú"
                value={form.ghi_chu}
                onChange={(e) => update('ghi_chu', e.target.value)}
                placeholder="Ghi chú thêm (nếu có)"
                rows={2}
                disabled={submitting}
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" loading={submitting} disabled={submitting}>
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {editing ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
