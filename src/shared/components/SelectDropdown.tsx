'use client';
/**
 * SelectDropdown — custom select không dùng <select> native
 * Tránh browser blue outline khi mở dropdown (Chrome/Edge Windows)
 * Style đồng nhất với Input.tsx: border-slate-200, focus:border-brand-500
 */
import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/cn';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectDropdownProps {
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export function SelectDropdown({
  value,
  onChange,
  options,
  placeholder = 'Chọn...',
  className,
  disabled,
  'aria-label': ariaLabel,
}: SelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  const selected = options.find(o => String(o.value) === String(value));
  const displayLabel = selected?.label ?? placeholder;

  // Đóng khi click ngoài
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Đóng khi nhấn Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-white px-3 text-sm',
          'transition-colors',
          open
            ? 'border-brand-500 ring-2 ring-brand-500/20'
            : 'border-slate-200 hover:border-slate-300',
          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
          selected ? 'text-slate-700' : 'text-slate-400',
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          size={14}
          className={cn(
            'shrink-0 text-slate-400 transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby={id}
          className={cn(
            'absolute left-0 top-full z-50 mt-1 w-full overflow-auto rounded-md border border-slate-200',
            'bg-white py-1 shadow-md',
            'max-h-60',
          )}
        >
          {options.map(opt => {
            const isSelected = String(opt.value) === String(value);
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => { onChange(String(opt.value)); setOpen(false); }}
                className={cn(
                  'flex cursor-pointer items-center justify-between px-3 py-2 text-sm',
                  isSelected
                    ? 'bg-brand-50 font-medium text-brand-700'
                    : 'text-slate-700 hover:bg-slate-50',
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={13} className="shrink-0 text-brand-600" />}
              </li>
            );
          })}
          {options.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400">Không có dữ liệu</li>
          )}
        </ul>
      )}
    </div>
  );
}
