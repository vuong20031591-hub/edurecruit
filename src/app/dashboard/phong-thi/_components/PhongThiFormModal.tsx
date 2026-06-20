'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button, toast } from '@/shared/components';
import type { PhongThiView } from '@/modules/phongthi/types';

interface ViTriOption { id: number; mon: string; cap_hoc: string; }

interface Props {
  kyId: number;
  item: PhongThiView | null;  // null = create
  onClose: () => void;
  onSaved: () => void;
}

export function PhongThiFormModal({ kyId, item, onClose, onSaved }: Props) {
  const isEdit = !!item;
  const [viTriList, setViTriList] = useState<ViTriOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ma_phong: item?.ma_phong ?? '',
    ten_phong: item?.ten_phong ?? '',
    vi_tri_dang_ky_id: item?.vi_tri_dang_ky_id ? String(item.vi_tri_dang_ky_id) : '',
    suc_chua: item?.suc_chua ? String(item.suc_chua) : '30',
    ngay_thi: item?.ngay_thi ?? '',
    gio_thi: item?.gio_thi ?? '08:00',
    dia_diem: item?.dia_diem ?? '',
    ghi_chu: item?.ghi_chu ?? '',
  });

  useEffect(() => {
    fetch(`/api/vitri?all=true&ky_tuyendung_id=${kyId}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => setViTriList(Array.isArray(j.data) ? j.data : []))
      .catch(() => {});
  }, [kyId]);

  function patch(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ma_phong.trim()) { toast.warning('Vui lòng nhập mã phòng'); return; }
    if (!form.vi_tri_dang_ky_id) { toast.warning('Vui lòng chọn vị trí'); return; }
    if (!form.ngay_thi) { toast.warning('Vui lòng chọn ngày thi'); return; }

    setSaving(true);
    try {
      const payload = {
        ky_tuyendung_id: kyId,
        vi_tri_dang_ky_id: Number(form.vi_tri_dang_ky_id),
        ma_phong: form.ma_phong.trim(),
        ten_phong: form.ten_phong.trim() || null,
        dia_diem: form.dia_diem.trim() || null,
        suc_chua: Number(form.suc_chua) || 30,
        ngay_thi: form.ngay_thi,
        gio_thi: form.gio_thi,
        ghi_chu: form.ghi_chu.trim() || null,
      };
      const url = isEdit ? `/api/phongthi/${item!.id}` : '/api/phongthi';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      toast.success(isEdit ? 'Đã cập nhật phòng thi' : 'Đã tạo phòng thi');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi lưu phòng thi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            {isEdit ? 'Sửa phòng thi' : 'Thêm phòng thi'}
          </h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Mã phòng */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Mã phòng <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.ma_phong}
                onChange={e => patch('ma_phong', e.target.value)}
                placeholder="VD: P001"
                className="block w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            {/* Tên phòng */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Tên phòng</label>
              <input
                type="text"
                value={form.ten_phong}
                onChange={e => patch('ten_phong', e.target.value)}
                placeholder="VD: Phòng họp A"
                className="block w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          {/* Vị trí tuyển dụng */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Vị trí tuyển dụng <span className="text-red-500">*</span></label>
            <select
              value={form.vi_tri_dang_ky_id}
              onChange={e => patch('vi_tri_dang_ky_id', e.target.value)}
              className="block w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">-- Chọn vị trí --</option>
              {viTriList.map(v => (
                <option key={v.id} value={v.id}>{v.mon} - {v.cap_hoc}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Ngày thi */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Ngày thi <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={form.ngay_thi}
                onChange={e => patch('ngay_thi', e.target.value)}
                className="block w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            {/* Giờ thi */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Giờ thi</label>
              <input
                type="time"
                value={form.gio_thi}
                onChange={e => patch('gio_thi', e.target.value)}
                className="block w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Sức chứa */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Sức chứa (chỗ)</label>
              <input
                type="number"
                min={1}
                max={500}
                value={form.suc_chua}
                onChange={e => patch('suc_chua', e.target.value)}
                className="block w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            {/* Địa điểm */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Địa điểm</label>
              <input
                type="text"
                value={form.dia_diem}
                onChange={e => patch('dia_diem', e.target.value)}
                placeholder="VD: Trụ sở Sở GDĐT"
                className="block w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Ghi chú</label>
            <textarea
              value={form.ghi_chu}
              onChange={e => patch('ghi_chu', e.target.value)}
              rows={2}
              className="block w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>Hủy</Button>
            <Button type="submit" variant="primary" size="sm" loading={saving}>
              {isEdit ? 'Lưu thay đổi' : 'Tạo phòng thi'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
