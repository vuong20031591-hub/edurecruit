'use client';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface KyOption {
  id: number;
  ten_ky: string;
  nam: number;
  trang_thai: string;
}

interface Props {
  currentKyId: number | null;
  selectedKyId: number | null;
  onChange: (id: number) => void;
}

export function KySelector({ currentKyId, selectedKyId, onChange }: Props) {
  const [options, setOptions] = useState<KyOption[]>([]);

  useEffect(() => {
    fetch('/api/ky-tuyendung')
      .then(r => r.json())
      .then(j => setOptions(j.data ?? []))
      .catch(() => {});
  }, []);

  if (options.length <= 1) return null;

  return (
    <div className="relative inline-flex items-center">
      <select
        value={selectedKyId ?? currentKyId ?? ''}
        onChange={e => onChange(Number(e.target.value))}
        className="appearance-none rounded-md border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-navy-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {options.map(k => (
          <option key={k.id} value={k.id}>
            {k.nam - 1}–{k.nam}{k.id === currentKyId ? ' (Hiện tại)' : ''}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2 text-slate-400" />
    </div>
  );
}
