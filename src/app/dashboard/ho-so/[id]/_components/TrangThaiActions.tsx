'use client';
import { useState } from 'react';
import { Badge, Select, Textarea, Button, toast } from '@/shared/components';
import { TrangThaiHoSoLabel } from '@/shared/constants/enums';
import { cn } from '@/shared/lib/cn';
import type { TrangThaiHoSo } from '@/db/schema';

interface Props {
  thisinhId: number;
  trangThaiHienTai: TrangThaiHoSo;
  hoTen: string;
  canRasoat: boolean;
  canLock: boolean;
  isLocked: boolean;
  onUpdated: (newStatus: TrangThaiHoSo) => void;
  onLocked?: () => void;
}

function statusBadgeVariant(status: TrangThaiHoSo): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'HopLe':           return 'success';
    case 'ChoRaSoat':       return 'neutral';
    case 'CanBoSung':       return 'warning';
    case 'KhongDuDieuKien': return 'danger';
    case 'DaChinhSua':      return 'info';
  }
}

const TRANSITIONS: Record<TrangThaiHoSo, TrangThaiHoSo[]> = {
  ChoRaSoat:       ['HopLe', 'CanBoSung', 'KhongDuDieuKien'],
  HopLe:           ['CanBoSung', 'DaChinhSua'],
  CanBoSung:       ['HopLe', 'KhongDuDieuKien', 'ChoRaSoat'],
  KhongDuDieuKien: ['ChoRaSoat'],
  DaChinhSua:      ['HopLe', 'CanBoSung', 'ChoRaSoat']
};

export function TrangThaiActions({ thisinhId, trangThaiHienTai, hoTen, canRasoat, canLock, isLocked, onUpdated, onLocked }: Props) {
  const [newStatus, setNewStatus] = useState<TrangThaiHoSo | ''>('');
  const [lyDo, setLyDo] = useState('');
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);

  async function handleUpdate() {
    if (!newStatus) {
      toast.warning('Vui lòng chọn trạng thái mới');
      return;
    }
    if (newStatus === trangThaiHienTai) {
      toast.info('Trạng thái không thay đổi');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/hosso/${thisinhId}/trang-thai`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trang_thai_ho_so: newStatus, ly_do: lyDo || null })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      toast.success('Đã cập nhật trạng thái hồ sơ');
      onUpdated(newStatus);
      setNewStatus('');
      setLyDo('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái');
    } finally {
      setSaving(false);
    }
  }

  async function handleLock() {
    if (!window.confirm(`Bạn có chắc chắn muốn duyệt và khóa hồ sơ của thí sinh "${hoTen}"?\nSau khi duyệt, thông tin hồ sơ sẽ không thể chỉnh sửa.`)) {
      return;
    }
    setLocking(true);
    try {
      const res = await fetch(`/api/hosso/${thisinhId}/khoa`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      toast.success('Đã duyệt hồ sơ thành công');
      onLocked?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi duyệt hồ sơ');
    } finally {
      setLocking(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">Trạng thái hiện tại của <b>{hoTen || '—'}</b>:</span>
          <Badge variant={statusBadgeVariant(trangThaiHienTai)}>
            {isLocked && '🔒 '}{TrangThaiHoSoLabel[trangThaiHienTai]}
          </Badge>
        </div>
        {trangThaiHienTai === 'HopLe' && !isLocked && canLock && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleLock}
            loading={locking}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Duyệt hồ sơ
          </Button>
        )}
      </div>

      {isLocked ? (
        <p className="text-sm text-slate-500 italic">
          Hồ sơ đã được duyệt và khóa. Không thể thực hiện thêm thao tác thay đổi trạng thái.
        </p>
      ) : canRasoat ? (
        <div className="space-y-3">
          <Select
            label="Chuyển sang trạng thái"
            value={newStatus}
            onChange={e => setNewStatus(e.target.value as TrangThaiHoSo | '')}
          >
            <option value="">-- Chọn trạng thái mới --</option>
            {TRANSITIONS[trangThaiHienTai].map(s => (
              <option key={s} value={s}>
                {TrangThaiHoSoLabel[s]}
              </option>
            ))}
          </Select>
          <Textarea
            label="Lý do / Ghi chú"
            value={lyDo}
            onChange={e => setLyDo(e.target.value)}
            rows={3}
            placeholder="Nhập lý do chuyển trạng thái (tùy chọn)..."
          />
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleUpdate}
              loading={saving}
              disabled={!newStatus}
            >
              Cập nhật trạng thái
            </Button>
          </div>
        </div>
      ) : (
        <p className={cn('text-sm italic text-slate-500')}>
          Bạn không có quyền thay đổi trạng thái hồ sơ. Liên hệ Tổ Nhập Hồ Sơ hoặc Admin.
        </p>
      )}
    </div>
  );
}
