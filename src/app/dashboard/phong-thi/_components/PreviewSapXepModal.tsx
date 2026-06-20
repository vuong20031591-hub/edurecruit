'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ListChecks, X } from 'lucide-react';
import { Button, Modal, toast } from '@/shared/components';

interface PreviewSapXep {
  eligible: number;
  rooms: number;
  totalCapacity: number;
  warnings: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  kyId: number;
  onConfirm: () => Promise<void>;
}

export function PreviewSapXepModal({ open, onClose, kyId, onConfirm }: Props) {
  const [preview, setPreview] = useState<PreviewSapXep | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    fetch(`/api/phongthi/preview-sapxep?ky_tuyendung_id=${kyId}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (alive) setPreview(j); })
      .catch(() => { if (alive) toast.error('Không tải được preview'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, kyId]);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      // parent already toasts
    } finally {
      setBusy(false);
    }
  }

  const canRun = !!preview && preview.eligible > 0 && preview.rooms > 0;
  const overCapacity = !!preview && preview.eligible > preview.totalCapacity;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Xếp phòng tự động"
      description="Hệ thống sẽ gán SBD và phân bổ thí sinh vào phòng thi theo vị trí, ưu tiên cùng đơn vị."
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Hủy</Button>
          <Button variant="primary" size="sm" onClick={handleConfirm} loading={busy} disabled={!canRun}>
            <ListChecks size={14} className="mr-1" />Xác nhận xếp phòng
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="py-6 text-center text-sm text-slate-500">Đang kiểm tra điều kiện…</div>
      ) : !preview ? (
        <div className="py-6 text-center text-sm text-red-600">Không tải được preview</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-center">
              <div className="text-xs text-slate-500">Đủ điều kiện</div>
              <div className="mt-1 text-2xl font-bold text-slate-800">{preview.eligible}</div>
              <div className="text-[10px] text-slate-400">TS Hợp lệ đã khóa HS, có CCCD</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-center">
              <div className="text-xs text-slate-500">Số phòng</div>
              <div className="mt-1 text-2xl font-bold text-slate-800">{preview.rooms}</div>
              <div className="text-[10px] text-slate-400">trong kỳ</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-center">
              <div className="text-xs text-slate-500">Tổng sức chứa</div>
              <div className="mt-1 text-2xl font-bold text-slate-800">{preview.totalCapacity}</div>
              <div className="text-[10px] text-slate-400">chỗ ngồi</div>
            </div>
          </div>

          {preview.warnings.length === 0 ? (
            <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>Đủ điều kiện xếp phòng. SBD sẽ được gán lại cho toàn bộ thí sinh hợp lệ trong kỳ.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {preview.warnings.map((w, i) => (
                <div key={i} className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                  overCapacity && w.includes('vượt quá')
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}>
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
              {overCapacity && (
                <p className="text-xs text-amber-700 italic px-1">
                  Vẫn cho phép tiếp tục — phòng cuối sẽ bị quá tải theo PRD §Bước 4.
                </p>
              )}
            </div>
          )}

          <details className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            <summary className="cursor-pointer font-medium">Thuật toán áp dụng</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Reset toàn bộ SBD + phân phòng cũ của TS Hợp lệ trong kỳ (xếp lại an toàn)</li>
              <li>Sắp xếp theo vị trí → đơn vị → tên → họ (PRD Bước 4)</li>
              <li>Gán SBD tăng dần trong cùng vị trí: SBD-0001, SBD-0002, …</li>
              <li>Rải vào phòng cùng vị trí, ưu tiên cùng đơn vị, round-robin khi bằng nhau</li>
            </ul>
          </details>
        </div>
      )}
    </Modal>
  );
}
