'use client';
import { useEffect, useState } from 'react';
import { Select, Input, DateInput, Spinner, Badge } from '@/shared/components';
import { TrangThaiHoSoLabel } from '@/shared/constants/enums';
import { formatDate, buildViTriLabel } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { FormValues } from '../form-types';

interface ViTri {
  id: number;
  ma_vi_tri: string;
  mon: string;
  cap_hoc: string;
  loai_vi_tri?: string;
}
interface DonVi {
  id: number;
  ma_don_vi: string;
  ten_don_vi: string;
  cap_hoc: string;
}

interface Props {
  form: FormValues;
  onChange: (patch: Partial<FormValues>) => void;
  editing: boolean;
  trangThai: string;
  ngayNopHoSo: string;
  maHoSo: string;
}

function statusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' {
  switch (status) {
    case 'HopLe':              return 'success';
    case 'ChoRaSoat':          return 'neutral';
    case 'CanBoSung':          return 'warning';
    case 'KhongDuDieuKien':    return 'danger';
    case 'DaChinhSua':         return 'info';
    default:                   return 'neutral';
  }
}

export function ThongTinDangKy({ form, onChange, editing, trangThai, ngayNopHoSo, maHoSo }: Props) {
  const [viTris, setViTris] = useState<ViTri[]>([]);
  const [donVis, setDonVis] = useState<DonVi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const [vtRes, dvRes] = await Promise.all([
          fetch('/api/vitri', { cache: 'no-store' }),
          fetch('/api/donvi', { cache: 'no-store' })
        ]);
        const vtJson = vtRes.ok ? await vtRes.json() : { data: [] };
        const dvJson = dvRes.ok ? await dvRes.json() : { data: [] };
        if (!alive) return;
        const vtData: ViTri[] = Array.isArray(vtJson) ? vtJson : (vtJson.data ?? []);
        const dvData: DonVi[] = Array.isArray(dvJson) ? dvJson : (dvJson.data ?? []);
        setViTris(vtData);
        setDonVis(dvData);
      } catch {
        if (!alive) return;
        setViTris([]);
        setDonVis([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  return (
    <div className="space-y-4">
      {maHoSo && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Mã hồ sơ:</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700">
            {maHoSo}
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner size={14} />
          Đang tải danh sách vị trí & đơn vị...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Vị trí đăng ký (NV1)"
            value={form.vi_tri_dang_ky_id?.toString() ?? ''}
            disabled={!editing}
            required
            onChange={e => onChange({ vi_tri_dang_ky_id: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">-- Chọn vị trí --</option>
            {viTris.map(v => (
              <option key={v.id} value={v.id}>
                {buildViTriLabel({
                  loai_vi_tri: v.loai_vi_tri ?? 'GiaoVien',
                  mon: v.mon,
                  cap_hoc: v.cap_hoc
                })}
              </option>
            ))}
          </Select>
          <Select
            label="Đơn vị dự tuyển (NV1)"
            value={form.don_vi_du_tuyen_id?.toString() ?? ''}
            disabled={!editing}
            onChange={e => onChange({ don_vi_du_tuyen_id: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">-- Chọn đơn vị --</option>
            {donVis.map(d => (
              <option key={d.id} value={d.id}>
                {d.ten_don_vi}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Nguyện vọng 2 */}
      <div className="rounded-md border border-blue-200 bg-blue-50/40 p-3">
        <label
          className={cn(
            'flex items-center gap-2 text-sm font-medium text-slate-700',
            !editing && 'cursor-not-allowed opacity-60'
          )}
        >
          <input
            type="checkbox"
            checked={form.co_dang_ky_nv2}
            disabled={!editing}
            onChange={e => onChange({ co_dang_ky_nv2: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Có đăng ký nguyện vọng 2
        </label>
        {form.co_dang_ky_nv2 && !loading && (
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Vị trí NV2"
              value={form.vi_tri_dang_ky_id_2?.toString() ?? ''}
              disabled={!editing}
              onChange={e => onChange({ vi_tri_dang_ky_id_2: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">-- Chọn vị trí --</option>
              {viTris.map(v => (
                <option key={v.id} value={v.id}>
                  {buildViTriLabel({
                    loai_vi_tri: v.loai_vi_tri ?? 'GiaoVien',
                    mon: v.mon,
                    cap_hoc: v.cap_hoc
                  })}
                </option>
              ))}
            </Select>
            <Select
              label="Đơn vị NV2"
              value={form.don_vi_du_tuyen_id_2?.toString() ?? ''}
              disabled={!editing}
              onChange={e => onChange({ don_vi_du_tuyen_id_2: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">-- Chọn đơn vị --</option>
              {donVis.map(d => (
                <option key={d.id} value={d.id}>
                  {d.ten_don_vi}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DateInput
          label="Ngày nộp hồ sơ"
          value={ngayNopHoSo}
          disabled
          onChange={() => undefined}
        />
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Trạng thái hồ sơ</span>
          <div className="flex h-10 items-center gap-2">
            <Badge variant={statusBadgeVariant(trangThai)}>
              {TrangThaiHoSoLabel[trangThai as keyof typeof TrangThaiHoSoLabel] ?? trangThai}
            </Badge>
            <span className="text-xs italic text-slate-500">
              (Thay đổi trong mục "Trạng thái & Rà soát")
            </span>
          </div>
          {ngayNopHoSo && (
            <p className="mt-1 text-xs text-slate-500">
              Nộp ngày: {formatDate(ngayNopHoSo)}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3">
        <h4 className="mb-2 text-sm font-semibold text-slate-700">Ngoại ngữ & Cam đoan</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Đăng ký dự thi ngoại ngữ"
            value={form.ngoai_ngu}
            disabled={!editing}
            placeholder="Tiếng Anh / Tiếng Pháp..."
            onChange={e => onChange({ ngoai_ngu: e.target.value })}
          />
          <Input
            label="Ngoại ngữ khác (theo yêu cầu vị trí)"
            value={form.ngoai_ngu_khac}
            disabled={!editing}
            onChange={e => onChange({ ngoai_ngu_khac: e.target.value })}
          />
          <div className="md:col-span-2">
            <Input
              label="Miễn thi ngoại ngữ do"
              value={form.mien_thi_nn}
              disabled={!editing}
              onChange={e => onChange({ mien_thi_nn: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Cam đoan thông tin"
              value={form.cam_doan_thong_tin}
              disabled={!editing}
              placeholder="Xác nhận / Đã cam kết..."
              onChange={e => onChange({ cam_doan_thong_tin: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
