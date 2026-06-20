'use client';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/shared/components';
import type { PhongThiView } from '@/modules/phongthi/types';

interface Props {
  item: PhongThiView;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({ item, onClose, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Xác nhận xóa</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm text-slate-700">
                Bạn có chắc muốn xóa phòng <span className="font-semibold">{item.ma_phong}</span>?
              </p>
              {item.so_luong_da_xep > 0 && (
                <p className="mt-1 text-xs text-red-600">
                  Phòng này đang có {item.so_luong_da_xep} thí sinh. Không thể xóa.
                </p>
              )}
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Hủy</Button>
            <Button
              variant="danger"
              size="sm"
              onClick={onConfirm}
              disabled={item.so_luong_da_xep > 0}
            >
              Xóa phòng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
